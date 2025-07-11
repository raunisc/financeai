// Database management system with MySQL, SQLite, and IndexedDB support
class DatabaseManager {
    constructor() {
        this.mysql = null;
        this.sqlite = null;
        this.indexedDB = null;
        this.syncInProgress = false;
        this.lastSync = localStorage.getItem('lastSync') || null;
        this.changeLog = JSON.parse(localStorage.getItem('changeLog') || '[]');
        this.mysqlConfig = {
            enabled: false, // Set to true when deploying to Node.js server
            host: 'localhost',
            port: 3306,
            database: 'restaurant_db',
            user: 'root',
            password: ''
        };
        
        this.init();
    }

    async init() {
        try {
            // Initialize in order of preference
            await this.initIndexedDB();
            await this.initSQLite();
            await this.initMySQL();
            this.updateSyncStatus();
            
            // Load existing SQLite data if available
            await this.loadSQLiteFromStorage();
            
            console.log('Database system initialized successfully');
        } catch (error) {
            console.error('Database initialization error:', error);
        }
    }

    // IndexedDB implementation with better error handling
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('RestaurantDB', 5);
            
            request.onerror = () => {
                console.error('IndexedDB initialization failed:', request.error);
                this.updateDBStatus('indexeddbStatus', 'Erro', 'error');
                resolve(); // Don't reject, continue with other DBs
            };
            
