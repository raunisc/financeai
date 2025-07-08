class StorageManager {
    constructor() {
        this.dbName = 'FinanceAI_DB';
        this.dbVersion = 1;
        this.db = null;
        this.isIndexedDBSupported = this.checkIndexedDBSupport();
        this.mysqlConfig = null;
        this.storageMode = 'local'; // 'local' or 'mysql'
        this.isInitialized = false;
        this.initializationPromise = null;
        this.initialize();
    }

    checkIndexedDBSupport() {
        return 'indexedDB' in window;
    }

    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }

    async _initialize() {
        try {
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
                    this.mysqlConfig = null;
                }
            }

            if (this.storageMode === 'mysql' && this.mysqlConfig) {
                try {
                    await this.initializeMySQL();
                } catch (error) {
                    console.warn('Falha na inicialização MySQL, usando local:', error);
                    this.storageMode = 'local';
                    await this.initializeLocalDB();
                }
            } else {
                await this.initializeLocalDB();
            }
            
            this.isInitialized = true;
            console.log('Storage manager inicializado:', this.storageMode);
        } catch (error) {
            console.error('Erro na inicialização do storage:', error);
            // Fallback to local storage
            this.storageMode = 'local';
            await this.initializeLocalDB();
            this.isInitialized = true;
        }
    }

    async waitForInitialization() {
        if (!this.isInitialized && this.initializationPromise) {
            await this.initializationPromise;
        }
        return this.isInitialized;
    }

    async initializeLocalDB() {
        if (!this.isIndexedDBSupported) {
            console.log('IndexedDB não suportado, usando localStorage');
            this.isInitialized = true;
            return;
        }

        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onerror = () => {
                    console.warn('Erro ao abrir IndexedDB, usando localStorage:', request.error);
                    this.db = null;
                    resolve();
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('IndexedDB inicializado com sucesso');
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    try {
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
                    } catch (error) {
                        console.error('Erro na criação da estrutura IndexedDB:', error);
                        reject(error);
                    }
                };

                // Set timeout for initialization
                setTimeout(() => {
                    if (!this.db) {
                        console.warn('Timeout na inicialização do IndexedDB, usando localStorage');
                        resolve();
                    }
                }, 5000);
            });
        } catch (error) {
            console.error('Erro na inicialização do IndexedDB:', error);
            this.db = null;
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
            // Ensure initialization is complete
            await this.waitForInitialization();
            
            // Validate inputs
            if (!storeName || typeof storeName !== 'string') {
                throw new Error('Nome do store inválido');
            }
            
            if (!Array.isArray(data)) {
                console.warn('Dados não são um array, convertendo:', data);
                data = Array.isArray(data) ? data : [];
            }
            
            if (this.storageMode === 'mysql') {
                return await this.saveToMySQL(storeName, data);
            } else {
                // Try IndexedDB first, with proper fallback
                if (this.isIndexedDBSupported && this.db) {
                    try {
                        await this.saveToIndexedDB(storeName, data);
                        return true;
                    } catch (error) {
                        console.warn('Erro no IndexedDB, usando localStorage:', error);
                        return this.saveToLocalStorage(storeName, data);
                    }
                } else {
                    // Use localStorage directly
                    return this.saveToLocalStorage(storeName, data);
                }
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            // Emergency fallback to localStorage
            try {
                return this.saveToLocalStorage(storeName, data || []);
            } catch (fallbackError) {
                console.error('Erro crítico no fallback:', fallbackError);
                return false;
            }
        }
    }

    async loadData(storeName) {
        try {
            // Ensure initialization is complete
            await this.waitForInitialization();
            
            // Ensure we have a valid store name
            if (!storeName || typeof storeName !== 'string') {
                console.warn('Nome do store inválido:', storeName);
                return [];
            }
            
            if (this.storageMode === 'mysql') {
                return await this.loadFromMySQL(storeName);
            } else {
                // Try IndexedDB first, with proper fallback
                if (this.isIndexedDBSupported && this.db) {
                    try {
                        const data = await this.loadFromIndexedDB(storeName);
                        if (Array.isArray(data)) {
                            return data;
                        }
                    } catch (error) {
                        console.warn('Erro no IndexedDB, tentando localStorage:', error);
                    }
                }
                
                // Fallback to localStorage
                return this.loadFromLocalStorage(storeName);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Emergency fallback to localStorage
            try {
                return this.loadFromLocalStorage(storeName);
            } catch (fallbackError) {
                console.error('Erro crítico no fallback:', fallbackError);
                return [];
            }
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
                if (!this.db) {
                    throw new Error('IndexedDB não inicializado');
                }

                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);

                // Set timeout for transaction
                const timeoutId = setTimeout(() => {
                    transaction.abort();
                    reject(new Error('Timeout na transação IndexedDB'));
                }, 10000);

                transaction.oncomplete = () => {
                    clearTimeout(timeoutId);
                    resolve();
                };

                transaction.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(transaction.error);
                };

                transaction.onabort = () => {
                    clearTimeout(timeoutId);
                    reject(new Error('Transação abortada'));
                };

                // Clear existing data
                const clearRequest = store.clear();
                
                clearRequest.onsuccess = () => {
                    // Add all new data
                    if (!Array.isArray(data) || data.length === 0) {
                        return; // Transaction will complete automatically
                    }

                    let completed = 0;
                    const total = data.length;
                    
                    data.forEach(item => {
                        try {
                            // Ensure item has required properties
                            if (!item || typeof item !== 'object' || !item.id) {
                                console.warn('Item inválido ignorado:', item);
                                completed++;
                                return;
                            }

                            const addRequest = store.add(item);
                            
                            addRequest.onsuccess = () => {
                                completed++;
                            };
                            
                            addRequest.onerror = () => {
                                console.warn('Erro ao adicionar item:', addRequest.error);
                                completed++;
                            };
                        } catch (itemError) {
                            console.warn('Erro no processamento do item:', itemError);
                            completed++;
                        }
                    });
                };

                clearRequest.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(clearRequest.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async loadFromIndexedDB(storeName) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.db) {
                    throw new Error('IndexedDB não inicializado');
                }

                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                // Set timeout for request
                const timeoutId = setTimeout(() => {
                    transaction.abort();
                    reject(new Error('Timeout na leitura IndexedDB'));
                }, 10000);

                request.onsuccess = () => {
                    clearTimeout(timeoutId);
                    const result = request.result || [];
                    resolve(Array.isArray(result) ? result : []);
                };

                request.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(request.error);
                };

                transaction.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(transaction.error);
                };

                transaction.onabort = () => {
                    clearTimeout(timeoutId);
                    reject(new Error('Transação abortada'));
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    loadFromLocalStorage(storeName) {
        try {
            const key = `financeai_${storeName}`;
            const data = localStorage.getItem(key);
            
            if (!data) {
                return [];
            }
            
            const parsed = JSON.parse(data);
            
            // Ensure we always return an array
            if (!Array.isArray(parsed)) {
                console.warn('Dados inválidos no localStorage, retornando array vazio');
                return [];
            }
            
            return parsed;
        } catch (error) {
            console.error('Erro ao carregar do localStorage:', error);
            // Clear corrupted data
            try {
                localStorage.removeItem(`financeai_${storeName}`);
            } catch (clearError) {
                console.error('Erro ao limpar dados corrompidos:', clearError);
            }
            return [];
        }
    }

    saveToLocalStorage(storeName, data) {
        try {
            const key = `financeai_${storeName}`;
            const dataToSave = Array.isArray(data) ? data : [];
            
            // Test if we can stringify the data
            const stringified = JSON.stringify(dataToSave);
            
            // Check localStorage quota
            const testKey = `test_${Date.now()}`;
            localStorage.setItem(testKey, stringified);
            localStorage.removeItem(testKey);
            
            // If test passed, save actual data
            localStorage.setItem(key, stringified);
            return true;
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
            
            if (error.name === 'QuotaExceededError') {
                console.warn('Cota do localStorage excedida, tentando limpar dados antigos');
                this.cleanupLocalStorage();
                
                // Try again after cleanup
                try {
                    localStorage.setItem(`financeai_${storeName}`, JSON.stringify(data || []));
                    return true;
                } catch (retryError) {
                    console.error('Erro mesmo após limpeza:', retryError);
                }
            }
            
            return false;
        }
    }

    cleanupLocalStorage() {
        try {
            // Remove old backup data and temporary files
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('test_') || key.includes('_backup_'))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.warn('Erro ao remover chave:', key, error);
                }
            });
            
            console.log('Limpeza do localStorage concluída');
        } catch (error) {
            console.error('Erro na limpeza do localStorage:', error);
        }
    }

    async loadSetting(key, defaultValue = null) {
        try {
            await this.waitForInitialization();
            
            if (!key || typeof key !== 'string') {
                return defaultValue;
            }
            
            if (this.isIndexedDBSupported && this.db) {
                try {
                    return new Promise((resolve, reject) => {
                        const transaction = this.db.transaction(['settings'], 'readonly');
                        const store = transaction.objectStore('settings');
                        const request = store.get(key);

                        const timeoutId = setTimeout(() => {
                            transaction.abort();
                            resolve(this.loadSettingFromLocalStorage(key, defaultValue));
                        }, 5000);

                        request.onsuccess = () => {
                            clearTimeout(timeoutId);
                            const result = request.result;
                            resolve(result ? result.value : defaultValue);
                        };
                        
                        request.onerror = () => {
                            clearTimeout(timeoutId);
                            resolve(this.loadSettingFromLocalStorage(key, defaultValue));
                        };

                        transaction.onerror = () => {
                            clearTimeout(timeoutId);
                            resolve(this.loadSettingFromLocalStorage(key, defaultValue));
                        };
                    });
                } catch (error) {
                    console.warn('Erro ao acessar IndexedDB para settings:', error);
                    return this.loadSettingFromLocalStorage(key, defaultValue);
                }
            } else {
                return this.loadSettingFromLocalStorage(key, defaultValue);
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
            return defaultValue;
        }
    }

    async saveSetting(key, value) {
        try {
            await this.waitForInitialization();
            
            if (!key || typeof key !== 'string') {
                throw new Error('Chave da configuração inválida');
            }
            
            if (this.isIndexedDBSupported && this.db) {
                try {
                    return new Promise((resolve, reject) => {
                        const transaction = this.db.transaction(['settings'], 'readwrite');
                        const store = transaction.objectStore('settings');
                        const request = store.put({ key, value });

                        const timeoutId = setTimeout(() => {
                            transaction.abort();
                            resolve(this.saveSettingToLocalStorage(key, value));
                        }, 5000);

                        request.onsuccess = () => {
                            clearTimeout(timeoutId);
                            resolve(true);
                        };
                        
                        request.onerror = () => {
                            clearTimeout(timeoutId);
                            resolve(this.saveSettingToLocalStorage(key, value));
                        };

                        transaction.onerror = () => {
                            clearTimeout(timeoutId);
                            resolve(this.saveSettingToLocalStorage(key, value));
                        };
                    });
                } catch (error) {
                    console.warn('Erro ao salvar no IndexedDB, usando localStorage:', error);
                    return this.saveSettingToLocalStorage(key, value);
                }
            } else {
                return this.saveSettingToLocalStorage(key, value);
            }
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            return this.saveSettingToLocalStorage(key, value);
        }
    }

    saveSettingToLocalStorage(key, value) {
        try {
            localStorage.setItem(`financeai_setting_${key}`, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Erro ao salvar setting no localStorage:', error);
            return false;
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
            await this.waitForInitialization();
            
            if (this.isIndexedDBSupported && this.db) {
                const storeNames = ['bills', 'invoices', 'revenues'];
                
                for (const storeName of storeNames) {
                    try {
                        await new Promise((resolve, reject) => {
                            const transaction = this.db.transaction([storeName], 'readwrite');
                            const store = transaction.objectStore(storeName);
                            const request = store.clear();

                            const timeoutId = setTimeout(() => {
                                transaction.abort();
                                reject(new Error('Timeout ao limpar dados'));
                            }, 10000);

                            request.onsuccess = () => {
                                clearTimeout(timeoutId);
                                resolve();
                            };
                            
                            request.onerror = () => {
                                clearTimeout(timeoutId);
                                reject(request.error);
                            };

                            transaction.onerror = () => {
                                clearTimeout(timeoutId);
                                reject(transaction.error);
                            };
                        });
                    } catch (error) {
                        console.warn(`Erro ao limpar ${storeName} do IndexedDB:`, error);
                    }
                }
            }

            // Always clear localStorage as backup
            const keys = ['bills', 'invoices', 'revenues'];
            keys.forEach(key => {
                try {
                    localStorage.removeItem(`financeai_${key}`);
                } catch (error) {
                    console.warn(`Erro ao limpar ${key} do localStorage:`, error);
                }
            });

            return true;
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            throw error;
        }
    }

    async getStorageInfo() {
        try {
            await this.waitForInitialization();
            
            const bills = await this.loadData('bills');
            const invoices = await this.loadData('invoices');
            const revenues = await this.loadData('revenues');

            return {
                bills: Array.isArray(bills) ? bills.length : 0,
                invoices: Array.isArray(invoices) ? invoices.length : 0,
                revenues: Array.isArray(revenues) ? revenues.length : 0,
                storageType: this.storageMode === 'mysql' ? 
                    `MySQL (${this.mysqlConfig?.host || 'N/A'})` : 
                    (this.isIndexedDBSupported && this.db ? 'IndexedDB' : 'localStorage'),
                lastUpdate: new Date().toISOString(),
                mode: this.storageMode,
                mysqlConnected: this.isConnectedToMySQL(),
                initialized: this.isInitialized
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
                mysqlConnected: false,
                initialized: this.isInitialized
            };
        }
    }
}