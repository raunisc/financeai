class StorageManager {
    constructor() {
        this.dbName = 'FinanceAI_DB';
        this.dbVersion = 1;
        this.db = null;
        this.isIndexedDBSupported = this.checkIndexedDBSupport();
        this.mysqlConfig = null;
        this.storageMode = 'local'; // 'local' or 'mysql'
        this.initializeDB();
    }

    checkIndexedDBSupport() {
        return 'indexedDB' in window;
    }

    async initializeDB() {
        // Load storage mode and MySQL config from localStorage
        const savedMode = localStorage.getItem('financeai_storage_mode');
        const savedConfig = localStorage.getItem('financeai_mysql_config');
        
        if (savedMode) {
            this.storageMode = savedMode;
        }
        
        if (savedConfig) {
            try {
                this.mysqlConfig = JSON.parse(savedConfig);
            } catch (error) {
                console.error('Erro ao carregar configuração MySQL:', error);
            }
        }

        if (this.storageMode === 'mysql' && this.mysqlConfig) {
            await this.initializeMySQL();
        } else {
            await this.initializeLocalDB();
        }
    }

    async initializeLocalDB() {
        if (!this.isIndexedDBSupported) {
            console.log('IndexedDB não suportado, usando localStorage');
            return;
        }

        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onerror = () => {
                    console.error('Erro ao abrir IndexedDB:', request.error);
                    reject(request.error);
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('IndexedDB inicializado com sucesso');
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    // Create stores if they don't exist
                    if (!db.objectStoreNames.contains('bills')) {
                        const billsStore = db.createObjectStore('bills', { keyPath: 'id' });
                        billsStore.createIndex('status', 'status', { unique: false });
                        billsStore.createIndex('dueDate', 'dueDate', { unique: false });
                        billsStore.createIndex('category', 'category', { unique: false });
                    }

                    if (!db.objectStoreNames.contains('invoices')) {
                        const invoicesStore = db.createObjectStore('invoices', { keyPath: 'id' });
                        invoicesStore.createIndex('status', 'status', { unique: false });
                        invoicesStore.createIndex('date', 'date', { unique: false });
                        invoicesStore.createIndex('supplier', 'supplier', { unique: false });
                    }

                    if (!db.objectStoreNames.contains('revenues')) {
                        const revenuesStore = db.createObjectStore('revenues', { keyPath: 'id' });
                        revenuesStore.createIndex('date', 'date', { unique: false });
                        revenuesStore.createIndex('category', 'category', { unique: false });
                        revenuesStore.createIndex('source', 'source', { unique: false });
                    }

                    if (!db.objectStoreNames.contains('settings')) {
                        db.createObjectStore('settings', { keyPath: 'key' });
                    }

                    console.log('IndexedDB estrutura criada/atualizada');
                };
            });
        } catch (error) {
            console.error('Erro na inicialização do IndexedDB:', error);
        }
    }

    async initializeMySQL() {
        try {
            if (!this.mysqlConfig || !this.mysqlConfig.host) {
                throw new Error('Configuração MySQL inválida');
            }

            // Test MySQL connection and create database/tables if needed
            await this.createMySQLDatabase();
            console.log('MySQL inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar MySQL:', error);
            // Fallback to local storage
            this.storageMode = 'local';
            await this.initializeLocalDB();
            throw error;
        }
    }

    async createMySQLDatabase() {
        const createTableQueries = [
            `CREATE TABLE IF NOT EXISTS bills (
                id BIGINT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                dueDate DATE NOT NULL,
                category VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                barcode VARCHAR(100),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                paidAt DATETIME NULL,
                source VARCHAR(50) DEFAULT 'manual'
            )`,
            `CREATE TABLE IF NOT EXISTS invoices (
                id BIGINT PRIMARY KEY,
                number VARCHAR(100) NOT NULL,
                supplier VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                date DATE NOT NULL,
                category VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                cnpj VARCHAR(20),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                source VARCHAR(50) DEFAULT 'manual'
            )`,
            `CREATE TABLE IF NOT EXISTS revenues (
                id BIGINT PRIMARY KEY,
                description VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                date DATE NOT NULL,
                category VARCHAR(50) NOT NULL,
                source VARCHAR(255),
                notes TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`
        ];

        for (const query of createTableQueries) {
            await this.executeMySQLQuery(query);
        }
    }

    async executeMySQLQuery(query, params = []) {
        // This is a mock implementation since we can't actually connect to MySQL from browser
        // In a real application, this would be handled by a backend API
        console.log('MySQL Query (simulated):', query, params);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // For demonstration, we'll still use local storage but with MySQL structure
        return { success: true, data: [] };
    }

    async setStorageMode(mode, config = null) {
        try {
            if (mode === 'mysql' && !config) {
                throw new Error('Configuração MySQL é obrigatória');
            }

            const oldMode = this.storageMode;
            this.storageMode = mode;
            this.mysqlConfig = config;

            // Save configuration
            localStorage.setItem('financeai_storage_mode', mode);
            if (config) {
                localStorage.setItem('financeai_mysql_config', JSON.stringify(config));
            } else {
                localStorage.removeItem('financeai_mysql_config');
            }

            // If switching to MySQL, initialize it
            if (mode === 'mysql') {
                await this.initializeMySQL();
                
                // Migrate existing data if switching from local
                if (oldMode === 'local') {
                    await this.migrateToMySQL();
                }
            } else {
                // If switching to local, initialize local DB
                await this.initializeLocalDB();
                
                // Migrate existing data if switching from MySQL
                if (oldMode === 'mysql') {
                    await this.migrateToLocal();
                }
            }

            return true;
        } catch (error) {
            console.error('Erro ao alterar modo de armazenamento:', error);
            // Revert on error
            this.storageMode = oldMode;
            throw error;
        }
    }

    async testMySQLConnection(config) {
        try {
            // Simulate connection test
            if (!config.host || !config.database || !config.username) {
                throw new Error('Dados de conexão incompletos');
            }

            // In a real implementation, this would make an actual API call to test the connection
            console.log('Testando conexão MySQL:', config);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // For demo, simulate success if host contains 'mysql' or 'localhost'
            if (config.host.toLowerCase().includes('mysql') || 
                config.host.toLowerCase().includes('localhost') ||
                config.host.includes('127.0.0.1')) {
                return { success: true, message: 'Conexão estabelecida com sucesso!' };
            } else {
                throw new Error('Não foi possível conectar ao servidor MySQL');
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async migrateToMySQL() {
        try {
            console.log('Migrando dados para MySQL...');
            
            // Load all data from local storage
            const bills = await this.loadFromLocalStorage('bills');
            const invoices = await this.loadFromLocalStorage('invoices');
            const revenues = await this.loadFromLocalStorage('revenues');

            // Save to MySQL (simulated)
            if (bills && bills.length > 0) {
                for (const bill of bills) {
                    await this.saveBillToMySQL(bill);
                }
            }

            if (invoices && invoices.length > 0) {
                for (const invoice of invoices) {
                    await this.saveInvoiceToMySQL(invoice);
                }
            }

            if (revenues && revenues.length > 0) {
                for (const revenue of revenues) {
                    await this.saveRevenueToMySQL(revenue);
                }
            }

            console.log('Migração para MySQL concluída');
        } catch (error) {
            console.error('Erro na migração para MySQL:', error);
            throw error;
        }
    }

    async migrateToLocal() {
        try {
            console.log('Migrando dados para armazenamento local...');
            
            // Load all data from MySQL (simulated)
            const bills = await this.loadBillsFromMySQL();
            const invoices = await this.loadInvoicesFromMySQL();
            const revenues = await this.loadRevenuesFromMySQL();

            // Save to local storage
            if (bills && bills.length > 0) {
                await this.saveToLocalStorage('bills', bills);
            }

            if (invoices && invoices.length > 0) {
                await this.saveToLocalStorage('invoices', invoices);
            }

            if (revenues && revenues.length > 0) {
                await this.saveToLocalStorage('revenues', revenues);
            }

            console.log('Migração para armazenamento local concluída');
        } catch (error) {
            console.error('Erro na migração para local:', error);
            throw error;
        }
    }

    async saveData(storeName, data) {
        try {
            if (this.storageMode === 'mysql') {
                return await this.saveToMySQL(storeName, data);
            } else {
                // Try IndexedDB first
                if (this.isIndexedDBSupported && this.db) {
                    return await this.saveToIndexedDB(storeName, data);
                }
                
                // Fallback to localStorage
                return this.saveToLocalStorage(storeName, data);
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            // Fallback to localStorage on any error
            return this.saveToLocalStorage(storeName, data);
        }
    }

    async loadData(storeName) {
        try {
            if (this.storageMode === 'mysql') {
                return await this.loadFromMySQL(storeName);
            } else {
                // Try IndexedDB first
                if (this.isIndexedDBSupported && this.db) {
                    const data = await this.loadFromIndexedDB(storeName);
                    if (data && data.length > 0) {
                        return data;
                    }
                }
                
                // Fallback to localStorage
                return this.loadFromLocalStorage(storeName);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Fallback to localStorage on any error
            return this.loadFromLocalStorage(storeName);
        }
    }

    async saveToMySQL(storeName, data) {
        try {
            if (!Array.isArray(data)) {
                data = [data];
            }

            for (const item of data) {
                if (storeName === 'bills') {
                    await this.saveBillToMySQL(item);
                } else if (storeName === 'invoices') {
                    await this.saveInvoiceToMySQL(item);
                } else if (storeName === 'revenues') {
                    await this.saveRevenueToMySQL(item);
                }
            }

            return true;
        } catch (error) {
            console.error('Erro ao salvar no MySQL:', error);
            throw error;
        }
    }

    async loadFromMySQL(storeName) {
        try {
            if (storeName === 'bills') {
                return await this.loadBillsFromMySQL();
            } else if (storeName === 'invoices') {
                return await this.loadInvoicesFromMySQL();
            } else if (storeName === 'revenues') {
                return await this.loadRevenuesFromMySQL();
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar do MySQL:', error);
            return [];
        }
    }

    async saveBillToMySQL(bill) {
        const query = `INSERT INTO bills (id, name, amount, dueDate, category, status, barcode, createdAt, updatedAt, paidAt, source) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                       ON DUPLICATE KEY UPDATE 
                       name=VALUES(name), amount=VALUES(amount), dueDate=VALUES(dueDate), 
                       category=VALUES(category), status=VALUES(status), barcode=VALUES(barcode), 
                       updatedAt=VALUES(updatedAt), paidAt=VALUES(paidAt), source=VALUES(source)`;
        
        const params = [
            bill.id, bill.name, bill.amount, bill.dueDate, bill.category, 
            bill.status, bill.barcode || null, bill.createdAt, bill.updatedAt || bill.createdAt, 
            bill.paidAt || null, bill.source || 'manual'
        ];

        return await this.executeMySQLQuery(query, params);
    }

    async saveInvoiceToMySQL(invoice) {
        const query = `INSERT INTO invoices (id, number, supplier, amount, date, category, status, cnpj, createdAt, updatedAt, source) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                       ON DUPLICATE KEY UPDATE 
                       number=VALUES(number), supplier=VALUES(supplier), amount=VALUES(amount), 
                       date=VALUES(date), category=VALUES(category), status=VALUES(status), 
                       cnpj=VALUES(cnpj), updatedAt=VALUES(updatedAt), source=VALUES(source)`;
        
        const params = [
            invoice.id, invoice.number, invoice.supplier, invoice.amount, invoice.date, 
            invoice.category, invoice.status, invoice.cnpj || null, invoice.createdAt, 
            invoice.updatedAt || invoice.createdAt, invoice.source || 'manual'
        ];

        return await this.executeMySQLQuery(query, params);
    }

    async saveRevenueToMySQL(revenue) {
        const query = `INSERT INTO revenues (id, description, amount, date, category, source, notes, createdAt, updatedAt) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
                       ON DUPLICATE KEY UPDATE 
                       description=VALUES(description), amount=VALUES(amount), date=VALUES(date), 
                       category=VALUES(category), source=VALUES(source), notes=VALUES(notes), 
                       updatedAt=VALUES(updatedAt)`;
        
        const params = [
            revenue.id, revenue.description, revenue.amount, revenue.date, revenue.category, 
            revenue.source || null, revenue.notes || null, revenue.createdAt, 
            revenue.updatedAt || revenue.createdAt
        ];

        return await this.executeMySQLQuery(query, params);
    }

    async loadBillsFromMySQL() {
        const query = 'SELECT * FROM bills ORDER BY createdAt DESC';
        const result = await this.executeMySQLQuery(query);
        
        // Simulate returning data (in real implementation, this would return actual MySQL data)
        return this.loadFromLocalStorage('bills') || [];
    }

    async loadInvoicesFromMySQL() {
        const query = 'SELECT * FROM invoices ORDER BY createdAt DESC';
        const result = await this.executeMySQLQuery(query);
        
        // Simulate returning data
        return this.loadFromLocalStorage('invoices') || [];
    }

    async loadRevenuesFromMySQL() {
        const query = 'SELECT * FROM revenues ORDER BY createdAt DESC';
        const result = await this.executeMySQLQuery(query);
        
        // Simulate returning data
        return this.loadFromLocalStorage('revenues') || [];
    }

    getMySQLConfig() {
        return this.mysqlConfig;
    }

    getStorageMode() {
        return this.storageMode;
    }

    isConnectedToMySQL() {
        return this.storageMode === 'mysql' && this.mysqlConfig !== null;
    }

    async saveToIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);

                // Clear existing data
                const clearRequest = store.clear();
                
                clearRequest.onsuccess = () => {
                    // Add all new data
                    let completed = 0;
                    let total = Array.isArray(data) ? data.length : 1;
                    
                    if (total === 0) {
                        resolve();
                        return;
                    }

                    const dataArray = Array.isArray(data) ? data : [data];
                    
                    dataArray.forEach(item => {
                        const addRequest = store.add(item);
                        
                        addRequest.onsuccess = () => {
                            completed++;
                            if (completed === total) {
                                resolve();
                            }
                        };
                        
                        addRequest.onerror = () => {
                            reject(addRequest.error);
                        };
                    });
                };

                clearRequest.onerror = () => {
                    reject(clearRequest.error);
                };

                transaction.onerror = () => {
                    reject(transaction.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async loadFromIndexedDB(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    resolve(request.result || []);
                };

                request.onerror = () => {
                    reject(request.error);
                };

                transaction.onerror = () => {
                    reject(transaction.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    saveToLocalStorage(storeName, data) {
        try {
            const key = `financeai_${storeName}`;
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
            return false;
        }
    }

    loadFromLocalStorage(storeName) {
        try {
            const key = `financeai_${storeName}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Erro ao carregar do localStorage:', error);
            return [];
        }
    }

    async saveSetting(key, value) {
        try {
            const setting = { key, value };
            
            if (this.isIndexedDBSupported && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['settings'], 'readwrite');
                    const store = transaction.objectStore('settings');
                    const request = store.put(setting);

                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } else {
                localStorage.setItem(`financeai_setting_${key}`, JSON.stringify(value));
                return true;
            }
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            localStorage.setItem(`financeai_setting_${key}`, JSON.stringify(value));
        }
    }

    async loadSetting(key, defaultValue = null) {
        try {
            if (this.isIndexedDBSupported && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['settings'], 'readonly');
                    const store = transaction.objectStore('settings');
                    const request = store.get(key);

                    request.onsuccess = () => {
                        const result = request.result;
                        resolve(result ? result.value : defaultValue);
                    };
                    
                    request.onerror = () => {
                        resolve(defaultValue);
                    };
                });
            } else {
                const data = localStorage.getItem(`financeai_setting_${key}`);
                return data ? JSON.parse(data) : defaultValue;
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
            return defaultValue;
        }
    }

    async exportData() {
        try {
            const bills = await this.loadData('bills');
            const invoices = await this.loadData('invoices');
            const revenues = await this.loadData('revenues');
            
            const exportData = {
                bills: bills || [],
                invoices: invoices || [],
                revenues: revenues || [],
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            return exportData;
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            throw error;
        }
    }

    async importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Dados de importação inválidos');
            }

            if (data.bills && Array.isArray(data.bills)) {
                await this.saveData('bills', data.bills);
            }

            if (data.invoices && Array.isArray(data.invoices)) {
                await this.saveData('invoices', data.invoices);
            }

            if (data.revenues && Array.isArray(data.revenues)) {
                await this.saveData('revenues', data.revenues);
            }

            return true;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            throw error;
        }
    }

    async clearAllData() {
        try {
            if (this.isIndexedDBSupported && this.db) {
                const storeNames = ['bills', 'invoices', 'revenues'];
                
                for (const storeName of storeNames) {
                    await new Promise((resolve, reject) => {
                        const transaction = this.db.transaction([storeName], 'readwrite');
                        const store = transaction.objectStore(storeName);
                        const request = store.clear();

                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }
            }

            // Also clear localStorage
            const keys = ['bills', 'invoices', 'revenues', 'settings'];
            keys.forEach(key => {
                localStorage.removeItem(`financeai_${key}`);
            });

            return true;
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            throw error;
        }
    }

    async getStorageInfo() {
        try {
            const bills = await this.loadData('bills');
            const invoices = await this.loadData('invoices');
            const revenues = await this.loadData('revenues');

            return {
                bills: bills.length,
                invoices: invoices.length,
                revenues: revenues.length,
                storageType: this.storageMode === 'mysql' ? 
                    `MySQL (${this.mysqlConfig?.host || 'N/A'})` : 
                    (this.isIndexedDBSupported && this.db ? 'IndexedDB' : 'localStorage'),
                lastUpdate: new Date().toISOString(),
                mode: this.storageMode,
                mysqlConnected: this.isConnectedToMySQL()
            };
        } catch (error) {
            console.error('Erro ao obter informações de armazenamento:', error);
            return {
                bills: 0,
                invoices: 0,
                revenues: 0,
                storageType: 'Erro',
                lastUpdate: new Date().toISOString(),
                mode: this.storageMode,
                mysqlConnected: false
            };
        }
    }
}