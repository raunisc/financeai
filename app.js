class FinanceAI {
    constructor() {
        this.bills = [];
        this.invoices = [];
        this.revenues = [];
        this.notifications = [];
        this.settings = {
            emailEnabled: true,
            emailAddress: '',
            reminderDays: 3,
            aiProcessing: true,
            smartCategorization: true,
            duplicateDetection: true,
            autoBackup: true,
            defaultReportPeriod: 90,
            showPaidBills: true,
            compactView: false
        };
        
        this.aiEngine = new AIEngine();
        this.emailIntegration = new EmailIntegration();
        this.fileProcessor = new FileProcessor();
        this.storageManager = new StorageManager();
        this.isInitialized = false;
        this.loadingOverlay = null;
        this.performanceMetrics = {};
        
        this.init();
    }

    async init() {
        try {
            this.showLoadingOverlay('Inicializando sistema...');
            
            await this.loadData();
            this.setupEventListeners();
            this.setupNavigation();
            this.renderDashboard();
            this.scheduleNotifications();
            this.loadDatabaseSettings();
            this.enableAutoSave();
            this.setupPerformanceMonitoring();
            this.verifyDataIntegrityPeriodically();
            
            this.hideLoadingOverlay();
            this.isInitialized = true;
            
            this.showToast('Sistema inicializado com sucesso!', 'success');
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro na inicialização:', error);
            this.showToast('Erro ao inicializar o sistema', 'error');
            this.handleError(error, 'Inicialização');
        }
    }

    showLoadingOverlay(message = 'Carregando...') {
        try {
            if (this.loadingOverlay) {
                this.hideLoadingOverlay();
            }
            
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.className = 'loading-overlay';
            this.loadingOverlay.innerHTML = `
                <div style="text-align: center;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 1rem; color: var(--text-primary); font-weight: 500;">${message}</p>
                </div>
            `;
            
            document.body.appendChild(this.loadingOverlay);
            
            // Force reflow then show
            this.loadingOverlay.offsetHeight;
            this.loadingOverlay.classList.add('show');
        } catch (error) {
            console.error('Erro ao mostrar loading overlay:', error);
        }
    }

    hideLoadingOverlay() {
        try {
            if (this.loadingOverlay) {
                this.loadingOverlay.classList.remove('show');
                setTimeout(() => {
                    if (this.loadingOverlay && this.loadingOverlay.parentNode) {
                        this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
                    }
                    this.loadingOverlay = null;
                }, 300);
            }
        } catch (error) {
            console.error('Erro ao esconder loading overlay:', error);
        }
    }

    showToast(message, type = 'info', duration = 4000) {
        try {
            // Remove existing toasts
            const existingToasts = document.querySelectorAll('.toast');
            existingToasts.forEach(toast => toast.remove());

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fas fa-${this.getToastIcon(type)}"></i>
                    <span>${this.escapeHtml(message)}</span>
                </div>
            `;

            document.body.appendChild(toast);

            // Auto remove after duration
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 300);
                }
            }, duration);

            // Click to dismiss
            toast.addEventListener('click', () => {
                if (toast.parentNode) {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 300);
                }
            });
        } catch (error) {
            console.error('Erro ao mostrar toast:', error);
        }
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleError(error, context = '') {
        try {
            console.error(`Erro em ${context}:`, error);
            
            // Log to performance metrics if available
            if (this.performanceMetrics) {
                if (!this.performanceMetrics.errors) {
                    this.performanceMetrics.errors = [];
                }
                this.performanceMetrics.errors.push({
                    context,
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
                
                // Keep only last 50 errors
                if (this.performanceMetrics.errors.length > 50) {
                    this.performanceMetrics.errors = this.performanceMetrics.errors.slice(-50);
                }
            }
        } catch (err) {
            console.error('Erro no manipulador de erro:', err);
        }
    }

    async measureAsyncPerformance(name, asyncFunction) {
        const start = performance.now();
        try {
            const result = await asyncFunction();
            const end = performance.now();
            
            if (!this.performanceMetrics.operations) {
                this.performanceMetrics.operations = {};
            }
            
            this.performanceMetrics.operations[name] = {
                duration: Math.round(end - start),
                timestamp: new Date().toISOString(),
                success: true
            };
            
            return result;
        } catch (error) {
            const end = performance.now();
            
            if (!this.performanceMetrics.operations) {
                this.performanceMetrics.operations = {};
            }
            
            this.performanceMetrics.operations[name] = {
                duration: Math.round(end - start),
                timestamp: new Date().toISOString(),
                success: false,
                error: error.message
            };
            
            throw error;
        }
    }

    async verifyDataIntegrity() {
        try {
            const issues = [];
            
            // Check bills integrity
            if (Array.isArray(this.bills)) {
                this.bills.forEach((bill, index) => {
                    if (!this.validateBillData(bill)) {
                        issues.push(`Bill at index ${index} has invalid data`);
                    }
                });
            }
            
            // Check invoices integrity
            if (Array.isArray(this.invoices)) {
                this.invoices.forEach((invoice, index) => {
                    if (!this.validateInvoiceData(invoice)) {
                        issues.push(`Invoice at index ${index} has invalid data`);
                    }
                });
            }
            
            // Check revenues integrity
            if (Array.isArray(this.revenues)) {
                this.revenues.forEach((revenue, index) => {
                    if (!this.validateRevenueData(revenue)) {
                        issues.push(`Revenue at index ${index} has invalid data`);
                    }
                });
            }
            
            return {
                isValid: issues.length === 0,
                issues: issues
            };
        } catch (error) {
            return {
                isValid: false,
                issues: [`Integrity check failed: ${error.message}`]
            };
        }
    }

    validateBillData(bill) {
        try {
            return bill && 
                   typeof bill.id !== 'undefined' &&
                   typeof bill.name === 'string' && bill.name.trim() !== '' &&
                   typeof bill.amount === 'number' && bill.amount >= 0 &&
                   typeof bill.dueDate === 'string' && !isNaN(new Date(bill.dueDate).getTime()) &&
                   ['pending', 'paid', 'overdue'].includes(bill.status);
        } catch (error) {
            return false;
        }
    }

    validateInvoiceData(invoice) {
        try {
            return invoice && 
                   typeof invoice.id !== 'undefined' &&
                   typeof invoice.number === 'string' && invoice.number.trim() !== '' &&
                   typeof invoice.supplier === 'string' && invoice.supplier.trim() !== '' &&
                   typeof invoice.amount === 'number' && invoice.amount >= 0 &&
                   typeof invoice.date === 'string' && !isNaN(new Date(invoice.date).getTime());
        } catch (error) {
            return false;
        }
    }

    validateRevenueData(revenue) {
        try {
            return revenue && 
                   typeof revenue.id !== 'undefined' &&
                   typeof revenue.description === 'string' && revenue.description.trim() !== '' &&
                   typeof revenue.amount === 'number' && revenue.amount >= 0 &&
                   typeof revenue.date === 'string' && !isNaN(new Date(revenue.date).getTime());
        } catch (error) {
            return false;
        }
    }

    async loadData() {
        try {
            const [bills, invoices, revenues, settings] = await Promise.all([
                this.storageManager.loadData('bills'),
                this.storageManager.loadData('invoices'),
                this.storageManager.loadData('revenues'),
                this.loadSettings()
            ]);

            this.bills = Array.isArray(bills) ? bills : [];
            this.invoices = Array.isArray(invoices) ? invoices : [];
            this.revenues = Array.isArray(revenues) ? revenues : [];
            
            if (settings && typeof settings === 'object') {
                this.settings = { ...this.settings, ...settings };
            }

            console.log('Dados carregados:', {
                bills: this.bills.length,
                invoices: this.invoices.length,
                revenues: this.revenues.length
            });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.bills = [];
            this.invoices = [];
            this.revenues = [];
        }
    }

    async saveData() {
        try {
            await Promise.all([
                this.storageManager.saveData('bills', this.bills),
                this.storageManager.saveData('invoices', this.invoices),
                this.storageManager.saveData('revenues', this.revenues)
            ]);
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            throw error;
        }
    }

    async loadSettings() {
        try {
            const savedSettings = await this.storageManager.loadSetting('userSettings');
            return savedSettings || {};
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            return {};
        }
    }

    async saveSettings() {
        try {
            await this.storageManager.saveSetting('userSettings', this.settings);
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
        }
    }

    enableAutoSave() {
        try {
            // Auto-save every 30 seconds
            setInterval(async () => {
                try {
                    await this.saveData();
                    await this.saveSettings();
                } catch (error) {
                    console.error('Erro no auto-save:', error);
                }
            }, 30000);
        } catch (error) {
            console.error('Erro ao configurar auto-save:', error);
        }
    }

    setupEventListeners() {
        try {
            // Form submissions
            const addBillForm = document.getElementById('addBillForm');
            if (addBillForm) {
                addBillForm.addEventListener('submit', (e) => this.handleAddBill(e));
            }

            const addInvoiceForm = document.getElementById('addInvoiceForm');
            if (addInvoiceForm) {
                addInvoiceForm.addEventListener('submit', (e) => this.handleAddInvoice(e));
            }

            const addRevenueForm = document.getElementById('addRevenueForm');
            if (addRevenueForm) {
                addRevenueForm.addEventListener('submit', (e) => this.handleAddRevenue(e));
            }

            // Modal close events
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.closeAllModals();
                }
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeAllModals();
                }
            });
        } catch (error) {
            console.error('Erro ao configurar event listeners:', error);
        }
    }

    setupNavigation() {
        try {
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    if (href) {
                        this.showSection(href.substring(1));
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao configurar navegação:', error);
        }
    }

    showSection(sectionName) {
        try {
            // Hide all sections
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });

            // Show target section
            const targetSection = document.getElementById(`${sectionName}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });

            const activeLink = document.querySelector(`.nav-link[href="#${sectionName}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Update page title
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) {
                const titles = {
                    'dashboard': 'Dashboard',
                    'bills': 'Gestão de Boletos',
                    'invoices': 'Notas Fiscais',
                    'revenues': 'Receitas',
                    'notifications': 'Notificações',
                    'settings': 'Configurações'
                };
                pageTitle.textContent = titles[sectionName] || 'FinanceAI';
            }

            // Render section content
            this.renderSectionContent(sectionName);
        } catch (error) {
            console.error('Erro ao mostrar seção:', error);
        }
    }

    renderSectionContent(sectionName) {
        try {
            switch (sectionName) {
                case 'dashboard':
                    this.renderDashboard();
                    break;
                case 'bills':
                    this.renderBills();
                    break;
                case 'invoices':
                    this.renderInvoices();
                    break;
                case 'revenues':
                    this.renderRevenues();
                    break;
                case 'notifications':
                    this.renderNotifications();
                    break;
                case 'settings':
                    this.renderSettings();
                    break;
            }
        } catch (error) {
            console.error(`Erro ao renderizar seção ${sectionName}:`, error);
        }
    }

    closeAllModals() {
        try {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
            
            // Reset editing states
            delete this.editingBillId;
            delete this.editingInvoiceId;
            delete this.editingRevenueId;
        } catch (error) {
            console.error('Erro ao fechar modais:', error);
        }
    }

    async clearAllData() {
        try {
            if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
                return;
            }

            this.showLoadingOverlay('Limpando dados...');
            
            // Clear local data
            this.bills = [];
            this.invoices = [];
            this.revenues = [];
            this.notifications = [];
            
            // Clear storage
            await this.storageManager.clearAllData();
            
            // Re-render all sections
            this.renderDashboard();
            this.renderBills();
            this.renderInvoices();
            this.renderRevenues();
            this.renderNotifications();
            
            this.hideLoadingOverlay();
            this.showToast('Todos os dados foram limpos com sucesso!', 'success');
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro ao limpar dados:', error);
            this.showToast('Erro ao limpar dados: ' + error.message, 'error');
        }
    }

    async generateFinancialReport() {
        try {
            this.showLoadingOverlay('Gerando relatório financeiro...');
            
            const reportData = await this.measureAsyncPerformance('generateReport', async () => {
                return this.calculateFinancialMetrics();
            });
            
            this.hideLoadingOverlay();
            this.showFinancialReportModal(reportData);
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro ao gerar relatório financeiro:', error);
            this.showToast('Erro ao gerar relatório: ' + error.message, 'error');
        }
    }

    async calculateFinancialMetrics() {
        try {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Filter data by selected period
            const periodDays = this.settings.defaultReportPeriod || 90;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - periodDays);
            
            const filteredBills = this.bills.filter(bill => {
                if (!bill || !bill.createdAt) return false;
                const billDate = new Date(bill.createdAt);
                return billDate >= startDate;
            });
            
            const filteredInvoices = this.invoices.filter(invoice => {
                if (!invoice || !invoice.createdAt) return false;
                const invoiceDate = new Date(invoice.createdAt);
                return invoiceDate >= startDate;
            });
            
            const filteredRevenues = this.revenues.filter(revenue => {
                if (!revenue || !revenue.createdAt) return false;
                const revenueDate = new Date(revenue.createdAt);
                return revenueDate >= startDate;
            });
            
            // Calculate totals
            const totalRevenues = filteredRevenues.reduce((sum, revenue) => sum + (revenue.amount || 0), 0);
            const totalBills = filteredBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
            const totalInvoices = filteredInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
            const totalExpenses = totalBills + totalInvoices;
            const netBalance = totalRevenues - totalExpenses;
            
            // Calculate by status
            const paidBills = filteredBills.filter(bill => bill.status === 'paid');
            const pendingBills = filteredBills.filter(bill => bill.status === 'pending');
            const overdueBills = filteredBills.filter(bill => this.isBillOverdue(bill));
            
            const totalPaid = paidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
            const totalPending = pendingBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
            const totalOverdue = overdueBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
            
            // Calculate by category
            const categoryBreakdown = this.calculateCategoryBreakdown(filteredBills, filteredInvoices, filteredRevenues);
            
            // Calculate monthly trends
            const monthlyTrends = this.calculateMonthlyTrends();
            
            return {
                period: `${periodDays} dias`,
                summary: {
                    totalRevenues,
                    totalExpenses,
                    netBalance,
                    totalBills: filteredBills.length,
                    totalInvoices: filteredInvoices.length,
                    totalRevenues: filteredRevenues.length
                },
                billsStatus: {
                    paid: { count: paidBills.length, amount: totalPaid },
                    pending: { count: pendingBills.length, amount: totalPending },
                    overdue: { count: overdueBills.length, amount: totalOverdue }
                },
                categoryBreakdown,
                monthlyTrends,
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erro ao calcular métricas financeiras:', error);
            throw error;
        }
    }

    calculateCategoryBreakdown(bills, invoices, revenues) {
        try {
            const categories = {};
            
            // Process bills
            bills.forEach(bill => {
                if (!bill || !bill.category) return;
                const category = bill.category;
                if (!categories[category]) {
                    categories[category] = { count: 0, amount: 0, type: 'expense' };
                }
                categories[category].count++;
                categories[category].amount += bill.amount || 0;
            });
            
            // Process invoices
            invoices.forEach(invoice => {
                if (!invoice || !invoice.category) return;
                const category = invoice.category;
                if (!categories[category]) {
                    categories[category] = { count: 0, amount: 0, type: 'expense' };
                }
                categories[category].count++;
                categories[category].amount += invoice.amount || 0;
            });
            
            // Process revenues
            revenues.forEach(revenue => {
                if (!revenue || !revenue.category) return;
                const category = revenue.category;
                if (!categories[category]) {
                    categories[category] = { count: 0, amount: 0, type: 'income' };
                }
                categories[category].count++;
                categories[category].amount += revenue.amount || 0;
            });
            
            // Convert to array and sort by amount
            return Object.entries(categories)
                .map(([category, data]) => ({
                    category,
                    ...data,
                    categoryName: this.getCategoryText(category)
                }))
                .sort((a, b) => b.amount - a.amount);
        } catch (error) {
            console.error('Erro ao calcular breakdown por categoria:', error);
            return [];
        }
    }

    calculateMonthlyTrends() {
        try {
            const trends = {};
            
            // Get last 6 months
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                
                trends[monthKey] = {
                    name: monthName,
                    revenues: 0,
                    expenses: 0,
                    balance: 0
                };
            }
            
            // Calculate revenues
            this.revenues.forEach(revenue => {
                if (!revenue || !revenue.date) return;
                const date = new Date(revenue.date);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                if (trends[monthKey]) {
                    trends[monthKey].revenues += revenue.amount || 0;
                }
            });
            
            // Calculate expenses (bills + invoices)
            [...this.bills, ...this.invoices].forEach(item => {
                if (!item) return;
                const date = new Date(item.dueDate || item.date);
                if (isNaN(date.getTime())) return;
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                if (trends[monthKey]) {
                    trends[monthKey].expenses += item.amount || 0;
                }
            });
            
            // Calculate balance
            Object.keys(trends).forEach(monthKey => {
                const trend = trends[monthKey];
                trend.balance = trend.revenues - trend.expenses;
            });
            
            return Object.values(trends);
        } catch (error) {
            console.error('Erro ao calcular tendências mensais:', error);
            return [];
        }
    }

    showFinancialReportModal(reportData) {
        try {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content report-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-chart-bar"></i> Relatório Financeiro Detalhado</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="report-summary">
                            <h4>Resumo Geral (${reportData.period})</h4>
                            <div class="summary-grid">
                                <div class="summary-item positive">
                                    <i class="fas fa-arrow-up"></i>
                                    <span class="label">Receitas</span>
                                    <span class="value">R$ ${reportData.summary.totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="summary-item negative">
                                    <i class="fas fa-arrow-down"></i>
                                    <span class="label">Despesas</span>
                                    <span class="value">R$ ${reportData.summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="summary-item ${reportData.summary.netBalance >= 0 ? 'positive' : 'negative'}">
                                    <i class="fas fa-balance-scale"></i>
                                    <span class="label">Saldo Líquido</span>
                                    <span class="value">R$ ${reportData.summary.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="summary-item neutral">
                                    <i class="fas fa-file-alt"></i>
                                    <span class="label">Total de Documentos</span>
                                    <span class="value">${reportData.summary.totalBills + reportData.summary.totalInvoices + reportData.summary.totalRevenues}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="report-status">
                            <h4>Status dos Boletos</h4>
                            <div class="status-grid">
                                <div class="status-item success">
                                    <i class="fas fa-check-circle"></i>
                                    <span class="status-label">Pagos</span>
                                    <span class="status-value">${reportData.billsStatus.paid.count}</span>
                                    <small>R$ ${reportData.billsStatus.paid.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</small>
                                </div>
                                <div class="status-item warning">
                                    <i class="fas fa-clock"></i>
                                    <span class="status-label">Pendentes</span>
                                    <span class="status-value">${reportData.billsStatus.pending.count}</span>
                                    <small>R$ ${reportData.billsStatus.pending.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</small>
                                </div>
                                <div class="status-item danger">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span class="status-label">Vencidos</span>
                                    <span class="status-value">${reportData.billsStatus.overdue.count}</span>
                                    <small>R$ ${reportData.billsStatus.overdue.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="report-categories">
                            <h4>Análise por Categoria</h4>
                            <div class="category-list">
                                ${reportData.categoryBreakdown.map(cat => `
                                    <div class="category-item">
                                        <span class="category-name">${cat.categoryName}</span>
                                        <span class="category-count">${cat.count} itens</span>
                                        <span class="category-total">R$ ${cat.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        <span class="category-percentage">${((cat.amount / reportData.summary.totalExpenses) * 100).toFixed(1)}%</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="report-trends">
                            <h4>Tendências Mensais</h4>
                            <div class="trends-list">
                                ${reportData.monthlyTrends.map(trend => `
                                    <div class="trend-item">
                                        <strong>${trend.name}</strong>
                                        <div class="trend-values">
                                            <span class="trend-revenues">Receitas: R$ ${trend.revenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            <span class="trend-expenses">Despesas: R$ ${trend.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            <span class="trend-balance ${trend.balance >= 0 ? 'positive' : 'negative'}">
                                                Saldo: R$ ${trend.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-info" onclick="financeAI.exportReport('${JSON.stringify(reportData).replace(/"/g, '&quot;')}')">
                            <i class="fas fa-download"></i> Exportar Relatório
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Fechar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Erro ao mostrar modal de relatório:', error);
            this.showToast('Erro ao exibir relatório', 'error');
        }
    }

    async showSpendingInsights() {
        try {
            this.showLoadingOverlay('Analisando padrões de gastos...');
            
            const insights = await this.measureAsyncPerformance('generateInsights', async () => {
                return this.generateSpendingInsights();
            });
            
            this.hideLoadingOverlay();
            this.showInsightsModal(insights);
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro ao gerar insights:', error);
            this.showToast('Erro ao gerar insights: ' + error.message, 'error');
        }
    }

    async generateSpendingInsights() {
        try {
            const insights = [];
            const now = new Date();
            
            // Insight 1: Overdue bills
            const overdueBills = this.bills.filter(bill => this.isBillOverdue(bill));
            if (overdueBills.length > 0) {
                const totalOverdue = overdueBills.reduce((sum, bill) => sum + bill.amount, 0);
                insights.push({
                    type: 'danger',
                    title: 'Boletos Vencidos',
                    message: `Você tem ${overdueBills.length} boletos vencidos totalizando R$ ${totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Priorize o pagamento para evitar juros e multas.`,
                    priority: 'high'
                });
            }
            
            // Insight 2: High spending categories
            const categoryTotals = {};
            [...this.bills, ...this.invoices].forEach(item => {
                if (!item || !item.category) return;
                if (!categoryTotals[item.category]) categoryTotals[item.category] = 0;
                categoryTotals[item.category] += item.amount || 0;
            });
            
            const topCategory = Object.entries(categoryTotals)
                .sort(([,a], [,b]) => b - a)[0];
            
            if (topCategory && topCategory[1] > 5000) {
                insights.push({
                    type: 'warning',
                    title: 'Categoria com Maior Gasto',
                    message: `A categoria "${this.getCategoryText(topCategory[0])}" representa o maior gasto com R$ ${topCategory[1].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Considere revisar esses gastos.`,
                    priority: 'medium'
                });
            }
            
            // Insight 3: Cashflow trend
            const currentMonth = this.calculateMonthlyTrends().slice(-1)[0];
            if (currentMonth && currentMonth.balance < 0) {
                insights.push({
                    type: 'warning',
                    title: 'Fluxo de Caixa Negativo',
                    message: `O saldo do mês atual está negativo em R$ ${Math.abs(currentMonth.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Considere aumentar receitas ou reduzir despesas.`,
                    priority: 'high'
                });
            }
            
            // Insight 4: Upcoming bills
            const upcomingBills = this.bills.filter(bill => {
                if (!bill || bill.status !== 'pending') return false;
                const daysUntil = this.getDaysUntilDue(bill.dueDate);
                return daysUntil > 0 && daysUntil <= 7;
            });
            
            if (upcomingBills.length > 0) {
                const totalUpcoming = upcomingBills.reduce((sum, bill) => sum + bill.amount, 0);
                insights.push({
                    type: 'info',
                    title: 'Vencimentos Próximos',
                    message: `${upcomingBills.length} boletos vencerão nos próximos 7 dias, totalizando R$ ${totalUpcoming.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Organize-se para os pagamentos.`,
                    priority: 'medium'
                });
            }
            
            // Insight 5: Revenue vs expenses ratio
            const totalRevenues = this.revenues.reduce((sum, revenue) => sum + (revenue.amount || 0), 0);
            const totalExpenses = [...this.bills, ...this.invoices].reduce((sum, item) => sum + (item.amount || 0), 0);
            
            if (totalRevenues > 0) {
                const ratio = (totalExpenses / totalRevenues) * 100;
                if (ratio > 80) {
                    insights.push({
                        type: 'warning',
                        title: 'Alto Percentual de Gastos',
                        message: `Suas despesas representam ${ratio.toFixed(1)}% das receitas. Considere reduzir gastos ou aumentar receitas para melhorar sua saúde financeira.`,
                        priority: 'medium'
                    });
                } else if (ratio < 50) {
                    insights.push({
                        type: 'success',
                        title: 'Excelente Controle Financeiro',
                        message: `Parabéns! Suas despesas representam apenas ${ratio.toFixed(1)}% das receitas. Continue mantendo esse bom controle financeiro.`,
                        priority: 'low'
                    });
                }
            }
            
            return insights;
        } catch (error) {
            console.error('Erro ao gerar insights de gastos:', error);
            return [];
        }
    }

    showInsightsModal(insights) {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content insights-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-lightbulb"></i> Insights de Gastos</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${insights.length > 0 ? `
                            <div class="insights-list">
                                ${insights.map(insight => `
                                    <div class="insight-item ${insight.type}">
                                        <div class="insight-icon">
                                            <i class="fas fa-${this.getInsightIcon(insight.type)}"></i>
                                        </div>
                                        <div class="insight-content">
                                            <h4>${insight.title}</h4>
                                            <p>${insight.message}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                                <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem; color: var(--success-color);"></i>
                                <h4>Tudo sob controle!</h4>
                                <p>Não foram identificados pontos de atenção em seus gastos no momento.</p>
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Fechar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Erro ao mostrar modal de insights:', error);
            this.showToast('Erro ao exibir insights', 'error');
        }
    }

    getInsightIcon(type) {
        const icons = {
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'danger': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    async predictCashFlow() {
        try {
            this.showLoadingOverlay('Calculando previsões...');
            
            const predictions = await this.measureAsyncPerformance('predictCashFlow', async () => {
                return this.calculateCashFlowPredictions();
            });
            
            this.hideLoadingOverlay();
            this.showPredictionModal(predictions);
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro ao prever fluxo de caixa:', error);
            this.showToast('Erro ao calcular previsões: ' + error.message, 'error');
        }
    }

    async calculateCashFlowPredictions() {
        try {
            const predictions = [];
            const now = new Date();
            
            // Predict next 3 months
            for (let i = 1; i <= 3; i++) {
                const futureDate = new Date(now);
                futureDate.setMonth(futureDate.getMonth() + i);
                
                const monthName = futureDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                
                // Predict expenses based on pending bills and recurring patterns
                const pendingBills = this.bills.filter(bill => {
                    if (!bill || bill.status !== 'pending') return false;
                    const dueDate = new Date(bill.dueDate);
                    return dueDate.getMonth() === futureDate.getMonth() && 
                           dueDate.getFullYear() === futureDate.getFullYear();
                });
                
                const predictedExpenses = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
                
                // Predict revenues based on historical average
                const historicalRevenues = this.revenues.filter(revenue => {
                    if (!revenue || !revenue.date) return false;
                    const revenueDate = new Date(revenue.date);
                    return revenueDate.getMonth() === futureDate.getMonth();
                });
                
                const avgRevenue = historicalRevenues.length > 0 
                    ? historicalRevenues.reduce((sum, revenue) => sum + revenue.amount, 0) / historicalRevenues.length
                    : 0;
                
                const predictedBalance = avgRevenue - predictedExpenses;
                
                predictions.push({
                    month: monthName,
                    predictedRevenues: avgRevenue,
                    predictedExpenses: predictedExpenses,
                    predictedBalance: predictedBalance,
                    confidence: historicalRevenues.length > 0 ? 'Média' : 'Baixa',
                    billsCount: pendingBills.length
                });
            }
            
            return predictions;
        } catch (error) {
            console.error('Erro ao calcular previsões:', error);
            return [];
        }
    }

    showPredictionModal(predictions) {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content prediction-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-crystal-ball"></i> Previsão de Fluxo de Caixa</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="prediction-disclaimer">
                            <i class="fas fa-info-circle"></i>
                            <strong>Importante:</strong> As previsões são baseadas em dados históricos e boletos pendentes. 
                            Os valores reais podem variar significativamente.
                        </div>
                        
                        <div class="prediction-list">
                            ${predictions.map(prediction => `
                                <div class="prediction-item">
                                    <div class="prediction-header">
                                        <h4>${prediction.month}</h4>
                                        <span class="prediction-status ${prediction.predictedBalance >= 0 ? 'positive' : 'negative'}">
                                            ${prediction.predictedBalance >= 0 ? 'Superávit' : 'Déficit'}
                                        </span>
                                    </div>
                                    <div class="prediction-details">
                                        <div class="prediction-row">
                                            <span class="label">Receitas Previstas:</span>
                                            <span class="value positive">R$ ${prediction.predictedRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div class="prediction-row">
                                            <span class="label">Despesas Previstas:</span>
                                            <span class="value negative">R$ ${prediction.predictedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div class="prediction-row total">
                                            <span class="label">Saldo Previsto:</span>
                                            <span class="value ${prediction.predictedBalance >= 0 ? 'positive' : 'negative'}">
                                                R$ ${prediction.predictedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div class="prediction-bills">
                                            ${prediction.billsCount} boletos pendentes para este mês
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Fechar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Erro ao mostrar modal de previsão:', error);
            this.showToast('Erro ao exibir previsões', 'error');
        }
    }

    async exportReport(reportDataString) {
        try {
            const reportData = JSON.parse(reportDataString.replace(/&quot;/g, '"'));
            
            const reportText = `
RELATÓRIO FINANCEIRO - ${new Date().toLocaleDateString('pt-BR')}
${'='.repeat(50)}

RESUMO GERAL (${reportData.period})
${'-'.repeat(30)}
Receitas: R$ ${reportData.summary.totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Despesas: R$ ${reportData.summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Saldo Líquido: R$ ${reportData.summary.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

STATUS DOS BOLETOS
${'-'.repeat(30)}
Pagos: ${reportData.billsStatus.paid.count} (R$ ${reportData.billsStatus.paid.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
Pendentes: ${reportData.billsStatus.pending.count} (R$ ${reportData.billsStatus.pending.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
Vencidos: ${reportData.billsStatus.overdue.count} (R$ ${reportData.billsStatus.overdue.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})

ANÁLISE POR CATEGORIA
${'-'.repeat(30)}
${reportData.categoryBreakdown.map(cat => 
    `${cat.categoryName}: R$ ${cat.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${cat.count} itens)`
).join('\n')}

Relatório gerado automaticamente pelo FinanceAI
            `.trim();
            
            const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Relatório exportado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            this.showToast('Erro ao exportar relatório', 'error');
        }
    }

    async createBackup() {
        try {
            this.showLoadingOverlay('Criando backup...');
            
            const backupData = await this.storageManager.exportData();
            const backupInfo = {
                ...backupData,
                backupDate: new Date().toISOString(),
                version: '1.0',
                systemInfo: {
                    storageMode: this.storageManager.getStorageMode(),
                    totalBills: this.bills.length,
                    totalInvoices: this.invoices.length,
                    totalRevenues: this.revenues.length
                }
            };
            
            // Save backup info to local storage
            localStorage.setItem('financeai_last_backup', JSON.stringify({
                date: backupInfo.backupDate,
                recordCount: backupInfo.systemInfo.totalBills + backupInfo.systemInfo.totalInvoices + backupInfo.systemInfo.totalRevenues
            }));
            
            this.updateBackupInfo();
            this.hideLoadingOverlay();
            this.showToast('Backup criado com sucesso!', 'success');
            
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro ao criar backup:', error);
            this.showToast('Erro ao criar backup: ' + error.message, 'error');
        }
    }

    async downloadBackup() {
        try {
            this.showLoadingOverlay('Preparando backup para download...');
            
            const backupData = await this.storageManager.exportData();
            const backupInfo = {
                ...backupData,
                backupDate: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(backupInfo, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `financeai-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.hideLoadingOverlay();
            this.showToast('Backup baixado com sucesso!', 'success');
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro ao baixar backup:', error);
            this.showToast('Erro ao baixar backup: ' + error.message, 'error');
        }
    }

    updateBackupInfo() {
        try {
            const backupInfo = document.getElementById('backupInfo');
            const lastBackupTime = document.getElementById('lastBackupTime');
            
            if (backupInfo && lastBackupTime) {
                const savedBackup = localStorage.getItem('financeai_last_backup');
                if (savedBackup) {
                    const backup = JSON.parse(savedBackup);
                    lastBackupTime.textContent = new Date(backup.date).toLocaleString('pt-BR');
                } else {
                    lastBackupTime.textContent = 'Nunca';
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar info de backup:', error);
        }
    }

    setupPerformanceMonitoring() {
        try {
            this.performanceMetrics = {
                operations: {},
                errors: [],
                startTime: performance.now(),
                lastUpdate: new Date().toISOString()
            };
            
            // Monitor critical operations
            const originalConsoleError = console.error;
            console.error = (...args) => {
                originalConsoleError.apply(console, args);
                if (this.performanceMetrics && this.performanceMetrics.errors) {
                    this.performanceMetrics.errors.push({
                        message: args.join(' '),
                        timestamp: new Date().toISOString(),
                        stack: new Error().stack
                    });
                }
            };
        } catch (error) {
            console.error('Erro ao configurar monitoramento de performance:', error);
        }
    }

    verifyDataIntegrityPeriodically() {
        try {
            // Run integrity check every 10 minutes
            setInterval(async () => {
                try {
                    const integrity = await this.verifyDataIntegrity();
                    if (!integrity.isValid) {
                        console.warn('Problemas de integridade detectados:', integrity.issues);
                        // Could show a subtle notification to user
                    }
                } catch (error) {
                    console.error('Erro na verificação de integridade:', error);
                }
            }, 600000); // 10 minutes
        } catch (error) {
            console.error('Erro ao configurar verificação de integridade:', error);
        }
    }

    async handleAddBill(e) {
        e.preventDefault();
        
        try {
            const form = e.target;
            const formData = new FormData(form);
            
            const billData = {
                id: this.editingBillId || Date.now(),
                name: formData.get('billName') || document.getElementById('billName').value,
                amount: parseFloat(formData.get('billAmount') || document.getElementById('billAmount').value),
                dueDate: formData.get('billDueDate') || document.getElementById('billDueDate').value,
                category: formData.get('billCategory') || document.getElementById('billCategory').value,
                barcode: formData.get('billBarcode') || document.getElementById('billBarcode').value,
                status: 'pending',
                createdAt: this.editingBillId ? 
                    this.bills.find(b => b.id === this.editingBillId)?.createdAt || new Date().toISOString() :
                    new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Validation
            if (!billData.name || !billData.amount || !billData.dueDate) {
                this.showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            if (billData.amount <= 0) {
                this.showToast('O valor deve ser maior que zero', 'error');
                return;
            }
            
            // Check if editing
            if (this.editingBillId) {
                const index = this.bills.findIndex(bill => bill.id === this.editingBillId);
                if (index !== -1) {
                    this.bills[index] = billData;
                }
                delete this.editingBillId;
            } else {
                this.bills.push(billData);
            }
            
            await this.saveData();
            this.renderBills();
            closeModal('addBillModal');
            this.showToast('Boleto salvo com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao adicionar boleto:', error);
            this.showToast('Erro ao salvar boleto: ' + error.message, 'error');
        }
    }

    async handleAddInvoice(e) {
        e.preventDefault();
        
        try {
            const form = e.target;
            const formData = new FormData(form);
            
            const invoiceData = {
                id: this.editingInvoiceId || Date.now(),
                number: formData.get('invoiceNumber') || document.getElementById('invoiceNumber').value,
                supplier: formData.get('invoiceSupplier') || document.getElementById('invoiceSupplier').value,
                amount: parseFloat(formData.get('invoiceAmount') || document.getElementById('invoiceAmount').value),
                date: formData.get('invoiceDate') || document.getElementById('invoiceDate').value,
                category: formData.get('invoiceCategory') || document.getElementById('invoiceCategory').value,
                status: formData.get('invoiceStatus') || document.getElementById('invoiceStatus').value,
                createdAt: this.editingInvoiceId ? 
                    this.invoices.find(i => i.id === this.editingInvoiceId)?.createdAt || new Date().toISOString() :
                    new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Validation
            if (!invoiceData.number || !invoiceData.supplier || !invoiceData.amount || !invoiceData.date) {
                this.showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            if (invoiceData.amount <= 0) {
                this.showToast('O valor deve ser maior que zero', 'error');
                return;
            }
            
            // Check if editing
            if (this.editingInvoiceId) {
                const index = this.invoices.findIndex(invoice => invoice.id === this.editingInvoiceId);
                if (index !== -1) {
                    this.invoices[index] = invoiceData;
                }
                delete this.editingInvoiceId;
            } else {
                this.invoices.push(invoiceData);
            }
            
            await this.saveData();
            this.renderInvoices();
            closeModal('addInvoiceModal');
            this.showToast('Nota fiscal salva com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao adicionar nota fiscal:', error);
            this.showToast('Erro ao salvar nota fiscal: ' + error.message, 'error');
        }
    }

    async handleAddRevenue(e) {
        e.preventDefault();
        
        try {
            const form = e.target;
            const formData = new FormData(form);
            
            const revenueData = {
                id: this.editingRevenueId || Date.now(),
                description: formData.get('revenueDescription') || document.getElementById('revenueDescription').value,
                amount: parseFloat(formData.get('revenueAmount') || document.getElementById('revenueAmount').value),
                date: formData.get('revenueDate') || document.getElementById('revenueDate').value,
                category: formData.get('revenueCategory') || document.getElementById('revenueCategory').value,
                source: formData.get('revenueSource') || document.getElementById('revenueSource').value,
                notes: formData.get('revenueNotes') || document.getElementById('revenueNotes').value,
                createdAt: this.editingRevenueId ? 
                    this.revenues.find(r => r.id === this.editingRevenueId)?.createdAt || new Date().toISOString() :
                    new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Validation
            if (!revenueData.description || !revenueData.amount || !revenueData.date) {
                this.showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            if (revenueData.amount <= 0) {
                this.showToast('O valor deve ser maior que zero', 'error');
                return;
            }
            
            // Check if editing
            if (this.editingRevenueId) {
                const index = this.revenues.findIndex(revenue => revenue.id === this.editingRevenueId);
                if (index !== -1) {
                    this.revenues[index] = revenueData;
                }
                delete this.editingRevenueId;
            } else {
                this.revenues.push(revenueData);
            }
            
            await this.saveData();
            this.renderRevenues();
            closeModal('addRevenueModal');
            this.showToast('Receita salva com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao adicionar receita:', error);
            this.showToast('Erro ao salvar receita: ' + error.message, 'error');
        }
    }

    async markBillAsPaid(billId) {
        try {
            const bill = this.bills.find(b => b.id == billId);
            if (!bill) {
                this.showToast('Boleto não encontrado', 'error');
                return;
            }
            
            if (bill.status === 'paid') {
                this.showToast('Boleto já está marcado como pago', 'warning');
                return;
            }
            
            bill.status = 'paid';
            bill.paidAt = new Date().toISOString();
            bill.updatedAt = new Date().toISOString();
            
            await this.saveData();
            this.renderBills();
            this.renderDashboard();
            this.showToast(`Boleto "${bill.name}" marcado como pago!`, 'success');
            
        } catch (error) {
            console.error('Erro ao marcar boleto como pago:', error);
            this.showToast('Erro ao marcar boleto como pago', 'error');
        }
    }

    editBill(billId) {
        try {
            const bill = this.bills.find(b => b.id == billId);
            if (!bill) {
                this.showToast('Boleto não encontrado', 'error');
                return;
            }
            
            // Set editing mode
            this.editingBillId = billId;
            
            // Fill form with bill data
            document.getElementById('billName').value = bill.name || '';
            document.getElementById('billAmount').value = bill.amount || '';
            document.getElementById('billDueDate').value = bill.dueDate || '';
            document.getElementById('billCategory').value = bill.category || '';
            document.getElementById('billBarcode').value = bill.barcode || '';
            
            // Open modal
            openAddBillModal();
            
        } catch (error) {
            console.error('Erro ao editar boleto:', error);
            this.showToast('Erro ao carregar dados do boleto', 'error');
        }
    }

    async deleteBill(billId) {
        try {
            const bill = this.bills.find(b => b.id == billId);
            if (!bill) {
                this.showToast('Boleto não encontrado', 'error');
                return;
            }
            
            if (!confirm(`Tem certeza que deseja excluir o boleto "${bill.name}"?`)) {
                return;
            }
            
            this.bills = this.bills.filter(b => b.id != billId);
            await this.saveData();
            this.renderBills();
            this.renderDashboard();
            this.showToast('Boleto excluído com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir boleto:', error);
            this.showToast('Erro ao excluir boleto', 'error');
        }
    }

    toggleDropdown(event, itemId) {
        try {
            event.stopPropagation();
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-content.show').forEach(dropdown => {
                if (dropdown.id !== `dropdown-${itemId}`) {
                    dropdown.classList.remove('show');
                }
            });
            
            // Toggle current dropdown
            const dropdown = document.getElementById(`dropdown-${itemId}`);
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        } catch (error) {
            console.error('Erro ao alternar dropdown:', error);
        }
    }

    renderDashboard() {
        try {
            this.updateDashboardMetrics();
            this.renderCashflowChart();
            this.renderRecentActivities();
        } catch (error) {
            console.error('Erro ao renderizar dashboard:', error);
        }
    }

    updateDashboardMetrics() {
        try {
            const now = new Date();
            const upcomingBills = this.bills.filter(bill => {
                if (!bill || bill.status !== 'pending') return false;
                const dueDate = new Date(bill.dueDate);
                const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                return daysDiff <= 7 && daysDiff >= 0;
            });

            const totalPending = this.bills
                .filter(bill => bill && bill.status === 'pending')
                .reduce((sum, bill) => sum + (bill.amount || 0), 0);

            const totalPaidThisMonth = this.bills
                .filter(bill => {
                    if (!bill || bill.status !== 'paid' || !bill.paidAt) return false;
                    const paidDate = new Date(bill.paidAt);
                    return paidDate.getMonth() === now.getMonth() && 
                           paidDate.getFullYear() === now.getFullYear();
                })
                .reduce((sum, bill) => sum + (bill.amount || 0), 0);

            const totalDocuments = this.bills.length + this.invoices.length + this.revenues.length;

            // Update metric values
            this.updateMetricCard(0, upcomingBills.length, 'Boletos');
            this.updateMetricCard(1, `R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'A pagar');
            this.updateMetricCard(2, `R$ ${totalPaidThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Concluído');
            this.updateMetricCard(3, totalDocuments, 'IA Analytics');
        } catch (error) {
            console.error('Erro ao atualizar métricas:', error);
        }
    }

    updateMetricCard(index, value, label) {
        try {
            const cards = document.querySelectorAll('.dashboard-card .metric-value');
            const labels = document.querySelectorAll('.dashboard-card .metric-label');
            
            if (cards[index]) {
                cards[index].textContent = value;
            }
            if (labels[index]) {
                labels[index].textContent = label;
            }
        } catch (error) {
            console.error('Erro ao atualizar card de métrica:', error);
        }
    }

    renderCashflowChart() {
        try {
            const canvas = document.getElementById('cashflowChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.cashflowChart instanceof Chart) {
                window.cashflowChart.destroy();
            }

            // Prepare data for last 6 months
            const monthsData = this.getCashflowData();

            window.cashflowChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: monthsData.labels,
                    datasets: [
                        {
                            label: 'Receitas',
                            data: monthsData.revenues,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Despesas',
                            data: monthsData.expenses,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Saldo',
                            data: monthsData.balance,
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value.toLocaleString('pt-BR');
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': R$ ' + 
                                           context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao renderizar gráfico de fluxo de caixa:', error);
        }
    }

    getCashflowData() {
        try {
            const months = [];
            const revenues = [];
            const expenses = [];
            const balance = [];

            // Get last 6 months
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                
                const monthKey = date.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
                months.push(monthKey);

                // Calculate revenues for this month
                const monthRevenues = this.revenues.filter(revenue => {
                    if (!revenue || !revenue.date) return false;
                    const revenueDate = new Date(revenue.date);
                    return revenueDate.getMonth() === date.getMonth() && 
                           revenueDate.getFullYear() === date.getFullYear();
                }).reduce((sum, revenue) => sum + (revenue.amount || 0), 0);

                // Calculate expenses (bills + invoices) for this month
                const monthBills = this.bills.filter(bill => {
                    if (!bill || !bill.dueDate) return false;
                    const billDate = new Date(bill.dueDate);
                    return billDate.getMonth() === date.getMonth() && 
                           billDate.getFullYear() === date.getFullYear();
                }).reduce((sum, bill) => sum + (bill.amount || 0), 0);

                const monthInvoices = this.invoices.filter(invoice => {
                    if (!invoice || !invoice.date) return false;
                    const invoiceDate = new Date(invoice.date);
                    return invoiceDate.getMonth() === date.getMonth() && 
                           invoiceDate.getFullYear() === date.getFullYear();
                }).reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

                const monthExpenses = monthBills + monthInvoices;
                const monthBalance = monthRevenues - monthExpenses;

                revenues.push(monthRevenues);
                expenses.push(monthExpenses);
                balance.push(monthBalance);
            }

            return {
                labels: months,
                revenues: revenues,
                expenses: expenses,
                balance: balance
            };
        } catch (error) {
            console.error('Erro ao calcular dados de fluxo de caixa:', error);
            return {
                labels: [],
                revenues: [],
                expenses: [],
                balance: []
            };
        }
    }

    renderRecentActivities() {
        try {
            const activityList = document.getElementById('activityList');
            if (!activityList) return;

            // Combine all activities
            const activities = [];

            // Add bills
            this.bills.forEach(bill => {
                if (bill && bill.createdAt) {
                    activities.push({
                        type: 'bill',
                        title: `Boleto adicionado: ${bill.name}`,
                        time: bill.createdAt,
                        icon: 'file-invoice-dollar',
                        color: '#f59e0b'
                    });
                }
                if (bill && bill.paidAt) {
                    activities.push({
                        type: 'payment',
                        title: `Boleto pago: ${bill.name}`,
                        time: bill.paidAt,
                        icon: 'check-circle',
                        color: '#10b981'
                    });
                }
            });

            // Add invoices
            this.invoices.forEach(invoice => {
                if (invoice && invoice.createdAt) {
                    activities.push({
                        type: 'invoice',
                        title: `Nota fiscal: ${invoice.number}`,
                        time: invoice.createdAt,
                        icon: 'receipt',
                        color: '#2563eb'
                    });
                }
            });

            // Add revenues
            this.revenues.forEach(revenue => {
                if (revenue && revenue.createdAt) {
                    activities.push({
                        type: 'revenue',
                        title: `Receita: ${revenue.description}`,
                        time: revenue.createdAt,
                        icon: 'coins',
                        color: '#10b981'
                    });
                }
            });

            // Sort by time (most recent first) and take last 10
            activities.sort((a, b) => new Date(b.time) - new Date(a.time));
            const recentActivities = activities.slice(0, 10);

            if (recentActivities.length === 0) {
                activityList.innerHTML = `
                    <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        <i class="fas fa-history" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p>Nenhuma atividade recente</p>
                    </div>
                `;
                return;
            }

            activityList.innerHTML = recentActivities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon" style="background-color: ${activity.color};">
                        <i class="fas fa-${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${this.escapeHtml(activity.title)}</div>
                        <div class="activity-time">${this.formatRelativeTime(activity.time)}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Erro ao renderizar atividades recentes:', error);
        }
    }

    formatRelativeTime(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            if (diffDays > 0) {
                return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
            } else if (diffHours > 0) {
                return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
            } else if (diffMinutes > 0) {
                return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''} atrás`;
            } else {
                return 'Agora mesmo';
            }
        } catch (error) {
            return 'Data inválida';
        }
    }

    renderBills() {
        try {
            const billsList = document.getElementById('billsList');
            if (!billsList) {
                console.warn('Elemento billsList não encontrado');
                return;
            }

            if (!Array.isArray(this.bills) || this.bills.length === 0) {
                billsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Nenhum boleto encontrado.</p>
                        <small style="margin-top: 0.5rem; display: block; opacity: 0.7;">
                            Use o botão "Adicionar Boleto" para começar
                        </small>
                    </div>
                `;
                return;
            }

            // Filter bills based on settings with improved logic
            let filteredBills = [...this.bills];
            if (!this.settings.showPaidBills) {
                filteredBills = filteredBills.filter(bill => bill.status !== 'paid');
            }

            // Enhanced sorting: overdue first, then by due date
            filteredBills.sort((a, b) => {
                const isOverdueA = this.isBillOverdue(a);
                const isOverdueB = this.isBillOverdue(b);
                
                if (isOverdueA && !isOverdueB) return -1;
                if (!isOverdueA && isOverdueB) return 1;
                
                const dateA = new Date(a.dueDate);
                const dateB = new Date(b.dueDate);
                return dateA - dateB;
            });

            billsList.innerHTML = filteredBills.map(bill => {
                if (!this.validateBillData(bill)) return '';
                
                const isOverdue = this.isBillOverdue(bill);
                const daysUntilDue = this.getDaysUntilDue(bill.dueDate);
                const isPaid = bill.status === 'paid';
                
                return `
                    <div class="bill-item ${this.settings.compactView ? 'compact' : ''} ${isOverdue ? 'overdue' : ''} ${isPaid ? 'paid' : ''}" 
                         data-bill-id="${bill.id}">
                        <div class="item-header">
                            <h3 class="item-title">${this.escapeHtml(bill.name)}</h3>
                            <div class="item-status-container">
                                <span class="item-status status-${bill.status}">
                                    ${this.getStatusText(bill.status)}
                                </span>
                                ${isPaid ? `
                                    <div class="dropdown-menu">
                                        <button class="dropdown-toggle" onclick="financeAI.toggleDropdown(event, '${bill.id}')">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                        <div class="dropdown-content" id="dropdown-${bill.id}">
                                            <button onclick="financeAI.editBill('${bill.id}')">
                                                <i class="fas fa-edit"></i> Editar
                                            </button>
                                            <button onclick="financeAI.deleteBill('${bill.id}')">
                                                <i class="fas fa-trash"></i> Excluir
                                            </button>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        ${!this.settings.compactView ? `
                            <div class="item-details">
                                <div class="detail-item">
                                    <span class="detail-label">Valor</span>
                                    <span class="detail-value amount">R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Vencimento</span>
                                    <span class="detail-value ${isOverdue ? 'text-danger' : ''}">${this.formatDate(bill.dueDate)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Categoria</span>
                                    <span class="detail-value">${this.getCategoryText(bill.category)}</span>
                                </div>
                                ${daysUntilDue !== null && !isPaid ? `
                                    <div class="detail-item">
                                        <span class="detail-label">Status</span>
                                        <span class="detail-value ${daysUntilDue < 0 ? 'text-danger' : daysUntilDue <= 3 ? 'text-warning' : 'text-success'}">
                                            ${daysUntilDue < 0 ? `Vencido há ${Math.abs(daysUntilDue)} dias` : 
                                              daysUntilDue === 0 ? 'Vence hoje' : 
                                              `Vence em ${daysUntilDue} dias`}
                                        </span>
                                    </div>
                                ` : ''}
                                ${isPaid && bill.paidAt ? `
                                    <div class="detail-item">
                                        <span class="detail-label">Pago em</span>
                                        <span class="detail-value text-success">${this.formatDate(bill.paidAt)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        ` : `
                            <div class="compact-details">
                                <span class="compact-amount">R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span class="compact-date ${isOverdue ? 'text-danger' : ''}">${this.formatDate(bill.dueDate)}</span>
                            </div>
                        `}
                        <div class="item-actions">
                            ${!isPaid ? `
                                <button class="btn-sm btn-success" onclick="financeAI.markBillAsPaid('${bill.id}')">
                                    <i class="fas fa-check"></i> Marcar Pago
                                </button>
                                <button class="btn-sm btn-warning" onclick="financeAI.editBill('${bill.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn-sm btn-danger" onclick="financeAI.deleteBill('${bill.id}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            ` : `
                                <span class="text-success" style="font-size: 0.875rem; font-weight: 500;">
                                    <i class="fas fa-check-circle"></i> Boleto pago
                                </span>
                            `}
                        </div>
                    </div>
                `;
            }).filter(html => html).join('');

            // Add filter controls with improved UI
            this.addBillFilters();
            
            // Add summary info
            this.addBillsSummary(filteredBills);
        } catch (error) {
            console.error('Erro ao renderizar boletos:', error);
            const billsList = document.getElementById('billsList');
            if (billsList) {
                billsList.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Erro ao carregar boletos.</p>
                        <button class="btn btn-primary" onclick="financeAI.renderBills()" style="margin-top: 1rem;">
                            <i class="fas fa-refresh"></i> Tentar Novamente
                        </button>
                    </div>
                `;
            }
        }
    }

    addBillsSummary(bills) {
        try {
            const billsSection = document.getElementById('bills-section');
            if (!billsSection) return;

            // Remove existing summary
            const existingSummary = billsSection.querySelector('.bills-summary');
            if (existingSummary) {
                existingSummary.remove();
            }

            const pendingBills = bills.filter(bill => bill.status === 'pending');
            const overdueBills = bills.filter(bill => this.isBillOverdue(bill));
            const paidBills = bills.filter(bill => bill.status === 'paid');
            
            const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
            const totalOverdue = overdueBills.reduce((sum, bill) => sum + bill.amount, 0);
            const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amount, 0);

            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'bills-summary financial-summary';
            summaryDiv.innerHTML = `
                <div class="summary-card neutral">
                    <div class="summary-value">${bills.length}</div>
                    <div class="summary-label">Total de Boletos</div>
                </div>
                <div class="summary-card ${totalPending > 0 ? 'negative' : 'neutral'}">
                    <div class="summary-value">R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div class="summary-label">Pendentes (${pendingBills.length})</div>
                </div>
                <div class="summary-card ${totalOverdue > 0 ? 'negative' : 'neutral'}">
                    <div class="summary-value">R$ ${totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div class="summary-label">Vencidos (${overdueBills.length})</div>
                </div>
                <div class="summary-card ${totalPaid > 0 ? 'positive' : 'neutral'}">
                    <div class="summary-value">R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div class="summary-label">Pagos (${paidBills.length})</div>
                </div>
            `;

            const billsList = document.getElementById('billsList');
            if (billsList) {
                billsList.insertAdjacentElement('beforebegin', summaryDiv);
            }
        } catch (error) {
            console.error('Erro ao adicionar resumo dos boletos:', error);
        }
    }

    async exportFinancialData() {
        try {
            this.showLoadingOverlay('Exportando dados...');
            
            const exportData = await this.storageManager.exportData();
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `financeai-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.hideLoadingOverlay();
            this.showToast('Dados exportados com sucesso!', 'success');
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro ao exportar dados:', error);
            this.showToast('Erro ao exportar dados: ' + error.message, 'error');
        }
    }

    async importFinancialData() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                try {
                    this.showLoadingOverlay('Importando dados...');
                    
                    const text = await this.readFileAsText(file);
                    const importData = JSON.parse(text);
                    
                    // Validate import data structure
                    if (!importData || typeof importData !== 'object') {
                        throw new Error('Arquivo inválido');
                    }
                    
                    // Confirm import
                    if (!confirm('Importar dados irá substituir todos os dados atuais. Deseja continuar?')) {
                        this.hideLoadingOverlay();
                        return;
                    }
                    
                    await this.storageManager.importData(importData);
                    await this.loadData();
                    
                    // Re-render all sections
                    this.renderDashboard();
                    this.renderBills();
                    this.renderInvoices();
                    this.renderRevenues();
                    
                    this.hideLoadingOverlay();
                    this.showToast('Dados importados com sucesso!', 'success');
                } catch (error) {
                    this.hideLoadingOverlay();
                    console.error('Erro ao importar dados:', error);
                    this.showToast('Erro ao importar dados: ' + error.message, 'error');
                }
            };
            
            input.click();
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            this.showToast('Erro ao importar dados', 'error');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    }

    scheduleNotifications() {
        try {
            // Check for notifications every hour
            setInterval(() => {
                this.checkAndSendNotifications();
            }, 3600000); // 1 hour
            
            // Initial check after 30 seconds
            setTimeout(() => {
                this.checkAndSendNotifications();
            }, 30000);
        } catch (error) {
            console.error('Erro ao agendar notificações:', error);
        }
    }

    async checkAndSendNotifications() {
        try {
            if (!this.settings.emailEnabled || !this.settings.emailAddress) {
                return;
            }

            const now = new Date();
            const upcomingBills = this.bills.filter(bill => {
                if (!bill || bill.status !== 'pending' || !bill.dueDate) return false;
                
                const dueDate = new Date(bill.dueDate);
                if (isNaN(dueDate.getTime())) return false;
                
                const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                return daysDiff <= this.settings.reminderDays && daysDiff >= 0;
            });

            const overdueBills = this.bills.filter(bill => this.isBillOverdue(bill));

            if (upcomingBills.length > 0 || overdueBills.length > 0) {
                await this.emailIntegration.sendBulkReminders(
                    [...upcomingBills, ...overdueBills], 
                    this.settings.emailAddress
                );
            }
        } catch (error) {
            console.error('Erro ao verificar e enviar notificações:', error);
        }
    }

    isBillOverdue(bill) {
        try {
            if (!bill || bill.status !== 'pending' || !bill.dueDate) return false;
            const dueDate = new Date(bill.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return dueDate < today;
        } catch (error) {
            return false;
        }
    }

    getDaysUntilDue(dateString) {
        try {
            if (!dateString) return null;
            const dueDate = new Date(dateString);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            return Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        } catch (error) {
            return null;
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'paid': 'Pago',
            'overdue': 'Vencido'
        };
        return statusMap[status] || status;
    }

    getCategoryText(category) {
        const categoryMap = {
            'utilities': 'Utilidades',
            'rent': 'Aluguel',
            'insurance': 'Seguro',
            'taxes': 'Impostos',
            'supplies': 'Suprimentos',
            'services': 'Serviços',
            'equipment': 'Equipamentos',
            'sales': 'Vendas',
            'freelance': 'Freelance',
            'investments': 'Investimentos',
            'rental': 'Aluguel',
            'other': 'Outros'
        };
        return categoryMap[category] || category;
    }

    formatDate(dateString) {
        try {
            if (!dateString) return 'Data inválida';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Data inválida';
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    addBillFilters() {
        try {
            const filters = document.getElementById('billsFilters');
            if (!filters) return;

            // Clear existing filters
            filters.innerHTML = '';
            
            // Add filter buttons
            const filterButtons = document.createElement('div');
            filterButtons.className = 'filter-buttons';
            
            // Add status filter
            const statusFilter = document.createElement('div');
            statusFilter.className = 'filter-group';
            
            const statusOptions = ['pending', 'paid', 'overdue'];
            statusOptions.forEach(status => {
                const button = document.createElement('button');
                button.className = `filter-button ${status === 'pending' ? 'active' : ''}`;
                button.textContent = this.getStatusText(status);
                button.onclick = () => this.applyBillFilter(status);
                statusFilter.appendChild(button);
            });
            
            filterButtons.appendChild(statusFilter);
            
            // Add category filter
            const categoryFilter = document.createElement('div');
            categoryFilter.className = 'filter-group';
            
            const categoryOptions = ['utilities', 'rent', 'insurance', 'taxes', 'supplies', 'services', 'equipment', 'sales', 'freelance', 'investments', 'rental', 'other'];
            categoryOptions.forEach(category => {
                const button = document.createElement('button');
                button.className = `filter-button ${this.settings.showPaidBills ? 'active' : ''}`;
                button.textContent = this.getCategoryText(category);
                button.onclick = () => this.applyBillFilter(category);
                categoryFilter.appendChild(button);
            });
            
            filterButtons.appendChild(categoryFilter);
            
            filters.appendChild(filterButtons);
        } catch (error) {
            console.error('Erro ao adicionar filtros de boletos:', error);
        }
    }

    applyBillFilter(filterType) {
        try {
            // Filter bills based on status or category
            if (['pending', 'paid', 'overdue'].includes(filterType)) {
                this.settings.showPaidBills = filterType === 'paid';
                this.renderBills();
            } else {
                // Filter by category
                this.bills = this.bills.filter(bill => {
                    if (!bill || !bill.category) return false;
                    return this.getCategoryText(bill.category) === filterType;
                });
                this.renderBills();
            }
        } catch (error) {
            console.error('Erro ao aplicar filtro:', error);
        }
    }

    renderInvoices() {
        try {
            const invoicesList = document.getElementById('invoicesList');
            if (!invoicesList) return;

            if (!Array.isArray(this.invoices) || this.invoices.length === 0) {
                invoicesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Nenhuma nota fiscal encontrada.</p>
                        <small style="margin-top: 0.5rem; display: block; opacity: 0.7;">
                            Use o botão "Adicionar Nota" para começar
                        </small>
                    </div>
                `;
                return;
            }

            // Sort invoices by date (most recent first)
            const sortedInvoices = [...this.invoices].sort((a, b) => {
                const dateA = new Date(a.createdAt || a.date);
                const dateB = new Date(b.createdAt || b.date);
                return dateB - dateA;
            });

            invoicesList.innerHTML = sortedInvoices.map(invoice => {
                if (!this.validateInvoiceData(invoice)) return '';
                
                return `
                    <div class="invoice-item ${this.settings.compactView ? 'compact' : ''}" data-invoice-id="${invoice.id}">
                        <div class="item-header">
                            <h3 class="item-title">NF ${this.escapeHtml(invoice.number)}</h3>
                            <span class="item-status status-${invoice.status || 'received'}">
                                ${invoice.status === 'received' ? 'Recebida' : 'Pendente'}
                            </span>
                        </div>
                        ${!this.settings.compactView ? `
                            <div class="item-details">
                                <div class="detail-item">
                                    <span class="detail-label">Fornecedor</span>
                                    <span class="detail-value">${this.escapeHtml(invoice.supplier)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Valor</span>
                                    <span class="detail-value amount">R$ ${invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Data</span>
                                    <span class="detail-value">${this.formatDate(invoice.date)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Categoria</span>
                                    <span class="detail-value">${this.getCategoryText(invoice.category)}</span>
                                </div>
                            </div>
                        ` : `
                            <div class="compact-details">
                                <span class="compact-amount">R$ ${invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span class="compact-date">${this.formatDate(invoice.date)}</span>
                            </div>
                        `}
                        <div class="item-actions">
                            <button class="btn-sm btn-warning" onclick="financeAI.editInvoice('${invoice.id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn-sm btn-danger" onclick="financeAI.deleteInvoice('${invoice.id}')">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                `;
            }).filter(html => html).join('');

        } catch (error) {
            console.error('Erro ao renderizar notas fiscais:', error);
            const invoicesList = document.getElementById('invoicesList');
            if (invoicesList) {
                invoicesList.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Erro ao carregar notas fiscais.</p>
                        <button class="btn btn-primary" onclick="financeAI.renderInvoices()" style="margin-top: 1rem;">
                            <i class="fas fa-refresh"></i> Tentar Novamente
                        </button>
                    </div>
                `;
            }
        }
    }

    editInvoice(invoiceId) {
        try {
            const invoice = this.invoices.find(i => i.id == invoiceId);
            if (!invoice) {
                this.showToast('Nota fiscal não encontrada', 'error');
                return;
            }
            
            // Set editing mode
            this.editingInvoiceId = invoiceId;
            
            // Fill form with invoice data
            document.getElementById('invoiceNumber').value = invoice.number || '';
            document.getElementById('invoiceSupplier').value = invoice.supplier || '';
            document.getElementById('invoiceAmount').value = invoice.amount || '';
            document.getElementById('invoiceDate').value = invoice.date || '';
            document.getElementById('invoiceCategory').value = invoice.category || '';
            document.getElementById('invoiceStatus').value = invoice.status || '';
            
            // Open modal
            openAddInvoiceModal();
            
        } catch (error) {
            console.error('Erro ao editar nota fiscal:', error);
            this.showToast('Erro ao carregar dados da nota fiscal', 'error');
        }
    }

    async deleteInvoice(invoiceId) {
        try {
            const invoice = this.invoices.find(i => i.id == invoiceId);
            if (!invoice) {
                this.showToast('Nota fiscal não encontrada', 'error');
                return;
            }
            
            if (!confirm(`Tem certeza que deseja excluir a nota fiscal "${invoice.number}"?`)) {
                return;
            }
            
            this.invoices = this.invoices.filter(i => i.id != invoiceId);
            await this.saveData();
            this.renderInvoices();
            this.renderDashboard();
            this.showToast('Nota fiscal excluída com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir nota fiscal:', error);
            this.showToast('Erro ao excluir nota fiscal', 'error');
        }
    }

    renderRevenues() {
        try {
            const revenuesList = document.getElementById('revenuesList');
            if (!revenuesList) return;

            if (!Array.isArray(this.revenues) || this.revenues.length === 0) {
                revenuesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-coins"></i>
                        <p>Nenhuma receita encontrada.</p>
                        <small style="margin-top: 0.5rem; display: block; opacity: 0.7;">
                            Use o botão "Adicionar Receita" para começar
                        </small>
                    </div>
                `;
                return;
            }

            // Sort revenues by date (most recent first)
            const sortedRevenues = [...this.revenues].sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            });

            revenuesList.innerHTML = sortedRevenues.map(revenue => {
                if (!this.validateRevenueData(revenue)) return '';
                
                return `
                    <div class="invoice-item ${this.settings.compactView ? 'compact' : ''}" data-revenue-id="${revenue.id}">
                        <div class="item-header">
                            <h3 class="item-title text-success">${this.escapeHtml(revenue.description)}</h3>
                            <span class="item-status status-paid">
                                Receita
                            </span>
                        </div>
                        ${!this.settings.compactView ? `
                            <div class="item-details">
                                <div class="detail-item">
                                    <span class="detail-label">Valor</span>
                                    <span class="detail-value amount text-success">R$ ${revenue.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Data</span>
                                    <span class="detail-value">${this.formatDate(revenue.date)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Categoria</span>
                                    <span class="detail-value">${this.getCategoryText(revenue.category)}</span>
                                </div>
                                ${revenue.source ? `
                                    <div class="detail-item">
                                        <span class="detail-label">Fonte</span>
                                        <span class="detail-value">${this.escapeHtml(revenue.source)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        ` : `
                            <div class="compact-details">
                                <span class="compact-amount text-success">R$ ${revenue.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span class="compact-date">${this.formatDate(revenue.date)}</span>
                            </div>
                        `}
                        ${revenue.notes ? `
                            <div style="margin: 0.5rem 0; padding: 0.5rem; background: var(--background-color); border-radius: 4px; font-size: 0.875rem; color: var(--text-secondary);">
                                <strong>Observações:</strong> ${this.escapeHtml(revenue.notes)}
                            </div>
                        ` : ''}
                        <div class="item-actions">
                            <button class="btn-sm btn-warning" onclick="financeAI.editRevenue('${revenue.id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn-sm btn-danger" onclick="financeAI.deleteRevenue('${revenue.id}')">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                `;
            }).filter(html => html).join('');

        } catch (error) {
            console.error('Erro ao renderizar receitas:', error);
            const revenuesList = document.getElementById('revenuesList');
            if (revenuesList) {
                revenuesList.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Erro ao carregar receitas.</p>
                        <button class="btn btn-primary" onclick="financeAI.renderRevenues()" style="margin-top: 1rem;">
                            <i class="fas fa-refresh"></i> Tentar Novamente
                        </button>
                    </div>
                `;
            }
        }
    }

    editRevenue(revenueId) {
        try {
            const revenue = this.revenues.find(r => r.id == revenueId);
            if (!revenue) {
                this.showToast('Receita não encontrada', 'error');
                return;
            }
            
            // Set editing mode
            this.editingRevenueId = revenueId;
            
            // Fill form with revenue data
            document.getElementById('revenueDescription').value = revenue.description || '';
            document.getElementById('revenueAmount').value = revenue.amount || '';
            document.getElementById('revenueDate').value = revenue.date || '';
            document.getElementById('revenueCategory').value = revenue.category || '';
            document.getElementById('revenueSource').value = revenue.source || '';
            document.getElementById('revenueNotes').value = revenue.notes || '';
            
            // Open modal
            openAddRevenueModal();
            
        } catch (error) {
            console.error('Erro ao editar receita:', error);
            this.showToast('Erro ao carregar dados da receita', 'error');
        }
    }

    async deleteRevenue(revenueId) {
        try {
            const revenue = this.revenues.find(r => r.id == revenueId);
            if (!revenue) {
                this.showToast('Receita não encontrada', 'error');
                return;
            }
            
            if (!confirm(`Tem certeza que deseja excluir a receita "${revenue.description}"?`)) {
                return;
            }
            
            this.revenues = this.revenues.filter(r => r.id != revenueId);
            await this.saveData();
            this.renderRevenues();
            this.renderDashboard();
            this.showToast('Receita excluída com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir receita:', error);
            this.showToast('Erro ao excluir receita', 'error');
        }
    }

    renderNotifications() {
        try {
            const notificationsList = document.getElementById('notificationsList');
            if (!notificationsList) return;

            // Generate notifications
            const notifications = this.generateNotifications();

            if (notifications.length === 0) {
                notificationsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-bell"></i>
                        <p>Nenhuma notificação no momento.</p>
                        <small style="margin-top: 0.5rem; display: block; opacity: 0.7;">
                            Você será notificado sobre vencimentos e atualizações importantes
                        </small>
                    </div>
                `;
                return;
            }

            notificationsList.innerHTML = notifications.map(notification => `
                <div class="notification-item ${notification.type}">
                    <div class="notification-header">
                        <span class="notification-title">${notification.title}</span>
                        <span class="notification-time">${this.formatRelativeTime(notification.time)}</span>
                    </div>
                    <div class="notification-message">${notification.message}</div>
                </div>
            `).join('');

            // Update notification count in header
            const notificationCount = document.querySelector('.notification-count');
            if (notificationCount) {
                notificationCount.textContent = notifications.length;
                notificationCount.style.display = notifications.length > 0 ? 'block' : 'none';
            }

        } catch (error) {
            console.error('Erro ao renderizar notificações:', error);
        }
    }

    generateNotifications() {
        try {
            const notifications = [];
            const now = new Date();

            // Check for overdue bills
            const overdueBills = this.bills.filter(bill => this.isBillOverdue(bill));
            if (overdueBills.length > 0) {
                notifications.push({
                    type: 'danger',
                    title: 'Boletos Vencidos',
                    message: `${overdueBills.length} boletos estão vencidos. Verifique e efetue os pagamentos para evitar juros.`,
                    time: now.toISOString()
                });
            }

            // Check for upcoming bills
            const upcomingBills = this.bills.filter(bill => {
                if (!bill || bill.status !== 'pending') return false;
                const daysUntil = this.getDaysUntilDue(bill.dueDate);
                return daysUntil > 0 && daysUntil <= 3;
            });

            if (upcomingBills.length > 0) {
                notifications.push({
                    type: 'warning',
                    title: 'Vencimentos Próximos',
                    message: `${upcomingBills.length} boletos vencem nos próximos 3 dias. Organize-se para os pagamentos.`,
                    time: now.toISOString()
                });
            }

            // Check for high monthly expenses
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const monthlyExpenses = [...this.bills, ...this.invoices]
                .filter(item => {
                    if (!item) return false;
                    const date = new Date(item.dueDate || item.date);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                })
                .reduce((sum, item) => sum + (item.amount || 0), 0);

            if (monthlyExpenses > 10000) {
                notifications.push({
                    type: 'info',
                    title: 'Alto Volume de Gastos',
                    message: `Seus gastos deste mês totalizam R$ ${monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Monitore seus gastos.`,
                    time: now.toISOString()
                });
            }

            return notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

        } catch (error) {
            console.error('Erro ao gerar notificações:', error);
            return [];
        }
    }

    renderSettings() {
        try {
            // Update storage info
            this.updateStorageInfo();
            this.updateBackupInfo();
            
            // Load current settings into form
            const autoBackup = document.getElementById('autoBackup');
            if (autoBackup) {
                autoBackup.checked = this.settings.autoBackup;
            }
            
            const defaultReportPeriod = document.getElementById('defaultReportPeriod');
            if (defaultReportPeriod) {
                defaultReportPeriod.value = this.settings.defaultReportPeriod;
            }
            
            const showPaidBills = document.getElementById('showPaidBills');
            if (showPaidBills) {
                showPaidBills.checked = this.settings.showPaidBills;
            }
            
            const compactView = document.getElementById('compactView');
            if (compactView) {
                compactView.checked = this.settings.compactView;
            }

        } catch (error) {
            console.error('Erro ao renderizar configurações:', error);
        }
    }

    async updateStorageInfo() {
        try {
            const storageInfo = await this.storageManager.getStorageInfo();
            
            const storageTypeElement = document.getElementById('storageType');
            const documentCountElement = document.getElementById('documentCount');
            
            if (storageTypeElement) {
                storageTypeElement.textContent = storageInfo.storageType;
            }
            
            if (documentCountElement) {
                const totalDocs = storageInfo.bills + storageInfo.invoices + storageInfo.revenues;
                documentCountElement.textContent = totalDocs;
            }

        } catch (error) {
            console.error('Erro ao atualizar informações de armazenamento:', error);
        }
    }

    loadDatabaseSettings() {
        try {
            const storageMode = this.storageManager.getStorageMode();
            const mysqlConfig = this.storageManager.getMySQLConfig();
            
            // Update storage mode selector
            const storageModeSelect = document.getElementById('storageMode');
            if (storageModeSelect) {
                storageModeSelect.value = storageMode;
                this.onStorageModeChange(); // Update UI based on current mode
            }
            
            // Load MySQL settings if available
            if (mysqlConfig) {
                const fields = ['mysqlHost', 'mysqlPort', 'mysqlDatabase', 'mysqlUsername', 'mysqlPassword'];
                fields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && mysqlConfig[field.replace('mysql', '').toLowerCase()]) {
                        element.value = mysqlConfig[field.replace('mysql', '').toLowerCase()];
                    }
                });
                
                // Update status
                this.updateMySQLStatus(true, 'Configurado');
            }

        } catch (error) {
            console.error('Erro ao carregar configurações de banco:', error);
        }
    }

    onStorageModeChange() {
        try {
            const storageMode = document.getElementById('storageMode').value;
            const mysqlSettings = document.getElementById('mysqlSettings');
            
            if (mysqlSettings) {
                mysqlSettings.style.display = storageMode === 'mysql' ? 'block' : 'none';
            }

        } catch (error) {
            console.error('Erro ao alterar modo de armazenamento:', error);
        }
    }

    async testMySQLConnection() {
        try {
            const host = document.getElementById('mysqlHost').value;
            const port = document.getElementById('mysqlPort').value;
            const database = document.getElementById('mysqlDatabase').value;
            const username = document.getElementById('mysqlUsername').value;
            const password = document.getElementById('mysqlPassword').value;
            
            if (!host || !database || !username) {
                this.showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            this.updateMySQLStatus(false, 'Testando conexão...');
            
            const config = { host, port, database, username, password };
            const result = await this.storageManager.testMySQLConnection(config);
            
            if (result.success) {
                this.updateMySQLStatus(true, result.message);
                document.getElementById('saveMySQLBtn').disabled = false;
                this.showToast('Conexão testada com sucesso!', 'success');
            } else {
                this.updateMySQLStatus(false, result.message);
                document.getElementById('saveMySQLBtn').disabled = true;
                this.showToast('Erro na conexão: ' + result.message, 'error');
            }

        } catch (error) {
            this.updateMySQLStatus(false, 'Erro no teste de conexão');
            document.getElementById('saveMySQLBtn').disabled = true;
            console.error('Erro ao testar conexão MySQL:', error);
            this.showToast('Erro ao testar conexão', 'error');
        }
    }

    updateMySQLStatus(connected, message) {
        try {
            const statusIndicator = document.getElementById('mysqlStatusIndicator');
            if (statusIndicator) {
                if (connected) {
                    statusIndicator.innerHTML = '<i class="fas fa-circle text-success"></i> ' + message;
                } else {
                    statusIndicator.innerHTML = '<i class="fas fa-circle text-danger"></i> ' + message;
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar status MySQL:', error);
        }
    }

    async saveMySQLConfig() {
        try {
            const host = document.getElementById('mysqlHost').value;
            const port = document.getElementById('mysqlPort').value;
            const database = document.getElementById('mysqlDatabase').value;
            const username = document.getElementById('mysqlUsername').value;
            const password = document.getElementById('mysqlPassword').value;
            
            this.showLoadingOverlay('Migrando para MySQL...');
            
            const config = { host, port, database, username, password };
            await this.storageManager.setStorageMode('mysql', config);
            
            this.hideLoadingOverlay();
            this.updateStorageInfo();
            this.showToast('Migração para MySQL concluída!', 'success');
            
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro ao salvar configuração MySQL:', error);
            this.showToast('Erro na migração: ' + error.message, 'error');
        }
    }

    async switchToLocal() {
        try {
            if (!confirm('Tem certeza que deseja voltar ao armazenamento local? Os dados do MySQL serão migrados.')) {
                return;
            }
            
            this.showLoadingOverlay('Migrando para armazenamento local...');
            
            await this.storageManager.setStorageMode('local');
            
            // Reset MySQL form
            const mysqlFields = ['mysqlHost', 'mysqlPort', 'mysqlDatabase', 'mysqlUsername', 'mysqlPassword'];
            mysqlFields.forEach(field => {
                const element = document.getElementById(field);
                if (element) element.value = '';
            });
            
            document.getElementById('storageMode').value = 'local';
            this.onStorageModeChange();
            
            this.hideLoadingOverlay();
            this.updateStorageInfo();
            this.showToast('Migração para armazenamento local concluída!', 'success');
            
        } catch (error) {
            this.hideLoadingOverlay();
            console.error('Erro ao migrar para local:', error);
            this.showToast('Erro na migração: ' + error.message, 'error');
        }
    }
}

function openAddBillModal() {
    try {
        const modal = document.getElementById('addBillModal');
        if (modal) {
            // Reset form if not editing
            if (!window.financeAI?.editingBillId) {
                const form = document.getElementById('addBillForm');
                if (form) form.reset();
            }
            
            modal.classList.add('active');
            
            // Focus first input
            setTimeout(() => {
                const firstInput = modal.querySelector('input[type="text"]');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    } catch (error) {
        console.error('Erro ao abrir modal de boleto:', error);
    }
}

function openAddInvoiceModal() {
    try {
        const modal = document.getElementById('addInvoiceModal');
        if (modal) {
            // Reset form if not editing
            if (!window.financeAI?.editingInvoiceId) {
                const form = document.getElementById('addInvoiceForm');
                if (form) form.reset();
            }
            
            modal.classList.add('active');
            
            // Focus first input
            setTimeout(() => {
                const firstInput = modal.querySelector('input[type="text"]');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    } catch (error) {
        console.error('Erro ao abrir modal de nota fiscal:', error);
    }
}

function openAddRevenueModal() {
    try {
        const modal = document.getElementById('addRevenueModal');
        if (modal) {
            // Reset form if not editing
            if (!window.financeAI?.editingRevenueId) {
                const form = document.getElementById('addRevenueForm');
                if (form) form.reset();
                
                // Set default date to today
                const dateInput = document.getElementById('revenueDate');
                if (dateInput) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
            }
            
            modal.classList.add('active');
            
            // Focus first input
            setTimeout(() => {
                const firstInput = modal.querySelector('input[type="text"]');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    } catch (error) {
        console.error('Erro ao abrir modal de receita:', error);
    }
}

function closeModal(modalId) {
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Reset editing states
        if (window.financeAI) {
            delete window.financeAI.editingBillId;
            delete window.financeAI.editingInvoiceId;
            delete window.financeAI.editingRevenueId;
        }
    } catch (error) {
        console.error('Erro ao fechar modal:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.financeAI = new FinanceAI();
    } catch (error) {
        console.error('Erro crítico na inicialização:', error);
        
        // Show fallback error message
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
                        text-align: center; z-index: 9999;">
                <h3 style="color: #ef4444; margin-bottom: 1rem;">Erro ao inicializar o sistema</h3>
                <p style="margin-bottom: 1rem;">Ocorreu um erro crítico. Tente recarregar a página.</p>
                <button onclick="location.reload()" style="background: #2563eb; color: white; padding: 0.5rem 1rem; 
                                                          border: none; border-radius: 4px; cursor: pointer;">
                    Recarregar Página
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Add click outside dropdown handler
document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-content.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});