            request.onsuccess = () => {
                this.indexedDB = request.result;
                this.updateDBStatus('indexeddbStatus', 'Conectado', 'connected');
                console.log('IndexedDB initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Clear existing stores if they exist
                const storeNames = ['menu', 'orders', 'inventory', 'purchases', 'expenses', 'settings', 'menu_ingredients'];
                storeNames.forEach(storeName => {
                    if (db.objectStoreNames.contains(storeName)) {
                        db.deleteObjectStore(storeName);
                    }
                });
                
                // Create menu store
                const menuStore = db.createObjectStore('menu', { keyPath: 'id', autoIncrement: true });
                menuStore.createIndex('category', 'category', { unique: false });
                menuStore.createIndex('name', 'name', { unique: false });
                
                // Create orders store
                const ordersStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                ordersStore.createIndex('status', 'status', { unique: false });
                ordersStore.createIndex('date', 'created_at', { unique: false });
                ordersStore.createIndex('customer', 'customer', { unique: false });
                
                // Create inventory store
                const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
                inventoryStore.createIndex('name', 'name', { unique: false });
                inventoryStore.createIndex('quantity', 'quantity', { unique: false });
                
                // Create purchases store
                const purchasesStore = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
                purchasesStore.createIndex('supplier', 'supplier', { unique: false });
                purchasesStore.createIndex('status', 'status', { unique: false });
                purchasesStore.createIndex('date', 'created_at', { unique: false });
                
                // Create expenses store
                const expensesStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                expensesStore.createIndex('category', 'category', { unique: false });
                expensesStore.createIndex('date', 'date', { unique: false });
                
                // Create menu-ingredient relationships store
                const menuIngredientsStore = db.createObjectStore('menu_ingredients', { keyPath: 'id', autoIncrement: true });
                menuIngredientsStore.createIndex('menu_id', 'menu_id', { unique: false });
                menuIngredientsStore.createIndex('inventory_id', 'inventory_id', { unique: false });
                
                // Create settings store
                db.createObjectStore('settings', { keyPath: 'key' });
                
                console.log('IndexedDB schema updated to version 5');
            };
        });
    }

    // SQLite implementation with persistent storage
    async initSQLite() {
        try {
            // Import sql.js differently to avoid constructor issues
            const sqlModule = await import('https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/sql-wasm.js');
            const SQL = sqlModule.default;
            
            // Initialize SQL.js
            const sqlPromise = SQL({
                locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
            });
            
            const sql = await sqlPromise;
            this.sqlite = new sql.Database();
            
            this.createSQLiteTables();
            this.updateDBStatus('sqliteStatus', 'Conectado', 'connected');
            console.log('SQLite initialized successfully');
        } catch (error) {
            console.error('SQLite initialization error:', error);
            this.updateDBStatus('sqliteStatus', 'Erro', 'error');
        }
    }

    async loadSQLiteFromStorage() {
        try {
            const savedData = localStorage.getItem('sqliteDB');
            if (savedData && this.sqlite) {
                const dataArray = JSON.parse(savedData);
                const uint8Array = new Uint8Array(dataArray);
                
                // Import sql.js again for loading
                const sqlModule = await import('https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/sql-wasm.js');
                const SQL = sqlModule.default;
                const sql = await SQL({
                    locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
                });
                
                this.sqlite = new sql.Database(uint8Array);
                console.log('SQLite data loaded from storage');
            }
        } catch (error) {
            console.error('Error loading SQLite from storage:', error);
            // If loading fails, create fresh tables
            this.createSQLiteTables();
        }
    }

    createSQLiteTables() {
        if (!this.sqlite) return;
        
        const tables = [
            `CREATE TABLE IF NOT EXISTS menu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                description TEXT,
                cost_price REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer TEXT NOT NULL,
                table_number INTEGER,
                items TEXT NOT NULL,
                total REAL NOT NULL,
                subtotal REAL DEFAULT 0,
                fee REAL DEFAULT 0,
                platform TEXT DEFAULT 'vendas',
                payment_method TEXT DEFAULT 'dinheiro',
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 0,
                unit TEXT NOT NULL,
                min_stock REAL NOT NULL DEFAULT 0,
                cost_price REAL DEFAULT 0,
                supplier TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS menu_ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                menu_id INTEGER NOT NULL,
                inventory_id INTEGER NOT NULL,
                quantity_needed REAL NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (menu_id) REFERENCES menu(id),
                FOREIGN KEY (inventory_id) REFERENCES inventory(id)
            )`,
            `CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier TEXT NOT NULL,
                items TEXT NOT NULL,
                total_cost REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                delivery_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            )`,
            `CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                date DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];
        
        try {
            tables.forEach(sql => {
                this.sqlite.run(sql);
            });
            this.saveSQLiteToStorage();
            console.log('SQLite tables created successfully');
        } catch (error) {
            console.error('Error creating SQLite tables:', error);
        }
    }

    saveSQLiteToStorage() {
        if (!this.sqlite) return;
        
        try {
            const data = this.sqlite.export();
            const dataArray = Array.from(data);
            localStorage.setItem('sqliteDB', JSON.stringify(dataArray));
            console.log('SQLite data saved to storage');
        } catch (error) {
            console.error('Error saving SQLite to storage:', error);
        }
    }

    // MySQL implementation with automatic table creation
    async initMySQL() {
        try {
            if (!this.mysqlConfig.enabled) {
                this.updateDBStatus('mysqlStatus', 'Desabilitado', 'disconnected');
                console.log('MySQL is disabled in configuration');
                return;
            }
            
            // This would be used in a Node.js environment
            // const mysql = require('mysql2/promise');
            
            // For browser environment, we simulate the connection
            const testConnection = await this.simulateMySQLConnection();
            
            if (testConnection) {
                this.mysql = { 
                    connected: true,
                    // connection: await mysql.createConnection(this.mysqlConfig)
                };
                
                await this.createMySQLTables();
                this.updateDBStatus('mysqlStatus', 'Conectado', 'connected');
                console.log('MySQL connected and tables created');
            } else {
                throw new Error('MySQL connection failed');
            }
        } catch (error) {
            console.log('MySQL not available:', error.message);
            this.updateDBStatus('mysqlStatus', 'Desconectado', 'disconnected');
        }
    }

    async createMySQLTables() {
        if (!this.mysql || !this.mysql.connected) return;
        
        const tables = [
            `CREATE TABLE IF NOT EXISTS menu (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                description TEXT,
                cost_price DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            `CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer VARCHAR(255) NOT NULL,
                table_number INT,
                items JSON NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) DEFAULT 0,
                fee DECIMAL(10,2) DEFAULT 0,
                platform VARCHAR(50) DEFAULT 'vendas',
                payment_method VARCHAR(50) DEFAULT 'dinheiro',
                status ENUM('pending', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
                cancelled_by VARCHAR(255),
                cancellation_reason TEXT,
                cancelled_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_date (created_at),
                INDEX idx_customer (customer),
                INDEX idx_platform (platform),
                INDEX idx_payment_method (payment_method)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            `CREATE TABLE IF NOT EXISTS inventory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
                unit VARCHAR(50) NOT NULL,
                min_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
                cost_price DECIMAL(10,2) DEFAULT 0,
                supplier VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name),
                INDEX idx_quantity (quantity)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            `CREATE TABLE IF NOT EXISTS menu_ingredients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                menu_id INT NOT NULL,
                inventory_id INT NOT NULL,
                quantity_needed DECIMAL(10,3) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE CASCADE,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
                INDEX idx_menu_id (menu_id),
                INDEX idx_inventory_id (inventory_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            `CREATE TABLE IF NOT EXISTS purchases (
                id INT AUTO_INCREMENT PRIMARY KEY,
                supplier VARCHAR(255) NOT NULL,
                items JSON NOT NULL,
                total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
                status ENUM('pending', 'completed') DEFAULT 'pending',
                delivery_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                INDEX idx_supplier (supplier),
                INDEX idx_status (status),
                INDEX idx_date (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            `CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                description VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                category VARCHAR(100) NOT NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_date (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            `CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(255) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ];
        
        try {
            // In a real Node.js environment, this would execute the SQL
            for (const sql of tables) {
                // await this.mysql.connection.execute(sql);
                console.log('MySQL table created:', sql.split('(')[0]);
            }
            console.log('All MySQL tables created successfully');
        } catch (error) {
            console.error('Error creating MySQL tables:', error);
        }
    }

    async simulateMySQLConnection() {
        // Simulate MySQL connection attempt
        return new Promise((resolve) => {
            setTimeout(() => {
                // In browser environment, always return false
                // In Node.js environment with actual MySQL, this would test the real connection
                resolve(false);
            }, 1000);
        });
    }

    updateDBStatus(elementId, text, status) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.className = `db-status-indicator ${status}`;
        }
    }

    // Enhanced IndexedDB operations with better error handling
    async createIndexedDB(table, data) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.indexedDB) {
                    reject(new Error('IndexedDB not available'));
                    return;
                }
                
                const transaction = this.indexedDB.transaction([table], 'readwrite');
                const store = transaction.objectStore(table);
                
                // Prepare data for storage
                const dataToStore = { ...data };
                if (dataToStore.id) {
                    delete dataToStore.id; // Let it auto-increment
                }
                
                // Ensure required fields have default values
                if (table === 'inventory') {
                    dataToStore.quantity = dataToStore.quantity || 0;
                    dataToStore.min_stock = dataToStore.min_stock || 0;
                    dataToStore.cost_price = dataToStore.cost_price || 0;
                }
                
                const request = store.add(dataToStore);
                
                request.onsuccess = () => {
                    console.log('IndexedDB create successful:', table, request.result);
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    console.error('IndexedDB create error:', request.error);
                    reject(request.error);
                };
                
                transaction.onerror = () => {
                    console.error('IndexedDB transaction error:', transaction.error);
                    reject(transaction.error);
                };
            } catch (error) {
                console.error('IndexedDB create exception:', error);
                reject(error);
            }
        });
    }

    async readIndexedDB(table, conditions = {}) {
        return new Promise((resolve) => {
            try {
                if (!this.indexedDB) {
                    resolve([]);
                    return;
                }
                
                const transaction = this.indexedDB.transaction([table], 'readonly');
                const store = transaction.objectStore(table);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    let results = request.result || [];
                    
                    // Apply filtering
                    if (Object.keys(conditions).length > 0) {
                        results = results.filter(item => {
                            return Object.keys(conditions).every(key => {
                                return item && item[key] === conditions[key];
                            });
                        });
                    }
                    
                    console.log('IndexedDB read successful:', table, results.length, 'items');
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('IndexedDB read error:', request.error);
                    resolve([]);
                };
                
                transaction.onerror = () => {
                    console.error('IndexedDB transaction error:', transaction.error);
                    resolve([]);
                };
            } catch (error) {
                console.error('IndexedDB read exception:', error);
                resolve([]);
            }
        });
    }

    async updateIndexedDB(table, id, data) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.indexedDB) {
                    reject(new Error('IndexedDB not available'));
                    return;
                }
                
                const transaction = this.indexedDB.transaction([table], 'readwrite');
                const store = transaction.objectStore(table);
                
                // Get existing record
                const getRequest = store.get(id);
                getRequest.onsuccess = () => {
                    const existingData = getRequest.result;
                    if (existingData) {
                        const updatedData = { ...existingData, ...data };
                        const putRequest = store.put(updatedData);
                        putRequest.onsuccess = () => {
                            console.log('IndexedDB update successful:', table, id);
                            resolve(putRequest.result);
                        };
                        putRequest.onerror = () => reject(putRequest.error);
                    } else {
                        reject(new Error('Record not found'));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    async deleteIndexedDB(table, id) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.indexedDB) {
                    reject(new Error('IndexedDB not available'));
                    return;
                }
                
                const transaction = this.indexedDB.transaction([table], 'readwrite');
                const store = transaction.objectStore(table);
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    console.log('IndexedDB delete successful:', table, id);
                    resolve();
                };
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Enhanced SQLite operations
    async createSQLite(table, data) {
        try {
            if (!this.sqlite) return null;
            
            const dataToStore = { ...data };
            if (dataToStore.id) {
                delete dataToStore.id; // Let it auto-increment
            }
            
            // Ensure required fields have default values
            if (table === 'inventory') {
                dataToStore.quantity = dataToStore.quantity || 0;
                dataToStore.min_stock = dataToStore.min_stock || 0;
                dataToStore.cost_price = dataToStore.cost_price || 0;
            }
            
            const columns = Object.keys(dataToStore);
            const values = Object.values(dataToStore);
            const placeholders = values.map(() => '?').join(', ');
            
            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            const result = this.sqlite.run(sql, values);
            this.saveSQLiteToStorage();
            
            console.log('SQLite create successful:', table, result.lastInsertId);
            return result.lastInsertId;
        } catch (error) {
            console.error('SQLite create error:', error);
            throw error;
        }
    }

    async readSQLite(table, conditions = {}) {
        try {
            if (!this.sqlite) return [];
            
            let sql = `SELECT * FROM ${table}`;
            const values = [];
            
            if (Object.keys(conditions).length > 0) {
                const whereClause = Object.keys(conditions).map(key => {
                    values.push(conditions[key]);
                    return `${key} = ?`;
                }).join(' AND ');
                sql += ` WHERE ${whereClause}`;
            }
            
            const results = this.sqlite.exec(sql, values);
            if (results.length === 0) return [];
            
            const columns = results[0].columns;
            const data = results[0].values.map(row => {
                const obj = {};
                columns.forEach((col, index) => {
                    obj[col] = row[index];
                });
                return obj;
            });
            
            console.log('SQLite read successful:', table, data.length, 'items');
            return data;
        } catch (error) {
            console.error('SQLite read error:', error);
            return [];
        }
    }

    async updateSQLite(table, id, data) {
        try {
            if (!this.sqlite) return;
            
            const columns = Object.keys(data);
            const values = Object.values(data);
            const setClause = columns.map(col => `${col} = ?`).join(', ');
            
            const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
            this.sqlite.run(sql, [...values, id]);
            this.saveSQLiteToStorage();
            
            console.log('SQLite update successful:', table, id);
        } catch (error) {
            console.error('SQLite update error:', error);
            throw error;
        }
    }

    async deleteSQLite(table, id) {
        try {
            if (!this.sqlite) return;
            
            const sql = `DELETE FROM ${table} WHERE id = ?`;
            this.sqlite.run(sql, [id]);
            this.saveSQLiteToStorage();
            
            console.log('SQLite delete successful:', table, id);
        } catch (error) {
            console.error('SQLite delete error:', error);
            throw error;
        }
    }

    // MySQL operations (for Node.js environment)
    async createMySQL(table, data) {
        try {
            if (!this.mysql || !this.mysql.connected) return null;
            
            // In Node.js environment with real MySQL:
            /*
            const dataToStore = { ...data };
            if (dataToStore.id) {
                delete dataToStore.id;
            }
            
            const columns = Object.keys(dataToStore);
            const values = Object.values(dataToStore);
            const placeholders = values.map(() => '?').join(', ');
            
            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            const [result] = await this.mysql.connection.execute(sql, values);
            
            console.log('MySQL create successful:', table, result.insertId);
            return result.insertId;
            */
            
            console.log('MySQL CREATE (simulated):', table, data);
            return Date.now(); // Simulated ID
        } catch (error) {
            console.error('MySQL create error:', error);
            throw error;
        }
    }

    async readMySQL(table, conditions = {}) {
        try {
            if (!this.mysql || !this.mysql.connected) return [];
            
            // In Node.js environment with real MySQL:
            /*
            let sql = `SELECT * FROM ${table}`;
            const values = [];
            
            if (Object.keys(conditions).length > 0) {
                const whereClause = Object.keys(conditions).map(key => {
                    values.push(conditions[key]);
                    return `${key} = ?`;
                }).join(' AND ');
                sql += ` WHERE ${whereClause}`;
            }
            
            const [rows] = await this.mysql.connection.execute(sql, values);
            console.log('MySQL read successful:', table, rows.length, 'items');
            return rows;
            */
            
            console.log('MySQL READ (simulated):', table, conditions);
            return [];
        } catch (error) {
            console.error('MySQL read error:', error);
            return [];
        }
    }

    async updateMySQL(table, id, data) {
        try {
            if (!this.mysql || !this.mysql.connected) return;
            
            // In Node.js environment with real MySQL:
            /*
            const columns = Object.keys(data);
            const values = Object.values(data);
            const setClause = columns.map(col => `${col} = ?`).join(', ');
            
            const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
            await this.mysql.connection.execute(sql, [...values, id]);
            
            console.log('MySQL update successful:', table, id);
            */
            
            console.log('MySQL UPDATE (simulated):', table, id, data);
        } catch (error) {
            console.error('MySQL update error:', error);
            throw error;
        }
    }

    async deleteMySQL(table, id) {
        try {
            if (!this.mysql || !this.mysql.connected) return;
            
            // In Node.js environment with real MySQL:
            /*
            const sql = `DELETE FROM ${table} WHERE id = ?`;
            await this.mysql.connection.execute(sql, [id]);
            
            console.log('MySQL delete successful:', table, id);
            */
            
            console.log('MySQL DELETE (simulated):', table, id);
        } catch (error) {
            console.error('MySQL delete error:', error);
            throw error;
        }
    }

    // Generic CRUD operations with improved reliability
    async create(table, data) {
        const change = {
            id: Date.now(),
            table,
            operation: 'create',
            data: { ...data },
            timestamp: new Date().toISOString()
        };
        
        this.logChange(change);
        
        let result = null;
        let errors = [];
        
        // Try all available databases
        const databases = [
            { name: 'IndexedDB', method: () => this.createIndexedDB(table, data), available: !!this.indexedDB },
            { name: 'SQLite', method: () => this.createSQLite(table, data), available: !!this.sqlite },
            { name: 'MySQL', method: () => this.createMySQL(table, data), available: this.mysql?.connected }
        ];
        
        for (const db of databases) {
            if (db.available) {
                try {
                    const dbResult = await db.method();
                    if (dbResult !== null && dbResult !== undefined) {
                        if (!result) result = dbResult;
                        console.log(`${db.name} create successful:`, table, dbResult);
                    }
                } catch (error) {
                    console.error(`${db.name} create failed:`, error);
                    errors.push(`${db.name}: ${error.message}`);
                }
            }
        }
        
        if (result !== null) {
            console.log('Create operation successful:', table, result);
            return result;
        } else {
            const errorMessage = `All database operations failed: ${errors.join(', ')}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async read(table, conditions = {}) {
        try {
            // Try databases in order of preference
            if (this.mysql && this.mysql.connected) {
                const mysqlData = await this.readMySQL(table, conditions);
                if (mysqlData.length > 0) return mysqlData;
            }
            
            if (this.sqlite) {
                const sqliteData = await this.readSQLite(table, conditions);
                if (sqliteData.length > 0) return sqliteData;
            }
            
            if (this.indexedDB) {
                return await this.readIndexedDB(table, conditions);
            }
            
            return [];
        } catch (error) {
            console.error('Read operation failed:', error);
            return [];
        }
    }

    async update(table, id, data) {
        const change = {
            id: Date.now(),
            table,
            operation: 'update',
            data: { id, ...data },
            timestamp: new Date().toISOString()
        };
        
        this.logChange(change);
        
        let success = false;
        let errors = [];
        
        // Try all available databases
        const databases = [
            { name: 'IndexedDB', method: () => this.updateIndexedDB(table, id, data), available: !!this.indexedDB },
            { name: 'SQLite', method: () => this.updateSQLite(table, id, data), available: !!this.sqlite },
            { name: 'MySQL', method: () => this.updateMySQL(table, id, data), available: this.mysql?.connected }
        ];
        
        for (const db of databases) {
            if (db.available) {
                try {
                    await db.method();
                    success = true;
                    console.log(`${db.name} update successful:`, table, id);
                } catch (error) {
                    console.error(`${db.name} update failed:`, error);
                    errors.push(`${db.name}: ${error.message}`);
                }
            }
        }
        
        if (success) {
            console.log('Update operation successful:', table, id);
            return true;
        } else {
            const errorMessage = `All database operations failed: ${errors.join(', ')}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async delete(table, id) {
        const change = {
            id: Date.now(),
            table,
            operation: 'delete',
            data: { id },
            timestamp: new Date().toISOString()
        };
        
        this.logChange(change);
        
        let success = false;
        let errors = [];
        
        // Try all available databases
        const databases = [
            { name: 'IndexedDB', method: () => this.deleteIndexedDB(table, id), available: !!this.indexedDB },
            { name: 'SQLite', method: () => this.deleteSQLite(table, id), available: !!this.sqlite },
            { name: 'MySQL', method: () => this.deleteMySQL(table, id), available: this.mysql?.connected }
        ];
        
        for (const db of databases) {
            if (db.available) {
                try {
                    await db.method();
                    success = true;
                    console.log(`${db.name} delete successful:`, table, id);
                } catch (error) {
                    console.error(`${db.name} delete failed:`, error);
                    errors.push(`${db.name}: ${error.message}`);
                }
            }
        }
        
        if (success) {
            console.log('Delete operation successful:', table, id);
            return true;
        } else {
            const errorMessage = `All database operations failed: ${errors.join(', ')}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    // Change logging and synchronization
    logChange(change) {
        this.changeLog.push(change);
        // Keep only last 1000 changes to prevent localStorage overflow
        if (this.changeLog.length > 1000) {
            this.changeLog = this.changeLog.slice(-1000);
        }
        localStorage.setItem('changeLog', JSON.stringify(this.changeLog));
        console.log('Change logged:', change);
    }

    async syncDatabases() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        
        // Update sync indicator safely
        try {
            if (window.app && typeof window.app.updateSyncIndicator === 'function') {
                window.app.updateSyncIndicator('syncing');
            }
        } catch (error) {
            console.error('Error updating sync indicator:', error);
        }
        
        try {
            // Get data from all databases
            const tables = ['menu', 'orders', 'inventory', 'purchases', 'expenses', 'menu_ingredients'];
            
            for (const table of tables) {
                await this.syncTable(table);
            }
            
            this.lastSync = new Date().toISOString();
            localStorage.setItem('lastSync', this.lastSync);
            
            // Update sync indicator to show success
            try {
                if (window.app && typeof window.app.updateSyncIndicator === 'function') {
                    window.app.updateSyncIndicator('success');
                }
                if (window.app && typeof window.app.updateSyncReport === 'function') {
                    window.app.updateSyncReport();
                }
            } catch (error) {
                console.error('Error updating sync status:', error);
            }
            
            console.log('Database synchronization completed successfully');
        } catch (error) {
            console.error('Sync failed:', error);
            
            // Update sync indicator to show error
            try {
                if (window.app && typeof window.app.updateSyncIndicator === 'function') {
                    window.app.updateSyncIndicator('error');
                }
            } catch (indicatorError) {
                console.error('Error updating sync indicator after error:', indicatorError);
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncTable(table) {
        try {
            // Get data from each available database
            const indexedDBData = this.indexedDB ? await this.readIndexedDB(table) : [];
            const sqliteData = this.sqlite ? await this.readSQLite(table) : [];
            const mysqlData = (this.mysql && this.mysql.connected) ? await this.readMySQL(table) : [];
            
            // Use the database with the most data as the source of truth
            let masterData = indexedDBData;
            if (sqliteData.length > masterData.length) masterData = sqliteData;
            if (mysqlData.length > masterData.length) masterData = mysqlData;
            
            // Sync to other databases if they have less data
            if (this.indexedDB && indexedDBData.length < masterData.length) {
                for (const item of masterData) {
                    if (!indexedDBData.find(existing => existing.id === item.id)) {
                        await this.createIndexedDB(table, item);
                    }
                }
            }
            
            if (this.sqlite && sqliteData.length < masterData.length) {
                for (const item of masterData) {
                    if (!sqliteData.find(existing => existing.id === item.id)) {
                        await this.createSQLite(table, item);
                    }
                }
            }
            
            if (this.mysql && this.mysql.connected && mysqlData.length < masterData.length) {
                for (const item of masterData) {
                    if (!mysqlData.find(existing => existing.id === item.id)) {
                        await this.createMySQL(table, item);
                    }
                }
            }
            
            console.log(`Table ${table} synchronized successfully`);
        } catch (error) {
            console.error(`Error syncing table ${table}:`, error);
        }
    }

    updateSyncStatus(status = 'idle') {
        // This method is kept for compatibility but status updates are handled elsewhere
        console.log('Sync status:', status);
    }

    showNotification(message, type = 'info') {
        if (window.app && typeof window.app.showNotification === 'function') {
            window.app.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Data export/import with enhanced format
    async exportData() {
        try {
            const data = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: '2.0',
                    databases: {
                        mysql: this.mysql?.connected || false,
                        sqlite: !!this.sqlite,
                        indexedDB: !!this.indexedDB
                    }
                },
                tables: {
                    menu: await this.read('menu'),
                    orders: await this.read('orders'),
                    inventory: await this.read('inventory'),
                    purchases: await this.read('purchases'),
                    expenses: await this.read('expenses'),
                    menu_ingredients: await this.read('menu_ingredients')
                },
                changeLog: this.changeLog,
                lastSync: this.lastSync
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `restaurant-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Dados exportados com sucesso!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Erro ao exportar dados', 'error');
        }
    }

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                // Validate import data
                if (!data.tables) {
                    throw new Error('Formato de arquivo inválido');
                }
                
                // Clear existing data
                await this.clearAllData();
                
                // Import tables
                const tables = ['inventory', 'menu', 'menu_ingredients', 'orders', 'purchases', 'expenses'];
                
                for (const table of tables) {
                    if (data.tables[table]) {
                        for (const item of data.tables[table]) {
                            await this.create(table, item);
                        }
                    }
                }
                
                // Restore change log if available
                if (data.changeLog) {
                    this.changeLog = data.changeLog;
                    localStorage.setItem('changeLog', JSON.stringify(this.changeLog));
                }
                
                // Restore last sync time if available
                if (data.lastSync) {
                    this.lastSync = data.lastSync;
                    localStorage.setItem('lastSync', this.lastSync);
                }
                
                this.showNotification('Dados importados com sucesso!', 'success');
                
                // Refresh the current view
                if (window.app && typeof window.app.refreshCurrentSection === 'function') {
                    window.app.refreshCurrentSection();
                }
            } catch (error) {
                console.error('Import failed:', error);
                this.showNotification('Erro ao importar dados: ' + error.message, 'error');
            }
        };
        
        input.click();
    }

    async clearAllData() {
        const tables = ['menu', 'orders', 'inventory', 'purchases', 'expenses', 'menu_ingredients'];
        
        for (const table of tables) {
            try {
                // Clear IndexedDB
                if (this.indexedDB) {
                    const transaction = this.indexedDB.transaction([table], 'readwrite');
                    const store = transaction.objectStore(table);
                    await new Promise((resolve, reject) => {
                        const request = store.clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }
                
                // Clear SQLite
                if (this.sqlite) {
                    this.sqlite.run(`DELETE FROM ${table}`);
                    this.saveSQLiteToStorage();
                }
                
                // Clear MySQL
                if (this.mysql && this.mysql.connected) {
                    await this.deleteMySQL(`DELETE FROM ${table}`, []);
                }
                
                console.log(`Cleared table: ${table}`);
            } catch (error) {
                console.error(`Error clearing table ${table}:`, error);
            }
        }
        
        // Clear change log
        this.changeLog = [];
        localStorage.removeItem('changeLog');
        localStorage.removeItem('lastSync');
        
        console.log('All data cleared successfully');
    }

    // Method to process stock deduction for orders
    async processStockDeduction(orderItems) {
        const stockMovements = [];
        
        for (const orderItem of orderItems) {
            try {
                // Get menu ingredients for this menu item
                const menuIngredients = await this.read('menu_ingredients', { menu_id: parseInt(orderItem.id) });
                
                for (const ingredient of menuIngredients) {
                    const quantityToDeduct = ingredient.quantity_needed * orderItem.quantity;
                    
                    // Get current inventory item
                    const inventoryItems = await this.read('inventory', { id: ingredient.inventory_id });
                    if (inventoryItems.length > 0) {
                        const inventoryItem = inventoryItems[0];
                        const newQuantity = Math.max(0, inventoryItem.quantity - quantityToDeduct);
                        
                        // Update inventory
                        await this.update('inventory', ingredient.inventory_id, { quantity: newQuantity });
                        
                        stockMovements.push({
                            inventoryId: ingredient.inventory_id,
                            itemName: inventoryItem.name,
                            oldQuantity: inventoryItem.quantity,
                            deducted: quantityToDeduct,
                            newQuantity: newQuantity,
                            unit: inventoryItem.unit,
                            menuItem: orderItem.name
                        });
                    }
                }
            } catch (error) {
                console.error('Error processing stock deduction for item:', orderItem, error);
            }
        }
        
        return stockMovements;
    }
}

// Initialize global database manager
window.db = new DatabaseManager();