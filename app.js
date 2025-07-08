class FinanceManager {
    constructor() {
        this.data = {
            income: JSON.parse(localStorage.getItem('income') || '[]'),
            expenses: JSON.parse(localStorage.getItem('expenses') || '[]'),
            bills: JSON.parse(localStorage.getItem('bills') || '[]'),
            cards: JSON.parse(localStorage.getItem('cards') || '[]')
        };
        
        this.charts = {};
        this.db = null;
        this.currentTransactionPage = 0;
        this.transactionsPerPage = 4;
        this.isLoading = false;
        this.loadingStates = new Set();
        this.validationRules = this.initValidationRules();
        this.retryAttempts = 0;
        this.maxRetryAttempts = 3;
        this.init();
    }

    initValidationRules() {
        return {
            required: (value) => value !== null && value !== undefined && value !== '',
            number: (value) => !isNaN(value) && value > 0,
            date: (value) => !isNaN(new Date(value).getTime()),
            maxLength: (value, max) => value.length <= max,
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        };
    }

    validateField(value, rules) {
        const errors = [];
        
        if (rules.required && !this.validationRules.required(value)) {
            errors.push('Este campo é obrigatório');
        }
        
        if (rules.number && value !== '' && !this.validationRules.number(value)) {
            errors.push('Deve ser um número válido maior que zero');
        }
        
        if (rules.date && value !== '' && !this.validationRules.date(value)) {
            errors.push('Data inválida');
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`Máximo ${rules.maxLength} caracteres`);
        }
        
        return errors;
    }

    showFieldError(fieldId, errors) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        if (errors.length > 0) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = errors[0];
            field.parentElement.appendChild(errorDiv);
        } else {
            field.classList.remove('error');
        }
    }

    clearFieldErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        form.querySelectorAll('.field-error').forEach(error => error.remove());
        form.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
    }

    showLoading(elementId) {
        this.loadingStates.add(elementId);
        const element = document.getElementById(elementId);
        if (element) {
            element.style.opacity = '0.6';
            element.style.pointerEvents = 'none';
        }
    }

    hideLoading(elementId) {
        this.loadingStates.delete(elementId);
        const element = document.getElementById(elementId);
        if (element) {
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast with animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto-hide toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, type === 'error' ? 5000 : 3000);
        
        // Allow manual dismissal
        toast.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    init() {
        try {
            this.initDatabase();
            this.setupNavigation();
            this.setupModals();
            this.setupForms();
            this.setupFilters();
            this.setupBackupSystem();
            this.setupKeyboardShortcuts();
            this.setupMobileMenu();
            this.setupErrorHandling();
            this.loadDashboard();
            this.updateAllTables();
            this.generateInsights();
            this.populateFilters();
            this.setupResponsiveHandlers();
            this.setupAccessibility();
            this.showToast('Sistema inicializado com sucesso!');
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.handleInitializationError(error);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'i':
                        e.preventDefault();
                        this.openIncomeModal();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.openExpenseModal();
                        break;
                    case 'b':
                        e.preventDefault();
                        this.openBillModal();
                        break;
                    case 'c':
                        e.preventDefault();
                        this.openCardModal();
                        break;
                    case 's':
                        e.preventDefault();
                        this.exportData();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    setupResponsiveHandlers() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    handleResize() {
        // Redraw charts on resize with debouncing
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    try {
                        chart.resize();
                    } catch (error) {
                        console.error('Error resizing chart:', error);
                    }
                }
            });
        }, 100);
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    async initDatabase() {
        try {
            // Initialize IndexedDB for local backup
            const request = indexedDB.open('FinanceDB', 1);
            
            request.onerror = () => {
                console.error('Database failed to open');
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('income')) {
                    db.createObjectStore('income', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('expenses')) {
                    db.createObjectStore('expenses', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('bills')) {
                    db.createObjectStore('bills', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('cards')) {
                    db.createObjectStore('cards', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('backups')) {
                    const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
                    backupStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        } catch (error) {
            console.error('Database initialization error:', error);
        }
    }

    setupBackupSystem() {
        // Auto backup every 5 minutes
        setInterval(() => {
            this.createAutoBackup();
        }, 5 * 60 * 1000);
        
        // Backup on page unload
        window.addEventListener('beforeunload', () => {
            this.createAutoBackup();
        });
    }

    async createAutoBackup() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['backups'], 'readwrite');
            const store = transaction.objectStore('backups');
            
            const backup = {
                timestamp: new Date().toISOString(),
                data: JSON.stringify(this.data),
                type: 'auto',
                version: '1.0'
            };
            
            await store.add(backup);
            
            // Keep only last 20 backups instead of 10
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
                const backups = getAllRequest.result;
                if (backups.length > 20) {
                    const oldestBackups = backups.slice(0, backups.length - 20);
                    oldestBackups.forEach(backup => {
                        store.delete(backup.id);
                    });
                }
            };
        } catch (error) {
            console.error('Auto backup error:', error);
        }
    }

    async saveToDatabase(storeName, data) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Clear existing data
            await store.clear();
            
            // Add new data
            for (const item of data) {
                await store.add(item);
            }
        } catch (error) {
            console.error(`Error saving to ${storeName}:`, error);
        }
    }

    exportData() {
        const exportData = {
            ...this.data,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `financas-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate data structure
                if (importedData.income && importedData.expenses && importedData.bills && importedData.cards) {
                    if (confirm('Tem certeza que deseja importar os dados? Isso substituirá todos os dados atuais.')) {
                        this.data = {
                            income: importedData.income || [],
                            expenses: importedData.expenses || [],
                            bills: importedData.bills || [],
                            cards: importedData.cards || []
                        };
                        
                        this.saveData();
                        this.updateAllTables();
                        this.loadDashboard();
                        this.generateInsights();
                        
                        alert('Dados importados com sucesso!');
                    }
                } else {
                    alert('Arquivo inválido. Verifique se é um backup válido.');
                }
            } catch (error) {
                alert('Erro ao importar arquivo. Verifique se o formato está correto.');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.dataset.page;
                this.showPage(pageId);
                
                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }
    
    showPage(pageId) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        
        // Load page-specific content
        switch(pageId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'insights':
                this.generateInsights();
                break;
        }
    }
    
    setupModals() {
        // Modal open/close functionality with improved animations
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.close');
            closeBtn.addEventListener('click', () => {
                this.closeModal(modal.id);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // Bill duplicates checkbox
        const billHasDuplicates = document.getElementById('billHasDuplicates');
        const duplicatesSection = document.getElementById('duplicatesSection');
        if (billHasDuplicates && duplicatesSection) {
            billHasDuplicates.addEventListener('change', () => {
                duplicatesSection.style.display = billHasDuplicates.checked ? 'block' : 'none';
            });
        }
        
        // Card type selection
        const cardType = document.getElementById('cardType');
        const installmentSection = document.getElementById('installmentSection');
        if (cardType && installmentSection) {
            cardType.addEventListener('change', () => {
                installmentSection.style.display = cardType.value === 'installment' ? 'block' : 'none';
            });
        }
    }
    
    setupForms() {
        // Income form
        document.getElementById('incomeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addIncome();
        });
        
        // Expense form
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });
        
        // Bill form
        document.getElementById('billForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBill();
        });
        
        // Card form
        document.getElementById('cardForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCard();
        });
        
        // Upcoming modal filter
        const upcomingFilter = document.getElementById('upcomingFilter');
        if (upcomingFilter) {
            upcomingFilter.addEventListener('change', () => {
                this.loadUpcomingItems();
            });
        }
    }
    
    setupFilters() {
        // Search and filter functionality
        const searchInputs = ['incomeSearch', 'expenseSearch'];
        searchInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    const type = inputId.replace('Search', '');
                    this.filterTable(type);
                });
            }
        });
        
        const filterSelects = ['incomeFilter', 'expenseFilter'];
        filterSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.addEventListener('change', () => {
                    const type = selectId.replace('Filter', '');
                    this.filterTable(type);
                });
            }
        });
        
        // Dashboard filters
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');
        
        if (monthFilter && yearFilter) {
            monthFilter.addEventListener('change', () => this.loadDashboard());
            yearFilter.addEventListener('change', () => this.loadDashboard());
        }
    }
    
    addIncome() {
        const form = document.getElementById('incomeForm');
        this.clearFieldErrors('incomeForm');
        
        const description = document.getElementById('incomeDescription').value.trim();
        const amount = parseFloat(document.getElementById('incomeAmount').value);
        const date = document.getElementById('incomeDate').value;
        const category = document.getElementById('incomeCategory').value;
        
        // Validation
        let hasErrors = false;
        
        const descriptionErrors = this.validateField(description, { required: true, maxLength: 100 });
        if (descriptionErrors.length > 0) {
            this.showFieldError('incomeDescription', descriptionErrors);
            hasErrors = true;
        }
        
        const amountErrors = this.validateField(amount, { required: true, number: true });
        if (amountErrors.length > 0) {
            this.showFieldError('incomeAmount', amountErrors);
            hasErrors = true;
        }
        
        const dateErrors = this.validateField(date, { required: true, date: true });
        if (dateErrors.length > 0) {
            this.showFieldError('incomeDate', dateErrors);
            hasErrors = true;
        }
        
        if (hasErrors) return;
        
        try {
            const income = {
                id: Date.now() + Math.random(),
                description,
                amount,
                date,
                category,
                status: 'received',
                createdAt: new Date().toISOString()
            };
            
            this.data.income.push(income);
            this.saveData();
            this.updateIncomeTable();
            this.loadDashboard();
            this.closeModal('incomeModal');
            form.reset();
            this.showToast('Receita adicionada com sucesso!');
        } catch (error) {
            console.error('Erro ao adicionar receita:', error);
            this.showToast('Erro ao adicionar receita. Tente novamente.', 'error');
        }
    }
    
    addExpense() {
        const form = document.getElementById('expenseForm');
        this.clearFieldErrors('expenseForm');
        
        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const date = document.getElementById('expenseDate').value;
        const category = document.getElementById('expenseCategory').value;
        
        // Validation
        let hasErrors = false;
        
        const descriptionErrors = this.validateField(description, { required: true, maxLength: 100 });
        if (descriptionErrors.length > 0) {
            this.showFieldError('expenseDescription', descriptionErrors);
            hasErrors = true;
        }
        
        const amountErrors = this.validateField(amount, { required: true, number: true });
        if (amountErrors.length > 0) {
            this.showFieldError('expenseAmount', amountErrors);
            hasErrors = true;
        }
        
        const dateErrors = this.validateField(date, { required: true, date: true });
        if (dateErrors.length > 0) {
            this.showFieldError('expenseDate', dateErrors);
            hasErrors = true;
        }
        
        if (hasErrors) return;
        
        try {
            const expense = {
                id: Date.now() + Math.random(),
                description,
                amount,
                date,
                category,
                status: 'paid',
                createdAt: new Date().toISOString()
            };
            
            this.data.expenses.push(expense);
            this.saveData();
            this.updateExpenseTable();
            this.loadDashboard();
            this.closeModal('expenseModal');
            form.reset();
            this.showToast('Despesa adicionada com sucesso!');
        } catch (error) {
            console.error('Erro ao adicionar despesa:', error);
            this.showToast('Erro ao adicionar despesa. Tente novamente.', 'error');
        }
    }
    
    addBill() {
        const form = document.getElementById('billForm');
        this.clearFieldErrors('billForm');
        
        const description = document.getElementById('billDescription').value.trim();
        const amount = parseFloat(document.getElementById('billAmount').value);
        const dueDate = document.getElementById('billDueDate').value;
        const hasDuplicates = document.getElementById('billHasDuplicates').checked;
        const duplicates = parseInt(document.getElementById('billDuplicates').value) || 1;
        const interval = parseInt(document.getElementById('billInterval').value) || 30;
        
        // Validation
        let hasErrors = false;
        
        const descriptionErrors = this.validateField(description, { required: true, maxLength: 100 });
        if (descriptionErrors.length > 0) {
            this.showFieldError('billDescription', descriptionErrors);
            hasErrors = true;
        }
        
        const amountErrors = this.validateField(amount, { required: true, number: true });
        if (amountErrors.length > 0) {
            this.showFieldError('billAmount', amountErrors);
            hasErrors = true;
        }
        
        const dateErrors = this.validateField(dueDate, { required: true, date: true });
        if (dateErrors.length > 0) {
            this.showFieldError('billDueDate', dateErrors);
            hasErrors = true;
        }
        
        if (hasDuplicates && (duplicates < 2 || duplicates > 12)) {
            this.showFieldError('billDuplicates', ['Número de parcelas deve ser entre 2 e 12']);
            hasErrors = true;
        }
        
        if (hasErrors) return;
        
        try {
            const baseId = Date.now();
            const numberOfBills = hasDuplicates ? duplicates : 1;
            
            for (let i = 0; i < numberOfBills; i++) {
                const bill = {
                    id: baseId + i + Math.random(),
                    description: hasDuplicates ? `${description} (${i + 1}/${duplicates})` : description,
                    amount,
                    dueDate: this.addDaysToDate(dueDate, i * interval),
                    status: 'pending',
                    duplicates: numberOfBills,
                    duplicateNumber: i + 1,
                    totalDuplicates: numberOfBills,
                    createdAt: new Date().toISOString()
                };
                
                this.data.bills.push(bill);
            }
            
            this.saveData();
            this.updateBillsTable();
            this.loadDashboard();
            this.closeModal('billModal');
            form.reset();
            this.showToast(`${numberOfBills} boleto(s) adicionado(s) com sucesso!`);
        } catch (error) {
            console.error('Erro ao adicionar boleto:', error);
            this.showToast('Erro ao adicionar boleto. Tente novamente.', 'error');
        }
    }
    
    addCard() {
        const form = document.getElementById('cardForm');
        this.clearFieldErrors('cardForm');
        
        const description = document.getElementById('cardDescription').value.trim();
        const amount = parseFloat(document.getElementById('cardAmount').value);
        const date = document.getElementById('cardDate').value;
        const cardType = document.getElementById('cardType').value;
        const installments = parseInt(document.getElementById('cardInstallments').value) || 1;
        
        // Validation
        let hasErrors = false;
        
        const descriptionErrors = this.validateField(description, { required: true, maxLength: 100 });
        if (descriptionErrors.length > 0) {
            this.showFieldError('cardDescription', descriptionErrors);
            hasErrors = true;
        }
        
        const amountErrors = this.validateField(amount, { required: true, number: true });
        if (amountErrors.length > 0) {
            this.showFieldError('cardAmount', amountErrors);
            hasErrors = true;
        }
        
        const dateErrors = this.validateField(date, { required: true, date: true });
        if (dateErrors.length > 0) {
            this.showFieldError('cardDate', dateErrors);
            hasErrors = true;
        }
        
        if (cardType === 'installment' && (installments < 2 || installments > 24)) {
            this.showFieldError('cardInstallments', ['Número de parcelas deve ser entre 2 e 24']);
            hasErrors = true;
        }
        
        if (hasErrors) return;
        
        try {
            const baseId = Date.now();
            const numberOfInstallments = cardType === 'installment' ? installments : 1;
            const installmentAmount = amount / numberOfInstallments;
            
            for (let i = 0; i < numberOfInstallments; i++) {
                // Use the exact date provided by user as base date
                const baseDate = new Date(date);
                // Add months for subsequent installments
                const dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
                
                const card = {
                    id: baseId + i + Math.random(),
                    description: numberOfInstallments > 1 ? `${description} (${i + 1}/${numberOfInstallments})` : description,
                    amount: installmentAmount,
                    date: dueDate.toISOString().split('T')[0],
                    dueDate: dueDate.toISOString().split('T')[0],
                    type: cardType,
                    installments: numberOfInstallments,
                    installmentNumber: i + 1,
                    totalInstallments: numberOfInstallments,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                };
                
                this.data.cards.push(card);
            }
            
            this.saveData();
            this.updateCardsTable();
            this.loadDashboard();
            this.closeModal('cardModal');
            form.reset();
            this.showToast(`${numberOfInstallments} parcela(s) de cartão adicionada(s) com sucesso!`);
        } catch (error) {
            console.error('Erro ao adicionar cartão:', error);
            this.showToast('Erro ao adicionar cartão. Tente novamente.', 'error');
        }
    }

    addDaysToDate(dateString, days) {
        const date = new Date(dateString);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
    
    updateIncomeTable() {
        const tbody = document.querySelector('#incomeTable tbody');
        tbody.innerHTML = '';
        
        this.data.income.forEach(income => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(income.date)}</td>
                <td>${income.description}</td>
                <td>${this.getCategoryName(income.category)}</td>
                <td class="text-success">R$ ${income.amount.toFixed(2)}</td>
                <td><span class="status-badge ${income.status}">${this.getStatusText(income.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="financeManager.editIncome(${income.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="financeManager.deleteIncome(${income.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    updateExpenseTable() {
        const tbody = document.querySelector('#expenseTable tbody');
        tbody.innerHTML = '';
        
        this.data.expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(expense.date)}</td>
                <td>${expense.description}</td>
                <td>${this.getCategoryName(expense.category)}</td>
                <td class="text-danger">R$ ${expense.amount.toFixed(2)}</td>
                <td><span class="status-badge ${expense.status}">${this.getStatusText(expense.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="financeManager.editExpense(${expense.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="financeManager.deleteExpense(${expense.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    updateBillsTable() {
        const tbody = document.querySelector('#billsTable tbody');
        tbody.innerHTML = '';
        
        this.data.bills.forEach(bill => {
            const row = document.createElement('tr');
            const duplicateText = bill.totalDuplicates > 1 ? 
                `${bill.duplicateNumber}/${bill.totalDuplicates}` : '-';
            
            row.innerHTML = `
                <td>${this.formatDate(bill.dueDate)}</td>
                <td>${bill.description}</td>
                <td class="text-danger">R$ ${bill.amount.toFixed(2)}</td>
                <td><span class="status-badge ${bill.status}">${this.getStatusText(bill.status)}</span></td>
                <td>${duplicateText}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="financeManager.payBill(${bill.id})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn delete" onclick="financeManager.deleteBill(${bill.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        this.updateBillsSummary();
    }
    
    updateCardsTable() {
        const tbody = document.querySelector('#cardsTable tbody');
        tbody.innerHTML = '';
        
        this.data.cards.forEach(card => {
            const row = document.createElement('tr');
            const installmentText = card.installments > 1 ? 
                `${card.installmentNumber}/${card.installments}` : 'À vista';
            
            row.innerHTML = `
                <td>${this.formatDate(card.date)}</td>
                <td>${card.description}</td>
                <td class="text-danger">R$ ${card.amount.toFixed(2)}</td>
                <td>${installmentText}</td>
                <td><span class="status-badge ${card.status}">${this.getStatusText(card.status)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="financeManager.payCard(${card.id})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn delete" onclick="financeManager.deleteCard(${card.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        this.updateCardsSummary();
    }
    
    updateBillsSummary() {
        const toExpire = this.data.bills.filter(bill => {
            const dueDate = new Date(bill.dueDate);
            const today = new Date();
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return bill.status === 'pending' && diffDays <= 7 && diffDays >= 0;
        }).reduce((sum, bill) => sum + bill.amount, 0);
        
        const overdue = this.data.bills.filter(bill => {
            const dueDate = new Date(bill.dueDate);
            const today = new Date();
            return bill.status === 'pending' && dueDate < today;
        }).reduce((sum, bill) => sum + bill.amount, 0);
        
        const paid = this.data.bills.filter(bill => bill.status === 'paid')
            .reduce((sum, bill) => sum + bill.amount, 0);
        
        document.getElementById('billsToExpire').textContent = `R$ ${toExpire.toFixed(2)}`;
        document.getElementById('billsOverdue').textContent = `R$ ${overdue.toFixed(2)}`;
        document.getElementById('billsPaid').textContent = `R$ ${paid.toFixed(2)}`;
    }
    
    updateCardsSummary() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const currentInvoice = this.data.cards.filter(card => {
            const cardDate = new Date(card.date);
            return cardDate.getMonth() === currentMonth && cardDate.getFullYear() === currentYear;
        }).reduce((sum, card) => sum + card.amount, 0);
        
        const installments = this.data.cards.filter(card => 
            card.installments > 1 && card.status === 'pending'
        ).reduce((sum, card) => sum + card.amount, 0);
        
        document.getElementById('currentInvoice').textContent = `R$ ${currentInvoice.toFixed(2)}`;
        document.getElementById('installments').textContent = `R$ ${installments.toFixed(2)}`;
        document.getElementById('availableLimit').textContent = `R$ ${(5000 - currentInvoice).toFixed(2)}`;
    }
    
    updateAllTables() {
        this.updateIncomeTable();
        this.updateExpenseTable();
        this.updateBillsTable();
        this.updateCardsTable();
    }
    
    loadDashboard() {
        this.updateDashboardCards();
        this.updateRecentTransactions();
        this.createCashFlowChart();
    }
    
    updateDashboardCards() {
        const totalIncome = this.data.income.reduce((sum, income) => sum + income.amount, 0);
        const totalExpenses = this.data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Include ALL bills as expenses (not just paid ones)
        const totalBills = this.data.bills.reduce((sum, bill) => sum + bill.amount, 0);
        
        // Include ALL card transactions as expenses
        const totalCards = this.data.cards.reduce((sum, card) => sum + card.amount, 0);
        
        const totalAllExpenses = totalExpenses + totalBills + totalCards;
        
        // Calculate upcoming due dates (next 7 days)
        const today = new Date();
        const upcomingItems = [];
        
        // Check bills
        this.data.bills.filter(bill => bill.status === 'pending').forEach(bill => {
            const dueDate = new Date(bill.dueDate);
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 7 && diffDays >= 0) {
                upcomingItems.push({
                    ...bill,
                    type: 'bill',
                    daysUntil: diffDays
                });
            }
        });
        
        // Check cards
        this.data.cards.filter(card => card.status === 'pending').forEach(card => {
            const dueDate = new Date(card.dueDate || card.date);
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 7 && diffDays >= 0) {
                upcomingItems.push({
                    ...card,
                    type: 'card',
                    daysUntil: diffDays
                });
            }
        });
        
        const upcomingAmount = upcomingItems.reduce((sum, item) => sum + item.amount, 0);
        const upcomingCount = upcomingItems.length;
        
        const balance = totalIncome - totalAllExpenses;
        
        document.getElementById('totalBalance').textContent = `R$ ${balance.toFixed(2)}`;
        document.getElementById('totalIncome').textContent = `R$ ${totalIncome.toFixed(2)}`;
        document.getElementById('totalExpenses').textContent = `R$ ${totalAllExpenses.toFixed(2)}`;
        document.getElementById('upcomingAmount').textContent = `R$ ${upcomingAmount.toFixed(2)}`;
        document.getElementById('upcomingCount').textContent = `${upcomingCount} próximos 7 dias`;
        
        // Update trends (simplified calculation)
        const balanceElement = document.getElementById('totalBalance');
        balanceElement.className = balance >= 0 ? 'card-value text-success' : 'card-value text-danger';
        
        // Store upcoming items for modal
        this.upcomingItems = upcomingItems;
    }
    
    updateRecentTransactions() {
        try {
            const allTransactions = [
                ...this.data.income.map(item => ({...item, type: 'income'})),
                ...this.data.expenses.map(item => ({...item, type: 'expense'})),
                ...this.data.bills.map(item => ({...item, type: 'bill', date: item.dueDate})),
                ...this.data.cards.map(item => ({...item, type: 'card', date: item.dueDate || item.date}))
            ];
            
            // Sort by priority: upcoming due dates first, then by date
            allTransactions.sort((a, b) => {
                const today = new Date();
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                
                // Calculate days until due date
                const daysUntilA = Math.ceil((dateA - today) / (1000 * 60 * 60 * 24));
                const daysUntilB = Math.ceil((dateB - today) / (1000 * 60 * 60 * 24));
                
                // Priority for bills and cards with upcoming due dates (next 7 days)
                const isUrgentA = (a.type === 'bill' || a.type === 'card') && a.status === 'pending' && daysUntilA >= 0 && daysUntilA <= 7;
                const isUrgentB = (b.type === 'bill' || b.type === 'card') && b.status === 'pending' && daysUntilB >= 0 && daysUntilB <= 7;
                
                // Priority for overdue items
                const isOverdueA = (a.type === 'bill' || a.type === 'card') && a.status === 'pending' && daysUntilA < 0;
                const isOverdueB = (b.type === 'bill' || b.type === 'card') && b.status === 'pending' && daysUntilB < 0;
                
                // Sort overdue items first, then urgent items, then by date
                if (isOverdueA && !isOverdueB) return -1;
                if (isOverdueB && !isOverdueA) return 1;
                if (isUrgentA && !isUrgentB) return -1;
                if (isUrgentB && !isUrgentA) return 1;
                
                // If both are urgent or both are normal, sort by date (newest first)
                return dateB - dateA;
            });
            
            const startIndex = this.currentTransactionPage * this.transactionsPerPage;
            const endIndex = startIndex + this.transactionsPerPage;
            const pageTransactions = allTransactions.slice(startIndex, endIndex);
            
            const container = document.getElementById('recentTransactions');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (pageTransactions.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">Nenhuma transação encontrada</p>';
                return;
            }
            
            pageTransactions.forEach(transaction => {
                const div = document.createElement('div');
                div.className = 'transaction-item';
                
                // Check if item is urgent or overdue
                const today = new Date();
                const transactionDate = new Date(transaction.date);
                const daysUntil = Math.ceil((transactionDate - today) / (1000 * 60 * 60 * 24));
                const isOverdue = (transaction.type === 'bill' || transaction.type === 'card') && transaction.status === 'pending' && daysUntil < 0;
                const isUrgent = (transaction.type === 'bill' || transaction.type === 'card') && transaction.status === 'pending' && daysUntil >= 0 && daysUntil <= 7;
                
                if (isOverdue) {
                    div.classList.add('overdue');
                } else if (isUrgent) {
                    div.classList.add('urgent');
                }
                
                let iconClass = 'fas fa-arrow-up';
                let transactionClass = 'income';
                let amountPrefix = '+';
                
                if (transaction.type === 'expense' || transaction.type === 'bill' || transaction.type === 'card') {
                    iconClass = 'fas fa-arrow-down';
                    transactionClass = 'expense';
                    amountPrefix = '-';
                }
                
                // Special icons for bills and cards
                if (transaction.type === 'bill') {
                    iconClass = 'fas fa-file-invoice';
                } else if (transaction.type === 'card') {
                    iconClass = 'fas fa-credit-card';
                }
                
                // Add installment info for cards
                let installmentInfo = '';
                if (transaction.type === 'card' && transaction.totalInstallments > 1) {
                    installmentInfo = ` (${transaction.installmentNumber}/${transaction.totalInstallments})`;
                }
                
                // Add urgency indicator
                let urgencyIndicator = '';
                if (isOverdue) {
                    urgencyIndicator = ' <span class="urgency-badge overdue">VENCIDO</span>';
                } else if (isUrgent) {
                    urgencyIndicator = ` <span class="urgency-badge urgent">VENCE EM ${daysUntil} DIA${daysUntil > 1 ? 'S' : ''}</span>`;
                }
                
                div.innerHTML = `
                    <div class="transaction-info">
                        <div class="transaction-icon ${transactionClass}">
                            <i class="${iconClass}"></i>
                        </div>
                        <div class="transaction-details">
                            <h4>${transaction.description}${installmentInfo}${urgencyIndicator}</h4>
                            <p>${this.formatDate(transaction.date)}</p>
                        </div>
                    </div>
                    <div class="transaction-amount ${transaction.type === 'income' ? 'positive' : 'negative'}">
                        ${amountPrefix}R$ ${transaction.amount.toFixed(2)}
                    </div>
                `;
                container.appendChild(div);
            });
            
            // Update navigation buttons
            this.updateTransactionNavigation(allTransactions.length);
        } catch (error) {
            console.error('Erro ao atualizar transações recentes:', error);
            this.showToast('Erro ao carregar transações recentes', 'error');
        }
    }
    
    updateTransactionNavigation(totalTransactions) {
        const prevBtn = document.getElementById('prevTransactions');
        const nextBtn = document.getElementById('nextTransactions');
        
        if (prevBtn && nextBtn) {
            prevBtn.disabled = this.currentTransactionPage === 0;
            nextBtn.disabled = (this.currentTransactionPage + 1) * this.transactionsPerPage >= totalTransactions;
        }
    }
    
    previousTransactions() {
        if (this.currentTransactionPage > 0) {
            this.currentTransactionPage--;
            this.updateRecentTransactions();
        }
    }
    
    nextTransactions() {
        const allTransactions = [
            ...this.data.income.map(item => ({...item, type: 'income'})),
            ...this.data.expenses.map(item => ({...item, type: 'expense'})),
            ...this.data.bills.map(item => ({...item, type: 'bill', date: item.dueDate})),
            ...this.data.cards.map(item => ({...item, type: 'card', date: item.dueDate || item.date}))
        ];
        
        const maxPage = Math.ceil(allTransactions.length / this.transactionsPerPage) - 1;
        if (this.currentTransactionPage < maxPage) {
            this.currentTransactionPage++;
            this.updateRecentTransactions();
        }
    }
    
    loadReports() {
        this.createCategoryChart();
        this.createMonthlyChart();
        this.createYearlyChart();
        this.createExpenseTypeChart();
        this.createSpendingTrendChart();
        this.createBalanceChart();
        this.createPaymentStatusChart();
    }
    
    createCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;
        
        try {
            const chartCtx = ctx.getContext('2d');
            
            // Clear any existing chart
            if (this.charts.category) {
                this.charts.category.destroy();
                this.charts.category = null;
            }
            
            // Collect all expenses from different sources
            const categories = {};
            
            // Regular expenses
            this.data.expenses.forEach(expense => {
                const categoryName = this.getCategoryName(expense.category);
                categories[categoryName] = (categories[categoryName] || 0) + expense.amount;
            });
            
            // Bills (all bills, not just paid ones)
            this.data.bills.forEach(bill => {
                const categoryName = 'Boletos';
                categories[categoryName] = (categories[categoryName] || 0) + bill.amount;
            });
            
            // Card transactions (all transactions)
            this.data.cards.forEach(card => {
                const categoryName = 'Cartões';
                categories[categoryName] = (categories[categoryName] || 0) + card.amount;
            });
            
            const categoryKeys = Object.keys(categories);
            if (categoryKeys.length === 0) {
                this.showEmptyChart(chartCtx, 'Nenhuma despesa registrada');
                return;
            }
            
            const colors = [
                '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
                '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
                '#ec4899', '#6b7280', '#14b8a6', '#f472b6'
            ];
            
            this.charts.category = new Chart(chartCtx, {
                type: 'doughnut',
                data: {
                    labels: categoryKeys,
                    datasets: [{
                        data: Object.values(categories),
                        backgroundColor: colors.slice(0, categoryKeys.length),
                        borderWidth: 3,
                        borderColor: '#ffffff',
                        hoverOffset: 8,
                        hoverBorderWidth: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: {
                                    size: 12,
                                    family: 'Inter'
                                },
                                color: '#374151'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#e5e7eb',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return context.label + ': R$ ' + context.parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' (' + percentage + '%)';
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de categorias:', error);
            this.handleError(error, 'Erro ao carregar gráfico de categorias');
        }
    }

    createMonthlyChart() {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        
        try {
            const chartCtx = ctx.getContext('2d');
            
            // Clear any existing chart
            if (this.charts.monthly) {
                this.charts.monthly.destroy();
                this.charts.monthly = null;
            }
            
            const months = [];
            const incomeData = [];
            const expenseData = [];
            
            for (let i = 11; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                months.push(date.toLocaleDateString('pt-BR', { month: 'short' }));
                
                const year = date.getFullYear();
                const month = date.getMonth();
                
                // Calculate income for this month
                const monthIncome = this.data.income.filter(item => {
                    const itemDate = new Date(item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                // Calculate all expenses for this month
                const monthExpenses = this.data.expenses.filter(item => {
                    const itemDate = new Date(item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                // Include ALL bills for this month
                const monthBills = this.data.bills.filter(item => {
                    const itemDate = new Date(item.dueDate);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                // Include ALL card transactions for this month
                const monthCards = this.data.cards.filter(item => {
                    const itemDate = new Date(item.dueDate || item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                const totalExpenses = monthExpenses + monthBills + monthCards;
                
                incomeData.push(monthIncome);
                expenseData.push(totalExpenses);
            }
            
            this.charts.monthly = new Chart(chartCtx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Receitas',
                        data: incomeData,
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        borderSkipped: false,
                        hoverBackgroundColor: '#059669'
                    }, {
                        label: 'Despesas',
                        data: expenseData,
                        backgroundColor: '#ef4444',
                        borderRadius: 6,
                        borderSkipped: false,
                        hoverBackgroundColor: '#dc2626'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12,
                                    family: 'Inter'
                                },
                                color: '#374151'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#e5e7eb',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#6b7280',
                                font: {
                                    size: 11,
                                    family: 'Inter'
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(229, 231, 235, 0.5)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#6b7280',
                                font: {
                                    size: 11,
                                    family: 'Inter'
                                },
                                callback: function(value) {
                                    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico mensal:', error);
            this.handleError(error, 'Erro ao carregar gráfico mensal');
        }
    }

    createYearlyChart() {
        const ctx = document.getElementById('yearlyChart');
        if (!ctx) return;
        
        try {
            const chartCtx = ctx.getContext('2d');
            
            // Clear any existing chart
            if (this.charts.yearly) {
                this.charts.yearly.destroy();
                this.charts.yearly = null;
            }
            
            const currentYear = new Date().getFullYear();
            const years = [currentYear - 2, currentYear - 1, currentYear];
            const incomeData = [];
            const expenseData = [];
            
            years.forEach(year => {
                // Calculate income for this year
                const yearIncome = this.data.income.filter(item => {
                    const itemDate = new Date(item.date);
                    return itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                // Calculate all expenses for this year
                const yearExpenses = this.data.expenses.filter(item => {
                    const itemDate = new Date(item.date);
                    return itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                // Include ALL bills for this year
                const yearBills = this.data.bills.filter(item => {
                    const itemDate = new Date(item.dueDate);
                    return itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                // Include ALL card transactions for this year
                const yearCards = this.data.cards.filter(item => {
                    const itemDate = new Date(item.dueDate || item.date);
                    return itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                const totalExpenses = yearExpenses + yearBills + yearCards;
                
                incomeData.push(yearIncome);
                expenseData.push(totalExpenses);
            });
            
            this.charts.yearly = new Chart(chartCtx, {
                type: 'bar',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Receitas',
                        data: incomeData,
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        borderSkipped: false,
                        hoverBackgroundColor: '#059669'
                    }, {
                        label: 'Despesas',
                        data: expenseData,
                        backgroundColor: '#ef4444',
                        borderRadius: 6,
                        borderSkipped: false,
                        hoverBackgroundColor: '#dc2626'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12,
                                    family: 'Inter'
                                },
                                color: '#374151'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#e5e7eb',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#6b7280',
                                font: {
                                    size: 11,
                                    family: 'Inter'
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(229, 231, 235, 0.5)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#6b7280',
                                font: {
                                    size: 11,
                                    family: 'Inter'
                                },
                                callback: function(value) {
                                    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico anual:', error);
            this.handleError(error, 'Erro ao carregar gráfico anual');
        }
    }

    createExpenseTypeChart() {
        const ctx = document.getElementById('expenseTypeChart');
        if (!ctx) return;
        
        try {
            const chartCtx = ctx.getContext('2d');
            
            // Clear any existing chart
            if (this.charts.expenseType) {
                this.charts.expenseType.destroy();
                this.charts.expenseType = null;
            }
            
            // Calculate totals by type
            const regularExpenses = this.data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
            const billsExpenses = this.data.bills.reduce((sum, bill) => sum + bill.amount, 0);
            const cardExpenses = this.data.cards.reduce((sum, card) => sum + card.amount, 0);
            
            const data = {
                labels: ['Despesas Regulares', 'Boletos', 'Cartões'],
                datasets: [{
                    data: [regularExpenses, billsExpenses, cardExpenses],
                    backgroundColor: ['#3b82f6', '#ef4444', '#f59e0b'],
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverOffset: 8
                }]
            };
            
            if (regularExpenses === 0 && billsExpenses === 0 && cardExpenses === 0) {
                this.showEmptyChart(chartCtx, 'Nenhuma despesa registrada');
                return;
            }
            
            this.charts.expenseType = new Chart(chartCtx, {
                type: 'doughnut',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: {
                                    size: 12,
                                    family: 'Inter'
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return context.label + ': R$ ' + context.parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' (' + percentage + '%)';
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de gastos por tipo:', error);
        }
    }
    
    createSpendingTrendChart() {
        const ctx = document.getElementById('spendingTrendChart');
        if (!ctx) return;
        
        try {
            const chartCtx = ctx.getContext('2d');
            
            if (this.charts.spendingTrend) {
                this.charts.spendingTrend.destroy();
                this.charts.spendingTrend = null;
            }
            
            const months = [];
            const spendingData = [];
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                months.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
                
                const year = date.getFullYear();
                const month = date.getMonth();
                
                // Calculate total spending for this month
                const monthExpenses = this.data.expenses.filter(item => {
                    const itemDate = new Date(item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                const monthBills = this.data.bills.filter(item => {
                    const itemDate = new Date(item.dueDate);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                const monthCards = this.data.cards.filter(item => {
                    const itemDate = new Date(item.dueDate || item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                spendingData.push(monthExpenses + monthBills + monthCards);
            }
            
            this.charts.spendingTrend = new Chart(chartCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Gastos Totais',
                        data: spendingData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#ef4444',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Gastos: R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de tendência:', error);
        }
    }
    
    createBalanceChart() {
        const ctx = document.getElementById('balanceChart');
        if (!ctx) return;
        
        try {
            const chartCtx = ctx.getContext('2d');
            
            if (this.charts.balance) {
                this.charts.balance.destroy();
                this.charts.balance = null;
            }
            
            const months = [];
            const balanceData = [];
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                months.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
                
                const year = date.getFullYear();
                const month = date.getMonth();
                
                const monthIncome = this.data.income.filter(item => {
                    const itemDate = new Date(item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                const monthExpenses = this.data.expenses.filter(item => {
                    const itemDate = new Date(item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                const monthBills = this.data.bills.filter(item => {
                    const itemDate = new Date(item.dueDate);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                const monthCards = this.data.cards.filter(item => {
                    const itemDate = new Date(item.dueDate || item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                balanceData.push(monthIncome - (monthExpenses + monthBills + monthCards));
            }
            
            this.charts.balance = new Chart(chartCtx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Saldo Mensal',
                        data: balanceData,
                        backgroundColor: balanceData.map(value => value >= 0 ? '#10b981' : '#ef4444'),
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Saldo: R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de balanço:', error);
        }
    }
    
    createPaymentStatusChart() {
        const ctx = document.getElementById('paymentStatusChart');
        if (!ctx) return;
        
        try {
            const chartCtx = ctx.getContext('2d');
            
            if (this.charts.paymentStatus) {
                this.charts.paymentStatus.destroy();
                this.charts.paymentStatus = null;
            }
            
            const paidBills = this.data.bills.filter(bill => bill.status === 'paid').length;
            const pendingBills = this.data.bills.filter(bill => bill.status === 'pending').length;
            const paidCards = this.data.cards.filter(card => card.status === 'paid').length;
            const pendingCards = this.data.cards.filter(card => card.status === 'pending').length;
            
            this.charts.paymentStatus = new Chart(chartCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Boletos Pagos', 'Boletos Pendentes', 'Cartões Pagos', 'Cartões Pendentes'],
                    datasets: [{
                        data: [paidBills, pendingBills, paidCards, pendingCards],
                        backgroundColor: ['#10b981', '#ef4444', '#06b6d4', '#f59e0b'],
                        borderWidth: 3,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                usePointStyle: true,
                                font: {
                                    size: 11,
                                    family: 'Inter'
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.parsed + ' itens';
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de status de pagamentos:', error);
        }
    }

    showEmptyChart(ctx, message) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '16px Inter';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
    
    createCashFlowChart() {
        const ctx = document.getElementById('cashFlowChart');
        if (!ctx) return;
        
        try {
            const chartCtx = ctx.getContext('2d');
            
            // Clear any existing chart
            if (this.charts.cashFlow) {
                this.charts.cashFlow.destroy();
                this.charts.cashFlow = null;
            }
            
            // Get data for the last 12 months
            const months = [];
            const incomeData = [];
            const expenseData = [];
            
            for (let i = 11; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                months.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
                
                const year = date.getFullYear();
                const month = date.getMonth();
                
                // Calculate income for this month
                const monthIncome = this.data.income.filter(item => {
                    const itemDate = new Date(item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                // Calculate all expenses for this month
                const monthExpenses = this.data.expenses.filter(item => {
                    const itemDate = new Date(item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                // Include ALL bills for this month
                const monthBills = this.data.bills.filter(item => {
                    const itemDate = new Date(item.dueDate);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                // Include ALL card transactions for this month
                const monthCards = this.data.cards.filter(item => {
                    const itemDate = new Date(item.dueDate || item.date);
                    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
                }).reduce((sum, item) => sum + item.amount, 0);
                
                const totalExpenses = monthExpenses + monthBills + monthCards;
                
                incomeData.push(monthIncome);
                expenseData.push(totalExpenses);
            }
            
            this.charts.cashFlow = new Chart(chartCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Receitas',
                        data: incomeData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }, {
                        label: 'Despesas',
                        data: expenseData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#ef4444',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12,
                                    family: 'Inter'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#e5e7eb',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Período',
                                color: '#6b7280',
                                font: {
                                    size: 12,
                                    family: 'Inter'
                                }
                            },
                            grid: {
                                color: 'rgba(229, 231, 235, 0.5)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#6b7280',
                                font: {
                                    size: 11,
                                    family: 'Inter'
                                }
                            }
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Valor (R$)',
                                color: '#6b7280',
                                font: {
                                    size: 12,
                                    family: 'Inter'
                                }
                            },
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(229, 231, 235, 0.5)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#6b7280',
                                font: {
                                    size: 11,
                                    family: 'Inter'
                                },
                                callback: function(value) {
                                    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de fluxo de caixa:', error);
            this.handleError(error, 'Erro ao carregar gráfico de fluxo de caixa');
        }
    }
    
    generateInsights() {
        const spendingTrend = this.analyzeSpendingTrend();
        const savingsOpportunity = this.findSavingsOpportunity();
        const alerts = this.generateAlerts();
        const achievements = this.getAchievements();
        
        document.getElementById('spendingTrend').textContent = spendingTrend;
        document.getElementById('savingsOpportunity').textContent = savingsOpportunity;
        document.getElementById('alerts').textContent = alerts;
        document.getElementById('achievements').textContent = achievements;
    }
    
    analyzeSpendingTrend() {
        const currentMonth = new Date().getMonth();
        const lastMonth = currentMonth - 1;
        
        const currentExpenses = this.data.expenses.filter(expense => {
            const date = new Date(expense.date);
            return date.getMonth() === currentMonth;
        }).reduce((sum, expense) => sum + expense.amount, 0);
        
        const lastExpenses = this.data.expenses.filter(expense => {
            const date = new Date(expense.date);
            return date.getMonth() === lastMonth;
        }).reduce((sum, expense) => sum + expense.amount, 0);
        
        const diff = currentExpenses - lastExpenses;
        const percentage = lastExpenses > 0 ? ((diff / lastExpenses) * 100).toFixed(1) : 0;
        
        if (diff > 0) {
            return `Seus gastos aumentaram ${percentage}% em relação ao mês anterior. Fique atento!`;
        } else if (diff < 0) {
            return `Parabéns! Você reduziu seus gastos em ${Math.abs(percentage)}% este mês.`;
        } else {
            return `Seus gastos mantiveram-se estáveis em relação ao mês anterior.`;
        }
    }
    
    findSavingsOpportunity() {
        const categories = {};
        
        // Include all types of expenses
        this.data.expenses.forEach(expense => {
            const categoryName = this.getCategoryName(expense.category);
            categories[categoryName] = (categories[categoryName] || 0) + expense.amount;
        });
        
        // Include bills
        this.data.bills.forEach(bill => {
            const categoryName = 'Boletos';
            categories[categoryName] = (categories[categoryName] || 0) + bill.amount;
        });
        
        // Include cards
        this.data.cards.forEach(card => {
            const categoryName = 'Cartões';
            categories[categoryName] = (categories[categoryName] || 0) + card.amount;
        });
        
        const categoryKeys = Object.keys(categories);
        if (categoryKeys.length === 0) {
            return 'Adicione mais transações para receber recomendações personalizadas.';
        }
        
        const maxCategory = categoryKeys.reduce((a, b) => 
            categories[a] > categories[b] ? a : b
        );
        
        return `Sua maior categoria de gastos é ${maxCategory} (R$ ${categories[maxCategory].toFixed(2)}). Considere revisar estes gastos para economizar.`;
    }
    
    generateAlerts() {
        const alerts = [];
        
        // Check overdue bills
        const overdueBills = this.data.bills.filter(bill => {
            const dueDate = new Date(bill.dueDate);
            const today = new Date();
            return bill.status === 'pending' && dueDate < today;
        });
        
        if (overdueBills.length > 0) {
            alerts.push(`${overdueBills.length} boleto(s) vencido(s)`);
        }
        
        // Check overdue cards
        const overdueCards = this.data.cards.filter(card => {
            const dueDate = new Date(card.dueDate || card.date);
            const today = new Date();
            return card.status === 'pending' && dueDate < today;
        });
        
        if (overdueCards.length > 0) {
            alerts.push(`${overdueCards.length} cartão(ões) vencido(s)`);
        }
        
        // Check bills due soon
        const billsDueSoon = this.data.bills.filter(bill => {
            const dueDate = new Date(bill.dueDate);
            const today = new Date();
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return bill.status === 'pending' && diffDays <= 3 && diffDays >= 0;
        });
        
        if (billsDueSoon.length > 0) {
            alerts.push(`${billsDueSoon.length} boleto(s) vencendo em breve`);
        }
        
        // Check cards due soon
        const cardsDueSoon = this.data.cards.filter(card => {
            const dueDate = new Date(card.dueDate || card.date);
            const today = new Date();
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return card.status === 'pending' && diffDays <= 3 && diffDays >= 0;
        });
        
        if (cardsDueSoon.length > 0) {
            alerts.push(`${cardsDueSoon.length} cartão(ões) vencendo em breve`);
        }
        
        return alerts.length > 0 ? alerts.join(', ') : 'Nenhum alerta no momento.';
    }
    
    getAchievements() {
        const achievements = [];
        
        if (this.data.income.length >= 10) {
            achievements.push('10+ receitas registradas');
        }
        
        if (this.data.expenses.length >= 20) {
            achievements.push('20+ despesas registradas');
        }
        
        const totalIncome = this.data.income.reduce((sum, income) => sum + income.amount, 0);
        const totalExpenses = this.data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        if (totalIncome > totalExpenses) {
            achievements.push('Saldo positivo mantido');
        }
        
        return achievements.length > 0 ? achievements.join(', ') : 'Continue usando o sistema para desbloquear conquistas!';
    }
    
    populateFilters() {
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');
        
        if (monthFilter && yearFilter) {
            // Populate months
            const months = [
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ];
            
            months.forEach((month, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = month;
                monthFilter.appendChild(option);
            });
            
            // Populate years
            const currentYear = new Date().getFullYear();
            for (let year = currentYear - 2; year <= currentYear + 1; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            }
        }
    }
    
    filterTable(type) {
        const searchInput = document.getElementById(`${type}Search`);
        const filterSelect = document.getElementById(`${type}Filter`);
        
        if (!searchInput || !filterSelect) return;
        
        const searchTerm = searchInput.value.toLowerCase();
        const filterValue = filterSelect.value;
        
        const rows = document.querySelectorAll(`#${type}Table tbody tr`);
        let visibleCount = 0;
        
        rows.forEach(row => {
            const description = row.cells[1].textContent.toLowerCase();
            const category = row.cells[2].textContent.toLowerCase();
            
            const matchesSearch = description.includes(searchTerm);
            const matchesFilter = !filterValue || category.includes(this.getCategoryName(filterValue).toLowerCase());
            
            const isVisible = matchesSearch && matchesFilter;
            row.style.display = isVisible ? '' : 'none';
            
            if (isVisible) visibleCount++;
        });
        
        // Show "no results" message if needed
        const tableBody = document.querySelector(`#${type}Table tbody`);
        let noResultsRow = tableBody.querySelector('.no-results');
        
        if (visibleCount === 0 && rows.length > 0) {
            if (!noResultsRow) {
                noResultsRow = document.createElement('tr');
                noResultsRow.className = 'no-results';
                noResultsRow.innerHTML = `<td colspan="6" class="text-center text-muted">Nenhum resultado encontrado</td>`;
                tableBody.appendChild(noResultsRow);
            }
        } else if (noResultsRow) {
            noResultsRow.remove();
        }
    }
    
    // Utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }
    
    getCategoryName(category) {
        const categories = {
            salary: 'Salário',
            freelance: 'Freelance',
            investment: 'Investimento',
            housing: 'Moradia',
            food: 'Alimentação',
            transport: 'Transporte',
            health: 'Saúde',
            education: 'Educação',
            entertainment: 'Entretenimento',
            bills: 'Boletos',
            cards: 'Cartões',
            other: 'Outros'
        };
        return categories[category] || category;
    }
    
    getStatusText(status) {
        const statuses = {
            pending: 'Pendente',
            paid: 'Pago',
            received: 'Recebido'
        };
        return statuses[status] || status;
    }
    
    saveData() {
        localStorage.setItem('income', JSON.stringify(this.data.income));
        localStorage.setItem('expenses', JSON.stringify(this.data.expenses));
        localStorage.setItem('bills', JSON.stringify(this.data.bills));
        localStorage.setItem('cards', JSON.stringify(this.data.cards));
        
        // Save to IndexedDB as backup
        this.saveToDatabase('income', this.data.income);
        this.saveToDatabase('expenses', this.data.expenses);
        this.saveToDatabase('bills', this.data.bills);
        this.saveToDatabase('cards', this.data.cards);
    }
    
    // Action methods with improved error handling
    deleteIncome(id) {
        if (confirm('Tem certeza que deseja excluir esta receita?')) {
            try {
                this.data.income = this.data.income.filter(item => item.id !== id);
                this.saveData();
                this.updateIncomeTable();
                this.loadDashboard();
                this.showToast('Receita excluída com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir receita:', error);
                this.showToast('Erro ao excluir receita. Tente novamente.', 'error');
            }
        }
    }
    
    deleteExpense(id) {
        if (confirm('Tem certeza que deseja excluir esta despesa?')) {
            try {
                this.data.expenses = this.data.expenses.filter(item => item.id !== id);
                this.saveData();
                this.updateExpenseTable();
                this.loadDashboard();
                this.showToast('Despesa excluída com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir despesa:', error);
                this.showToast('Erro ao excluir despesa. Tente novamente.', 'error');
            }
        }
    }
    
    deleteBill(id) {
        if (confirm('Tem certeza que deseja excluir este boleto?')) {
            try {
                this.data.bills = this.data.bills.filter(item => item.id !== id);
                this.saveData();
                this.updateBillsTable();
                this.loadDashboard();
                this.showToast('Boleto excluído com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir boleto:', error);
                this.showToast('Erro ao excluir boleto. Tente novamente.', 'error');
            }
        }
    }
    
    deleteCard(id) {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            try {
                this.data.cards = this.data.cards.filter(item => item.id !== id);
                this.saveData();
                this.updateCardsTable();
                this.loadDashboard();
                this.showToast('Transação de cartão excluída com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir transação de cartão:', error);
                this.showToast('Erro ao excluir transação de cartão. Tente novamente.', 'error');
            }
        }
    }
    
    payBill(id) {
        try {
            const bill = this.data.bills.find(item => item.id === id);
            if (bill) {
                bill.status = 'paid';
                bill.paidAt = new Date().toISOString();
                this.saveData();
                this.updateBillsTable();
                this.loadDashboard();
                this.showToast('Boleto marcado como pago!');
            }
        } catch (error) {
            console.error('Erro ao marcar boleto como pago:', error);
            this.showToast('Erro ao marcar boleto como pago. Tente novamente.', 'error');
        }
    }
    
    payCard(id) {
        try {
            const card = this.data.cards.find(item => item.id === id);
            if (card) {
                card.status = 'paid';
                card.paidAt = new Date().toISOString();
                this.saveData();
                this.updateCardsTable();
                this.loadDashboard();
                this.showToast('Parcela de cartão marcada como paga!');
            }
        } catch (error) {
            console.error('Erro ao marcar cartão como pago:', error);
            this.showToast('Erro ao marcar cartão como pago. Tente novamente.', 'error');
        }
    }
    
    payFromUpcoming(type, id) {
        if (type === 'bill') {
            this.payBill(id);
        } else if (type === 'card') {
            this.payCard(id);
        }
        
        // Refresh the upcoming items list
        this.loadUpcomingItems();
        
        // Update dashboard
        this.updateDashboardCards();
    }
    
    loadUpcomingItems() {
        const filter = document.getElementById('upcomingFilter').value;
        const upcomingList = document.getElementById('upcomingList');
        
        if (!upcomingList) return;
        
        const today = new Date();
        let filteredItems = [];
        
        // Get all pending bills and cards
        const allItems = [
            ...this.data.bills.filter(bill => bill.status === 'pending').map(bill => ({
                ...bill,
                type: 'bill',
                date: bill.dueDate
            })),
            ...this.data.cards.filter(card => card.status === 'pending').map(card => ({
                ...card,
                type: 'card',
                date: card.dueDate || card.date
            }))
        ];
        
        // Apply filter
        allItems.forEach(item => {
            const itemDate = new Date(item.date);
            const diffTime = itemDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            item.daysUntil = diffDays;
            item.isOverdue = diffDays < 0;
            
            switch(filter) {
                case 'overdue':
                    if (diffDays < 0) filteredItems.push(item);
                    break;
                case 'today':
                    if (diffDays === 0) filteredItems.push(item);
                    break;
                case 'week':
                    if (diffDays >= 0 && diffDays <= 7) filteredItems.push(item);
                    break;
                case 'month':
                    if (diffDays >= 0 && diffDays <= 30) filteredItems.push(item);
                    break;
                default:
                    filteredItems.push(item);
            }
        });
        
        // Sort by due date (overdue first, then by date)
        filteredItems.sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            return new Date(a.date) - new Date(b.date);
        });
        
        // Render items
        upcomingList.innerHTML = '';
        
        if (filteredItems.length === 0) {
            upcomingList.innerHTML = '<div class="no-upcoming">Nenhum vencimento encontrado</div>';
            return;
        }
        
        filteredItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `upcoming-item ${item.isOverdue ? 'overdue' : ''}`;
            
            const typeIcon = item.type === 'bill' ? 'fas fa-file-invoice' : 'fas fa-credit-card';
            const typeText = item.type === 'bill' ? 'Boleto' : 'Cartão';
            
            let statusText = '';
            if (item.isOverdue) {
                statusText = `<span class="status-overdue">VENCIDO (${Math.abs(item.daysUntil)} dias)</span>`;
            } else if (item.daysUntil === 0) {
                statusText = '<span class="status-today">VENCE HOJE</span>';
            } else {
                statusText = `<span class="status-upcoming">Vence em ${item.daysUntil} dias</span>`;
            }
            
            itemDiv.innerHTML = `
                <div class="upcoming-item-content">
                    <div class="upcoming-item-info">
                        <div class="upcoming-item-header">
                            <i class="${typeIcon}"></i>
                            <span class="upcoming-item-type">${typeText}</span>
                            ${statusText}
                        </div>
                        <div class="upcoming-item-description">${item.description}</div>
                        <div class="upcoming-item-date">${this.formatDate(item.date)}</div>
                    </div>
                    <div class="upcoming-item-actions">
                        <div class="upcoming-item-amount">R$ ${item.amount.toFixed(2)}</div>
                        <button class="btn-pay" onclick="financeManager.payFromUpcoming('${item.type}', ${item.id})">
                            <i class="fas fa-check"></i> Pagar
                        </button>
                    </div>
                </div>
            `;
            
            upcomingList.appendChild(itemDiv);
        });
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            
            // Clear form errors
            const formId = modalId.replace('Modal', 'Form');
            this.clearFieldErrors(formId);
            
            // Reset form
            const form = document.getElementById(formId);
            if (form) {
                form.reset();
            }
        }
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
        }
    }

    openIncomeModal() {
        this.openModal('incomeModal');
        document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];
    }

    openExpenseModal() {
        this.openModal('expenseModal');
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    }

    openBillModal() {
        this.openModal('billModal');
        document.getElementById('billDueDate').value = new Date().toISOString().split('T')[0];
    }

    openCardModal() {
        this.openModal('cardModal');
        document.getElementById('cardDate').value = new Date().toISOString().split('T')[0];
    }

    openUpcomingModal() {
        this.openModal('upcomingModal');
        this.loadUpcomingItems();
    }

    exportReport() {
        this.exportData();
    }

    setupMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (mobileMenuToggle && sidebar) {
            mobileMenuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                const isOpen = sidebar.classList.contains('open');
                mobileMenuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
                mobileMenuToggle.innerHTML = `<i class="fas fa-${isOpen ? 'times' : 'bars'}"></i>`;
            });
            
            // Close sidebar when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target) && window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    mobileMenuToggle.setAttribute('aria-label', 'Abrir menu');
                    mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
                }
            });
        }
    }

    setupAccessibility() {
        // Add ARIA labels to interactive elements
        document.querySelectorAll('button:not([aria-label])').forEach(button => {
            const text = button.textContent || button.getAttribute('title') || 'Botão';
            button.setAttribute('aria-label', text.trim());
        });
        
        // Add role attributes to tables
        document.querySelectorAll('table').forEach(table => {
            table.setAttribute('role', 'table');
        });
        
        // Add keyboard navigation for charts
        document.querySelectorAll('canvas').forEach(canvas => {
            canvas.setAttribute('tabindex', '0');
            canvas.setAttribute('role', 'img');
        });
    }

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleError(event.error, 'Erro inesperado do sistema');
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, 'Erro de processamento');
        });
    }

    handleInitializationError(error) {
        this.showToast('Erro ao inicializar o sistema. Tentando novamente...', 'error');
        
        if (this.retryAttempts < this.maxRetryAttempts) {
            this.retryAttempts++;
            setTimeout(() => {
                this.init();
            }, 1000 * this.retryAttempts);
        } else {
            this.showToast('Falha na inicialização. Recarregue a página.', 'error');
        }
    }

    handleError(error, userMessage) {
        console.error('Error handled:', error);
        
        // Log error for debugging
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        localStorage.setItem('lastError', JSON.stringify(errorLog));
        
        this.showToast(userMessage || 'Ocorreu um erro. Tente novamente.', 'error');
    }
}

