class FinanceManager {
    constructor() {
        this.db = new DatabaseManager();
        this.transactions = [];
        this.bills = [];
        this.categories = {
            income: ['Salário', 'Freelance', 'Vendas', 'Investimentos', 'Outros'],
            expense: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Cartão de Crédito', 'Outros']
        };
        
        this.currentPage = 'dashboard';
        this.charts = {}; // Store chart instances
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.populateFilters();
        this.populateCategories();
        this.showPage('dashboard');
        this.updateDashboard();
        this.setupDataBackup();
        this.updateSystemInfo();
    }

    async loadData() {
        try {
            this.transactions = await this.db.loadTransactions();
            this.bills = await this.db.loadBills();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.transactions = [];
            this.bills = [];
        }
    }

    setupDataBackup() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveData();
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveData();
        });
    }

    async saveData() {
        try {
            await this.db.saveTransactions(this.transactions);
            await this.db.saveBills(this.bills);
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.showPage(page);
            });
        });

        // Modals
        document.getElementById('addTransactionBtn').addEventListener('click', () => {
            this.showModal('transactionModal');
        });

        document.getElementById('addBillBtn').addEventListener('click', () => {
            this.showModal('billModal');
        });

        document.getElementById('closeTransactionModal').addEventListener('click', () => {
            this.hideModal('transactionModal');
        });

        document.getElementById('closeBillModal').addEventListener('click', () => {
            this.hideModal('billModal');
        });

        // Forms
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        document.getElementById('billForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBill();
        });

        // Transaction type change
        document.getElementById('transactionType').addEventListener('change', (e) => {
            this.updateCategoryOptions(e.target.value);
            this.toggleInstallmentGroup(e.target.value);
        });

        // Bill recurring checkbox
        document.getElementById('billRecurring').addEventListener('change', (e) => {
            this.toggleDuplicateGroup(e.target.checked);
        });

        // Dashboard filters
        document.getElementById('monthFilter').addEventListener('change', () => {
            this.updateDashboard();
        });

        document.getElementById('yearFilter').addEventListener('change', () => {
            this.updateDashboard();
        });

        // Transaction page filters
        document.getElementById('transactionTypeFilter').addEventListener('change', () => {
            this.updateTransactionList();
        });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.updateTransactionList();
        });

        document.getElementById('reportMonth').addEventListener('change', () => {
            this.updateReports();
        });

        document.getElementById('reportYear').addEventListener('change', () => {
            this.updateReports();
        });

        // Data management buttons
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importData(e.target.files[0]);
            }
        });

        // Mobile menu toggle
        document.getElementById('mobileMenuToggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('mobile-open');
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sidebar') && !e.target.closest('#mobileMenuToggle')) {
                document.querySelector('.sidebar').classList.remove('mobile-open');
            }
        });

        // Modal close on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        // Touch events for mobile
        this.setupTouchEvents();
    }

    setupTouchEvents() {
        // Add touch events for better mobile interaction
        document.querySelectorAll('.transaction-item, .bill-item').forEach(item => {
            item.addEventListener('touchstart', (e) => {
                item.style.transform = 'scale(0.98)';
            });
            
            item.addEventListener('touchend', (e) => {
                item.style.transform = 'scale(1)';
            });
        });
    }

    async exportData() {
        try {
            const success = await this.db.exportData();
            if (success) {
                this.showNotification('Dados exportados com sucesso!', 'success');
            } else {
                this.showNotification('Erro ao exportar dados!', 'error');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Erro ao exportar dados!', 'error');
        }
    }

    async importData(file) {
        try {
            const success = await this.db.importData(file);
            if (success) {
                await this.loadData();
                this.updateDashboard();
                this.showNotification('Dados importados com sucesso!', 'success');
            } else {
                this.showNotification('Erro ao importar dados!', 'error');
            }
        } catch (error) {
            console.error('Import failed:', error);
            this.showNotification('Erro ao importar dados!', 'error');
        }
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        document.getElementById(pageId).classList.remove('hidden');
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
        
        this.currentPage = pageId;

        // Update page content
        switch(pageId) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'transactions':
                this.updateTransactionList();
                break;
            case 'bills':
                this.updateBillsList();
                break;
            case 'reports':
                this.updateReports();
                break;
            case 'settings':
                this.updateSystemInfo();
                break;
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.style.overflow = 'auto';
        this.resetForms();
    }

    resetForms() {
        document.getElementById('transactionForm').reset();
        document.getElementById('billForm').reset();
        document.getElementById('installmentGroup').style.display = 'none';
        document.getElementById('duplicateGroup').style.display = 'none';
    }

    populateFilters() {
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');
        const reportMonth = document.getElementById('reportMonth');
        const reportYear = document.getElementById('reportYear');

        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        months.forEach((month, index) => {
            const option1 = new Option(month, index + 1);
            const option2 = new Option(month, index + 1);
            monthFilter.appendChild(option1);
            reportMonth.appendChild(option2);
        });

        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 2; year <= currentYear + 1; year++) {
            const option1 = new Option(year, year);
            const option2 = new Option(year, year);
            yearFilter.appendChild(option1);
            reportYear.appendChild(option2);
        }
    }

    populateCategories() {
        const transactionCategory = document.getElementById('transactionCategory');
        const billCategory = document.getElementById('billCategory');
        const categoryFilter = document.getElementById('categoryFilter');
        
        // Initially populate with expense categories
        this.updateCategoryOptions('expense');
        
        // Populate bill categories with expense categories
        this.categories.expense.forEach(category => {
            const option = new Option(category, category);
            billCategory.appendChild(option);
        });

        // Populate transaction filter with all categories
        const allCategories = [...new Set([...this.categories.income, ...this.categories.expense])];
        allCategories.forEach(category => {
            const option = new Option(category, category);
            categoryFilter.appendChild(option);
        });
    }

    updateCategoryOptions(type) {
        const categorySelect = document.getElementById('transactionCategory');
        categorySelect.innerHTML = '<option value="">Selecione a categoria</option>';
        
        if (type && this.categories[type]) {
            this.categories[type].forEach(category => {
                const option = new Option(category, category);
                categorySelect.appendChild(option);
            });
        }
    }

    toggleInstallmentGroup(type) {
        const installmentGroup = document.getElementById('installmentGroup');
        installmentGroup.style.display = type === 'expense' ? 'block' : 'none';
    }

    toggleDuplicateGroup(isRecurring) {
        const duplicateGroup = document.getElementById('duplicateGroup');
        duplicateGroup.style.display = isRecurring ? 'block' : 'none';
    }

    async addTransaction() {
        const type = document.getElementById('transactionType').value;
        const category = document.getElementById('transactionCategory').value;
        const description = document.getElementById('transactionDescription').value;
        const amount = parseFloat(document.getElementById('transactionAmount').value);
        const date = document.getElementById('transactionDate').value;
        const installments = parseInt(document.getElementById('installments').value) || 1;

        if (installments > 1 && type === 'expense') {
            // Create installment transactions
            const installmentAmount = amount / installments;
            const baseDate = new Date(date);
            
            for (let i = 0; i < installments; i++) {
                const installmentDate = new Date(baseDate);
                installmentDate.setMonth(baseDate.getMonth() + i);
                
                const transaction = {
                    id: Date.now() + i,
                    type,
                    category,
                    description: `${description} (${i + 1}/${installments})`,
                    amount: installmentAmount,
                    date: installmentDate.toISOString().split('T')[0],
                    installment: i + 1,
                    totalInstallments: installments
                };
                
                this.transactions.push(transaction);
            }
        } else {
            const transaction = {
                id: Date.now(),
                type,
                category,
                description,
                amount,
                date
            };
            
            this.transactions.push(transaction);
        }

        await this.saveData();
        this.hideModal('transactionModal');
        this.updateDashboard();
        if (this.currentPage === 'transactions') {
            this.updateTransactionList();
        }
        this.showNotification('Transação adicionada com sucesso!', 'success');
    }

    async addBill() {
        const description = document.getElementById('billDescription').value;
        const amount = parseFloat(document.getElementById('billAmount').value);
        const dueDate = document.getElementById('billDueDate').value;
        const category = document.getElementById('billCategory').value;
        const isRecurring = document.getElementById('billRecurring').checked;
        const duplicateCount = parseInt(document.getElementById('duplicateCount').value) || 1;

        if (isRecurring && duplicateCount > 1) {
            // Create duplicate bills
            const baseDate = new Date(dueDate);
            
            for (let i = 0; i < duplicateCount; i++) {
                const duplicateDate = new Date(baseDate);
                duplicateDate.setMonth(baseDate.getMonth() + i);
                
                const bill = {
                    id: Date.now() + i,
                    description: `${description} (${i + 1}/${duplicateCount})`,
                    amount,
                    dueDate: duplicateDate.toISOString().split('T')[0],
                    category,
                    status: 'pending',
                    isPaid: false
                };
                
                this.bills.push(bill);
            }
        } else {
            const bill = {
                id: Date.now(),
                description,
                amount,
                dueDate,
                category,
                status: 'pending',
                isPaid: false
            };
            
            this.bills.push(bill);
        }

        await this.saveData();
        this.hideModal('billModal');
        this.updateBillsList();
        this.showNotification('Boleto adicionado com sucesso!', 'success');
    }

    async payBill(billId) {
        const bill = this.bills.find(b => b.id === billId);
        if (bill) {
            bill.isPaid = true;
            bill.status = 'paid';
            bill.paidDate = new Date().toISOString().split('T')[0];
            
            // Add as expense transaction
            const transaction = {
                id: Date.now(),
                type: 'expense',
                category: bill.category,
                description: `Pagamento: ${bill.description}`,
                amount: bill.amount,
                date: bill.paidDate
            };
            
            this.transactions.push(transaction);
            await this.saveData();
            this.updateBillsList();
            this.updateDashboard();
            this.showNotification('Boleto pago com sucesso!', 'success');
        }
    }

    async deleteBill(billId) {
        this.bills = this.bills.filter(b => b.id !== billId);
        await this.saveData();
        this.updateBillsList();
        this.showNotification('Boleto removido com sucesso!', 'success');
    }

    updateDashboard() {
        const monthFilter = document.getElementById('monthFilter').value;
        const yearFilter = document.getElementById('yearFilter').value;
        
        const filteredTransactions = this.filterTransactions(monthFilter, yearFilter);
        
        const totalIncome = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpense = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const balance = totalIncome - totalExpense;
        
        document.getElementById('totalIncome').textContent = this.formatCurrency(totalIncome);
        document.getElementById('totalExpense').textContent = this.formatCurrency(totalExpense);
        document.getElementById('totalBalance').textContent = this.formatCurrency(balance);
        
        this.updateChart(filteredTransactions);
        this.updateRecentTransactions(filteredTransactions.slice(-5));
    }

    updateChart(transactions) {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        
        // Properly destroy existing chart
        if (this.charts.expenseChart) {
            this.charts.expenseChart.destroy();
        }
        
        const expensesByCategory = {};
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
            });
            
        const labels = Object.keys(expensesByCategory);
        const data = Object.values(expensesByCategory);
        
        if (labels.length === 0) {
            // Clear canvas if no data
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }
        
        this.charts.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                        '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateRecentTransactions(transactions) {
        const container = document.getElementById('recentTransactions');
        container.innerHTML = '';
        
        transactions.reverse().forEach(transaction => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="transaction-info">
                    <h4>${transaction.description}</h4>
                    <p>${transaction.category} • ${this.formatDate(transaction.date)}</p>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateTransactionList() {
        const container = document.getElementById('transactionList');
        const typeFilter = document.getElementById('transactionTypeFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        
        container.innerHTML = '';
        
        let filteredTransactions = this.transactions;
        
        // Apply filters
        if (typeFilter) {
            filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
        }
        
        if (categoryFilter) {
            filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
        }
        
        // Sort by date (newest first)
        filteredTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(transaction => {
                const item = document.createElement('div');
                item.className = 'transaction-item';
                item.innerHTML = `
                    <div class="transaction-info">
                        <h4>${transaction.description}</h4>
                        <p>${transaction.category} • ${this.formatDate(transaction.date)}</p>
                        <span class="transaction-type-badge ${transaction.type}">
                            ${transaction.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                    </div>
                `;
                container.appendChild(item);
            });
            
        // Show message if no transactions
        if (filteredTransactions.length === 0) {
            container.innerHTML = '<p class="no-data">Nenhuma transação encontrada.</p>';
        }
    }

    updateBillsList() {
        const pendingContainer = document.getElementById('pendingBills');
        const paidContainer = document.getElementById('paidBills');
        const overdueContainer = document.getElementById('overdueBills');
        
        pendingContainer.innerHTML = '';
        paidContainer.innerHTML = '';
        overdueContainer.innerHTML = '';
        
        const today = new Date();
        
        this.bills.forEach(bill => {
            const dueDate = new Date(bill.dueDate);
            const isOverdue = dueDate < today && !bill.isPaid;
            
            const item = document.createElement('div');
            item.className = 'bill-item';
            item.innerHTML = `
                <h4>${bill.description}</h4>
                <p>Valor: ${this.formatCurrency(bill.amount)}</p>
                <p>Vencimento: ${this.formatDate(bill.dueDate)}</p>
                <p>Categoria: ${bill.category}</p>
                ${!bill.isPaid ? `
                    <div class="bill-actions">
                        <button class="btn-small btn-success" onclick="financeManager.payBill(${bill.id})">
                            Pagar
                        </button>
                        <button class="btn-small btn-danger" onclick="financeManager.deleteBill(${bill.id})">
                            Excluir
                        </button>
                    </div>
                ` : ''}
            `;
            
            if (bill.isPaid) {
                paidContainer.appendChild(item);
            } else if (isOverdue) {
                overdueContainer.appendChild(item);
            } else {
                pendingContainer.appendChild(item);
            }
        });
    }

    updateReports() {
        const month = document.getElementById('reportMonth').value;
        const year = document.getElementById('reportYear').value;
        
        // If no specific month/year selected, show all data (like dashboard)
        const filteredTransactions = this.filterTransactions(month, year);
        
        // Monthly summary
        const totalIncome = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpense = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const balance = totalIncome - totalExpense;
        
        document.getElementById('monthlySummary').innerHTML = `
            <div class="summary-item">
                <span>Receitas:</span>
                <span class="income">${this.formatCurrency(totalIncome)}</span>
            </div>
            <div class="summary-item">
                <span>Despesas:</span>
                <span class="expense">${this.formatCurrency(totalExpense)}</span>
            </div>
            <div class="summary-item">
                <span>Saldo:</span>
                <span class="${balance >= 0 ? 'income' : 'expense'}">${this.formatCurrency(balance)}</span>
            </div>
        `;
        
        // Category breakdown
        const categoryBreakdown = {};
        filteredTransactions.forEach(t => {
            if (!categoryBreakdown[t.category]) {
                categoryBreakdown[t.category] = { income: 0, expense: 0 };
            }
            categoryBreakdown[t.category][t.type] += t.amount;
        });
        
        const categoryContainer = document.getElementById('categoryBreakdown');
        categoryContainer.innerHTML = '';
        
        Object.entries(categoryBreakdown).forEach(([category, amounts]) => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.innerHTML = `
                <h4>${category}</h4>
                ${amounts.income > 0 ? `<p class="income">+${this.formatCurrency(amounts.income)}</p>` : ''}
                ${amounts.expense > 0 ? `<p class="expense">-${this.formatCurrency(amounts.expense)}</p>` : ''}
            `;
            categoryContainer.appendChild(item);
        });
        
        this.updateReportChart(filteredTransactions);
    }

    updateReportChart(transactions) {
        const ctx = document.getElementById('reportChart').getContext('2d');
        
        // Properly destroy existing chart
        if (this.charts.reportChart) {
            this.charts.reportChart.destroy();
        }
        
        const dailyData = {};
        transactions.forEach(t => {
            const date = t.date;
            if (!dailyData[date]) {
                dailyData[date] = { income: 0, expense: 0 };
            }
            dailyData[date][t.type] += t.amount;
        });
        
        const sortedDates = Object.keys(dailyData).sort();
        const incomeData = sortedDates.map(date => dailyData[date].income);
        const expenseData = sortedDates.map(date => dailyData[date].expense);
        
        if (sortedDates.length === 0) {
            // Clear canvas if no data
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }
        
        this.charts.reportChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates.map(date => this.formatDate(date)),
                datasets: [
                    {
                        label: 'Receitas',
                        data: incomeData,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Despesas',
                        data: expenseData,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    filterTransactions(month, year) {
        return this.transactions.filter(transaction => {
            const date = new Date(transaction.date);
            const transactionMonth = date.getMonth() + 1;
            const transactionYear = date.getFullYear();
            
            if (month && transactionMonth !== parseInt(month)) return false;
            if (year && transactionYear !== parseInt(year)) return false;
            
            return true;
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
            background-color: ${type === 'success' ? '#10B981' : '#EF4444'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    updateSystemInfo() {
        const systemInfo = document.getElementById('systemInfo');
        const storageInfo = this.db.getStorageInfo();
        
        systemInfo.innerHTML = `
            <div class="info-item">
                <span>Total de Transações:</span>
                <span>${storageInfo.transactionsCount}</span>
            </div>
            <div class="info-item">
                <span>Total de Boletos:</span>
                <span>${storageInfo.billsCount}</span>
            </div>
            <div class="info-item">
                <span>Espaço Utilizado:</span>
                <span>${storageInfo.totalSize}</span>
            </div>
            <div class="info-item">
                <span>Último Backup:</span>
                <span>${storageInfo.lastBackup}</span>
            </div>
        `;
    }
}

// Initialize the application
const financeManager = new FinanceManager();