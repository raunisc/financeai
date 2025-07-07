class StorageManager {
    constructor() {
        this.dbName = 'FinanceAI_DB';
        this.dbVersion = 1;
        this.db = null;
        this.isIndexedDBSupported = this.checkIndexedDBSupport();
        this.initializeDB();
    }

    checkIndexedDBSupport() {
        return 'indexedDB' in window;
    }

    async initializeDB() {
        if (!this.isIndexedDBSupport) {
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

    async saveData(storeName, data) {
        try {
            // Try IndexedDB first
            if (this.isIndexedDBSupported && this.db) {
                return await this.saveToIndexedDB(storeName, data);
            }
            
            // Fallback to localStorage
            return this.saveToLocalStorage(storeName, data);
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            // Fallback to localStorage on any IndexedDB error
            return this.saveToLocalStorage(storeName, data);
        }
    }

    async loadData(storeName) {
        try {
            // Try IndexedDB first
            if (this.isIndexedDBSupported && this.db) {
                const data = await this.loadFromIndexedDB(storeName);
                if (data && data.length > 0) {
                    return data;
                }
            }
            
            // Fallback to localStorage
            return this.loadFromLocalStorage(storeName);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Fallback to localStorage on any IndexedDB error
            return this.loadFromLocalStorage(storeName);
        }
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
                storageType: this.isIndexedDBSupported && this.db ? 'IndexedDB' : 'localStorage',
                lastUpdate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erro ao obter informações de armazenamento:', error);
            return {
                bills: 0,
                invoices: 0,
                revenues: 0,
                storageType: 'Erro',
                lastUpdate: new Date().toISOString()
            };
        }
    }
}