// Global functions for modal opening
function openIncomeModal() {
    if (financeManager) {
        financeManager.openIncomeModal();
    }
}

function openExpenseModal() {
    if (financeManager) {
        financeManager.openExpenseModal();
    }
}

function openBillModal() {
    if (financeManager) {
        financeManager.openBillModal();
    }
}

function openCardModal() {
    if (financeManager) {
        financeManager.openCardModal();
    }
}

function openUpcomingModal() {
    if (financeManager) {
        financeManager.openUpcomingModal();
    }
}

function closeModal(modalId) {
    if (financeManager) {
        financeManager.closeModal(modalId);
    }
}

function showAllTransactions() {
    if (financeManager) {
        financeManager.showPage('expenses');
    }
}

function exportReport() {
    if (financeManager) {
        financeManager.exportReport();
    }
}

function importData() {
    if (financeManager) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => financeManager.importData(event);
        input.click();
    }
}

// Initialize the application with error handling
let financeManager;
document.addEventListener('DOMContentLoaded', () => {
    try {
        financeManager = new FinanceManager();
    } catch (error) {
        console.error('Failed to initialize FinanceManager:', error);
        document.body.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>Erro de Inicialização</strong>
                    <p>Não foi possível inicializar o sistema. Por favor, recarregue a página.</p>
                    <button onclick="window.location.reload()" class="btn-primary">Recarregar</button>
                </div>
            </div>
        `;
    }
});