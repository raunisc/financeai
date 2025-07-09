class DatabaseManager {
    constructor() {
        this.storageKeys = {
            transactions: 'financeManager_transactions',
            bills: 'financeManager_bills',
            settings: 'financeManager_settings'
        };
        this.init();
    }

    init() {
        // Initialize storage if not exists
        if (!localStorage.getItem(this.storageKeys.transactions)) {
            localStorage.setItem(this.storageKeys.transactions, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.storageKeys.bills)) {
            localStorage.setItem(this.storageKeys.bills, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.storageKeys.settings)) {
            localStorage.setItem(this.storageKeys.settings, JSON.stringify({}));
        }
    }

    async loadTransactions() {
        try {
            const data = localStorage.getItem(this.storageKeys.transactions);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading transactions:', error);
            return [];
        }
    }

    async saveTransactions(transactions) {
        try {
            localStorage.setItem(this.storageKeys.transactions, JSON.stringify(transactions));
            return true;
        } catch (error) {
            console.error('Error saving transactions:', error);
            return false;
        }
    }

    async loadBills() {
        try {
            const data = localStorage.getItem(this.storageKeys.bills);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading bills:', error);
            return [];
        }
    }

    async saveBills(bills) {
        try {
            localStorage.setItem(this.storageKeys.bills, JSON.stringify(bills));
            return true;
        } catch (error) {
            console.error('Error saving bills:', error);
            return false;
        }
    }

    async loadSettings() {
        try {
            const data = localStorage.getItem(this.storageKeys.settings);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading settings:', error);
            return {};
        }
    }

    async saveSettings(settings) {
        try {
            localStorage.setItem(this.storageKeys.settings, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    async exportData() {
        try {
            const transactions = await this.loadTransactions();
            const bills = await this.loadBills();
            const settings = await this.loadSettings();
            
            const exportData = {
                transactions,
                bills,
                settings,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `finance-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Error exporting data:', error);
            return false;
        }
    }

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validate data structure
            if (!data.transactions || !data.bills || !data.settings) {
                throw new Error('Invalid backup file format');
            }
            
            // Save imported data
            await this.saveTransactions(data.transactions);
            await this.saveBills(data.bills);
            await this.saveSettings(data.settings);
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    async clearAllData() {
        try {
            localStorage.removeItem(this.storageKeys.transactions);
            localStorage.removeItem(this.storageKeys.bills);
            localStorage.removeItem(this.storageKeys.settings);
            this.init();
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    getStorageInfo() {
        try {
            const transactions = localStorage.getItem(this.storageKeys.transactions);
            const bills = localStorage.getItem(this.storageKeys.bills);
            const settings = localStorage.getItem(this.storageKeys.settings);
            
            const transactionsSize = transactions ? new Blob([transactions]).size : 0;
            const billsSize = bills ? new Blob([bills]).size : 0;
            const settingsSize = settings ? new Blob([settings]).size : 0;
            
            const totalSize = transactionsSize + billsSize + settingsSize;
            const transactionsCount = transactions ? JSON.parse(transactions).length : 0;
            const billsCount = bills ? JSON.parse(bills).length : 0;
            
            return {
                totalSize: this.formatBytes(totalSize),
                transactionsCount,
                billsCount,
                lastBackup: localStorage.getItem('financeManager_lastBackup') || 'Nunca'
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return {
                totalSize: 'Erro',
                transactionsCount: 0,
                billsCount: 0,
                lastBackup: 'Erro'
            };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Auto-backup functionality
    async createAutoBackup() {
        try {
            const transactions = await this.loadTransactions();
            const bills = await this.loadBills();
            const settings = await this.loadSettings();
            
            const backupData = {
                transactions,
                bills,
                settings,
                backupDate: new Date().toISOString()
            };
            
            localStorage.setItem('financeManager_autoBackup', JSON.stringify(backupData));
            localStorage.setItem('financeManager_lastBackup', new Date().toLocaleString('pt-BR'));
            
            return true;
        } catch (error) {
            console.error('Error creating auto backup:', error);
            return false;
        }
    }

    async restoreAutoBackup() {
        try {
            const backupData = localStorage.getItem('financeManager_autoBackup');
            if (!backupData) return false;
            
            const data = JSON.parse(backupData);
            
            await this.saveTransactions(data.transactions);
            await this.saveBills(data.bills);
            await this.saveSettings(data.settings);
            
            return true;
        } catch (error) {
            console.error('Error restoring auto backup:', error);
            return false;
        }
    }
}