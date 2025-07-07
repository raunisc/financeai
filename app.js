class FinanceAI {
    constructor() {
        this.bills = [];
        this.invoices = [];
        this.revenues = [];
        this.notifications = [];
        this.settings = {
            whatsappEnabled: true,
            whatsappNumber: '',
            reminderDays: 3,
            aiProcessing: true,
            smartCategorization: true,
            duplicateDetection: true
        };
        
        this.aiEngine = new AIEngine();
        this.whatsappIntegration = new WhatsAppIntegration();
        this.fileProcessor = new FileProcessor();
        this.storageManager = new StorageManager();
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.setupNavigation();
            this.renderDashboard();
            this.setupFileUpload();
            this.scheduleNotifications();
            this.isInitialized = true;
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showToast('Erro ao inicializar o sistema', 'error');
        }
    }

    async loadData() {
        try {
            // Load data using the storage manager
            this.bills = await this.storageManager.loadData('bills') || [];
            this.invoices = await this.storageManager.loadData('invoices') || [];
            this.revenues = await this.storageManager.loadData('revenues') || [];

            // Validate and filter data
            this.bills = this.bills.filter(bill => this.validateBillData(bill));
            this.invoices = this.invoices.filter(invoice => this.validateInvoiceData(invoice));
            this.revenues = this.revenues.filter(revenue => this.validateRevenueData(revenue));

            // Load settings
            for (const [key, defaultValue] of Object.entries(this.settings)) {
                this.settings[key] = await this.storageManager.loadSetting(key, defaultValue);
            }

            // If no data exists, create demo data
            if (this.bills.length === 0) {
                this.bills = [
                    {
                        id: 1,
                        name: 'Energia Elétrica',
                        amount: 450.30,
                        dueDate: '2024-01-15',
                        category: 'utilities',
                        status: 'pending',
                        barcode: '8364000012345678901234567890123456789012',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 2,
                        name: 'Aluguel',
                        amount: 2500.00,
                        dueDate: '2024-01-10',
                        category: 'rent',
                        status: 'overdue',
                        barcode: '8364000012345678901234567890123456789013',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 3,
                        name: 'Internet',
                        amount: 89.90,
                        dueDate: '2024-01-20',
                        category: 'utilities',
                        status: 'paid',
                        barcode: '8364000012345678901234567890123456789014',
                        createdAt: new Date().toISOString()
                    }
                ];
            }

            if (this.invoices.length === 0) {
                this.invoices = [
                    {
                        id: 1,
                        number: 'NF-001',
                        supplier: 'Fornecedor ABC',
                        amount: 1250.00,
                        date: '2024-01-05',
                        category: 'supplies',
                        status: 'received',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 2,
                        number: 'NF-002',
                        supplier: 'Serviços XYZ',
                        amount: 850.00,
                        date: '2024-01-08',
                        category: 'services',
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    }
                ];
            }

            if (this.revenues.length === 0) {
                this.revenues = [
                    {
                        id: 1,
                        description: 'Venda de Produto A',
                        amount: 3500.00,
                        date: '2024-01-05',
                        category: 'sales',
                        source: 'Cliente ABC Ltda',
                        notes: 'Venda realizada via e-commerce',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 2,
                        description: 'Consultoria em TI',
                        amount: 2800.00,
                        date: '2024-01-10',
                        category: 'services',
                        source: 'Empresa XYZ',
                        notes: 'Consultoria em infraestrutura',
                        createdAt: new Date().toISOString()
                    }
                ];
            }

            await this.saveData();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showToast('Erro ao carregar dados salvos', 'error');
            // Reset to default data if loading fails
            this.bills = [];
            this.invoices = [];
            this.revenues = [];
        }
    }

    validateBillData(bill) {
        return (
            bill &&
            typeof bill.id !== 'undefined' &&
            typeof bill.name === 'string' &&
            typeof bill.amount === 'number' &&
            bill.amount >= 0 &&
            typeof bill.dueDate === 'string' &&
            typeof bill.category === 'string' &&
            typeof bill.status === 'string' &&
            typeof bill.createdAt === 'string'
        );
    }

    validateInvoiceData(invoice) {
        return (
            invoice &&
            typeof invoice.id !== 'undefined' &&
            typeof invoice.number === 'string' &&
            typeof invoice.supplier === 'string' &&
            typeof invoice.amount === 'number' &&
            invoice.amount >= 0 &&
            typeof invoice.date === 'string' &&
            typeof invoice.category === 'string' &&
            typeof invoice.status === 'string' &&
            typeof invoice.createdAt === 'string'
        );
    }

    validateRevenueData(revenue) {
        return (
            revenue &&
            typeof revenue.id !== 'undefined' &&
            typeof revenue.description === 'string' &&
            typeof revenue.amount === 'number' &&
            revenue.amount >= 0 &&
            typeof revenue.date === 'string' &&
            typeof revenue.category === 'string' &&
            typeof revenue.createdAt === 'string'
        );
    }

    async saveData() {
        try {
            await Promise.all([
                this.storageManager.saveData('bills', this.bills),
                this.storageManager.saveData('invoices', this.invoices),
                this.storageManager.saveData('revenues', this.revenues)
            ]);

            // Save settings
            for (const [key, value] of Object.entries(this.settings)) {
                await this.storageManager.saveSetting(key, value);
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            this.showToast('Erro ao salvar dados', 'error');
        }
    }

    setupEventListeners() {
        try {
            // Form submissions
            const billForm = document.getElementById('addBillForm');
            const invoiceForm = document.getElementById('addInvoiceForm');
            const revenueForm = document.getElementById('addRevenueForm');
            
            if (billForm) {
                billForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addBill();
                });
            }

            if (invoiceForm) {
                invoiceForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addInvoice();
                });
            }

            if (revenueForm) {
                revenueForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addRevenue();
                });
            }

            // Settings with null checks
            const whatsappEnabledEl = document.getElementById('whatsappEnabled');
            const whatsappNumberEl = document.getElementById('whatsappNumber');
            const reminderDaysEl = document.getElementById('reminderDays');

            if (whatsappEnabledEl) {
                whatsappEnabledEl.addEventListener('change', async (e) => {
                    this.settings.whatsappEnabled = e.target.checked;
                    await this.saveData();
                });
            }

            if (whatsappNumberEl) {
                whatsappNumberEl.addEventListener('input', async (e) => {
                    this.settings.whatsappNumber = e.target.value;
                    await this.saveData();
                });
            }

            if (reminderDaysEl) {
                reminderDaysEl.addEventListener('change', async (e) => {
                    this.settings.reminderDays = parseInt(e.target.value) || 3;
                    await this.saveData();
                });
            }

            ['aiProcessing', 'smartCategorization', 'duplicateDetection'].forEach(setting => {
                const element = document.getElementById(setting);
                if (element) {
                    element.addEventListener('change', async (e) => {
                        this.settings[setting] = e.target.checked;
                        await this.saveData();
                    });
                }
            });

            // Load settings values
            this.loadSettings();
        } catch (error) {
            console.error('Erro ao configurar event listeners:', error);
        }
    }

    loadSettings() {
        try {
            const elements = {
                whatsappEnabled: document.getElementById('whatsappEnabled'),
                whatsappNumber: document.getElementById('whatsappNumber'),
                reminderDays: document.getElementById('reminderDays'),
                aiProcessing: document.getElementById('aiProcessing'),
                smartCategorization: document.getElementById('smartCategorization'),
                duplicateDetection: document.getElementById('duplicateDetection')
            };

            Object.entries(elements).forEach(([key, element]) => {
                if (element && this.settings.hasOwnProperty(key)) {
                    if (element.type === 'checkbox') {
                        element.checked = this.settings[key];
                    } else {
                        element.value = this.settings[key];
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.section');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href').substring(1);
                
                // Update active nav
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Update active section
                sections.forEach(s => s.classList.remove('active'));
                document.getElementById(`${target}-section`).classList.add('active');

                // Update page title
                const title = link.textContent.trim();
                document.getElementById('page-title').textContent = title;

                // Render section content
                this.renderSection(target);
            });
        });
    }

    renderSection(section) {
        switch (section) {
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
        }
    }

    renderDashboard() {
        try {
            this.renderCashflowChart();
            this.renderRecentActivities();
            this.updateDashboardMetrics();
        } catch (error) {
            console.error('Erro ao renderizar dashboard:', error);
            this.showToast('Erro ao carregar dashboard', 'error');
        }
    }

    updateDashboardMetrics() {
        try {
            const now = new Date();
            const upcomingBills = this.bills.filter(bill => {
                if (!bill || !bill.dueDate || bill.status !== 'pending') return false;
                const dueDate = new Date(bill.dueDate);
                if (isNaN(dueDate.getTime())) return false;
                const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                return daysDiff <= this.settings.reminderDays && daysDiff >= 0;
            });

            const overdueBills = this.bills.filter(bill => {
                if (!bill || !bill.dueDate || bill.status !== 'pending') return false;
                const dueDate = new Date(bill.dueDate);
                if (isNaN(dueDate.getTime())) return false;
                return dueDate < now;
            });

            const totalOpen = this.bills
                .filter(bill => bill && (bill.status === 'pending' || bill.status === 'overdue') && typeof bill.amount === 'number')
                .reduce((sum, bill) => sum + bill.amount, 0);

            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Calculate total revenues for current month
            const revenuesThisMonth = this.revenues
                .filter(revenue => {
                    if (!revenue || !revenue.date) return false;
                    const revenueDate = new Date(revenue.date);
                    return revenueDate.getMonth() === currentMonth && revenueDate.getFullYear() === currentYear;
                })
                .reduce((sum, revenue) => sum + (revenue.amount || 0), 0);

            const processedDocs = this.bills.length + this.invoices.length + this.revenues.length;

            // Update dashboard cards
            const cards = document.querySelectorAll('.dashboard-card');
            if (cards.length >= 4) {
                // Upcoming bills card
                const upcomingCard = cards[0];
                const upcomingValue = upcomingCard.querySelector('.metric-value');
                const upcomingIcon = upcomingCard.querySelector('.card-header i');
                if (upcomingValue) {
                    const totalUpcoming = upcomingBills.length + overdueBills.length;
                    upcomingValue.textContent = totalUpcoming;
                    if (upcomingIcon) {
                        upcomingIcon.className = overdueBills.length > 0 ? 'fas fa-exclamation-triangle text-danger' : 
                                                totalUpcoming > 0 ? 'fas fa-exclamation-triangle text-warning' : 
                                                'fas fa-check-circle text-success';
                    }
                }

                // Total open card
                const totalCard = cards[1];
                const totalValue = totalCard.querySelector('.metric-value');
                if (totalValue) {
                    totalValue.textContent = `R$ ${totalOpen.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                }

                // Monthly revenues card (changed from paid bills)
                const revenueCard = cards[2];
                const revenueCardHeader = revenueCard.querySelector('.card-header h3');
                const revenueValue = revenueCard.querySelector('.metric-value');
                const revenueLabel = revenueCard.querySelector('.metric-label');
                const revenueIcon = revenueCard.querySelector('.card-header i');
                
                if (revenueCardHeader) revenueCardHeader.textContent = 'Receitas este Mês';
                if (revenueValue) {
                    revenueValue.textContent = `R$ ${revenuesThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                }
                if (revenueLabel) revenueLabel.textContent = 'Recebido';
                if (revenueIcon) revenueIcon.className = 'fas fa-coins text-success';

                // Processed documents card
                const docsCard = cards[3];
                const docsValue = docsCard.querySelector('.metric-value');
                if (docsValue) {
                    docsValue.textContent = processedDocs;
                }
            }

            // Update notification count
            const notificationCountEl = document.querySelector('.notification-count');
            if (notificationCountEl) {
                const totalNotifications = upcomingBills.length + overdueBills.length;
                notificationCountEl.textContent = totalNotifications;
                notificationCountEl.style.display = totalNotifications > 0 ? 'inline' : 'none';
            }
        } catch (error) {
            console.error('Erro ao atualizar métricas:', error);
        }
    }

    renderCashflowChart() {
        try {
            const chartElement = document.getElementById('cashflowChart');
            if (!chartElement) {
                console.warn('Elemento cashflowChart não encontrado');
                return;
            }

            const ctx = chartElement.getContext('2d');
            
            // Generate data for the last 6 months based on actual data
            const months = [];
            const income = [];
            const expenses = [];
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const month = date.getMonth();
                const year = date.getFullYear();
                
                months.push(date.toLocaleDateString('pt-BR', { month: 'short' }));
                
                // Calculate actual revenues for this month
                const monthRevenues = this.revenues
                    .filter(revenue => {
                        if (!revenue || !revenue.date) return false;
                        const revenueDate = new Date(revenue.date);
                        if (isNaN(revenueDate.getTime())) return false;
                        return revenueDate.getMonth() === month && revenueDate.getFullYear() === year;
                    })
                    .reduce((sum, revenue) => sum + (revenue.amount || 0), 0);
                
                // Calculate actual expenses (paid bills + invoices) for this month
                const monthBillExpenses = this.bills
                    .filter(bill => {
                        if (!bill || !bill.dueDate) return false;
                        // For bills, use due date if paid or creation date
                        const billDate = bill.status === 'paid' && bill.paidAt ? 
                            new Date(bill.paidAt) : new Date(bill.dueDate);
                        if (isNaN(billDate.getTime())) return false;
                        return billDate.getMonth() === month && billDate.getFullYear() === year && 
                               (bill.status === 'paid' || bill.status === 'pending');
                    })
                    .reduce((sum, bill) => sum + (bill.amount || 0), 0);

                const monthInvoiceExpenses = this.invoices
                    .filter(invoice => {
                        if (!invoice || !invoice.date) return false;
                        const invoiceDate = new Date(invoice.date);
                        if (isNaN(invoiceDate.getTime())) return false;
                        return invoiceDate.getMonth() === month && invoiceDate.getFullYear() === year;
                    })
                    .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
                
                income.push(monthRevenues);
                expenses.push(monthBillExpenses + monthInvoiceExpenses);
            }

            // Destroy existing chart if it exists
            if (this.cashflowChart) {
                this.cashflowChart.destroy();
            }

            this.cashflowChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Receitas',
                        data: income,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Despesas',
                        data: expenses,
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
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
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += 'R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao renderizar gráfico:', error);
        }
    }

    renderRecentActivities() {
        try {
            const activities = [
                {
                    type: 'bill',
                    title: 'Boleto adicionado',
                    description: 'Energia Elétrica - R$ 450,30',
                    time: '2 horas atrás',
                    icon: 'fas fa-file-invoice-dollar',
                    color: 'var(--primary-color)'
                },
                {
                    type: 'payment',
                    title: 'Pagamento realizado',
                    description: 'Internet - R$ 89,90',
                    time: '1 dia atrás',
                    icon: 'fas fa-check-circle',
                    color: 'var(--success-color)'
                },
                {
                    type: 'reminder',
                    title: 'Lembrete enviado',
                    description: 'Aluguel vence em 2 dias',
                    time: '2 dias atrás',
                    icon: 'fas fa-bell',
                    color: 'var(--warning-color)'
                }
            ];

            const activityList = document.getElementById('activityList');
            if (activityList) {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon" style="background-color: ${activity.color}">
                            <i class="${activity.icon}"></i>
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">${activity.title}</div>
                            <div class="activity-time">${activity.time}</div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Erro ao renderizar atividades:', error);
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
                billsList.innerHTML = '<p>Nenhum boleto encontrado.</p>';
                return;
            }

            billsList.innerHTML = this.bills.map(bill => {
                if (!this.validateBillData(bill)) return '';
                
                return `
                    <div class="bill-item">
                        <div class="item-header">
                            <h3 class="item-title">${this.escapeHtml(bill.name)}</h3>
                            <div class="item-status-container">
                                <span class="item-status status-${bill.status}">
                                    ${this.getStatusText(bill.status)}
                                </span>
                                ${bill.status === 'paid' ? `
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
                        <div class="item-details">
                            <div class="detail-item">
                                <span class="detail-label">Valor</span>
                                <span class="detail-value">R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Vencimento</span>
                                <span class="detail-value">${this.formatDate(bill.dueDate)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Categoria</span>
                                <span class="detail-value">${this.getCategoryText(bill.category)}</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            ${bill.status === 'pending' ? `
                                <button class="btn-sm btn-success" onclick="financeAI.markBillAsPaid('${bill.id}')">
                                    <i class="fas fa-check"></i> Marcar Pago
                                </button>
                                <button class="btn-sm btn-warning" onclick="financeAI.editBill('${bill.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn-sm btn-danger" onclick="financeAI.deleteBill('${bill.id}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            ` : bill.status === 'overdue' ? `
                                <button class="btn-sm btn-success" onclick="financeAI.markBillAsPaid('${bill.id}')">
                                    <i class="fas fa-check"></i> Marcar Pago
                                </button>
                                <button class="btn-sm btn-warning" onclick="financeAI.editBill('${bill.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn-sm btn-danger" onclick="financeAI.deleteBill('${bill.id}')">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).filter(html => html).join('');
        } catch (error) {
            console.error('Erro ao renderizar boletos:', error);
            const billsList = document.getElementById('billsList');
            if (billsList) {
                billsList.innerHTML = '<p>Erro ao carregar boletos.</p>';
            }
        }
    }

    renderInvoices() {
        try {
            const invoicesList = document.getElementById('invoicesList');
            if (!invoicesList) {
                console.warn('Elemento invoicesList não encontrado');
                return;
            }

            if (!Array.isArray(this.invoices) || this.invoices.length === 0) {
                invoicesList.innerHTML = '<p>Nenhuma nota fiscal encontrada.</p>';
                return;
            }

            invoicesList.innerHTML = this.invoices.map(invoice => {
                if (!this.validateInvoiceData(invoice)) return '';
                
                return `
                    <div class="invoice-item">
                        <div class="item-header">
                            <h3 class="item-title">${this.escapeHtml(invoice.number)} - ${this.escapeHtml(invoice.supplier)}</h3>
                            <span class="item-status status-${invoice.status}">
                                ${this.getStatusText(invoice.status)}
                            </span>
                        </div>
                        <div class="item-details">
                            <div class="detail-item">
                                <span class="detail-label">Valor</span>
                                <span class="detail-value">R$ ${invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                        <div class="item-actions">
                            <button class="btn-sm btn-info" onclick="financeAI.toggleInvoiceStatus('${invoice.id}')">
                                <i class="fas fa-sync"></i> ${invoice.status === 'pending' ? 'Marcar Recebido' : 'Marcar Pendente'}
                            </button>
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
                invoicesList.innerHTML = '<p>Erro ao carregar notas fiscais.</p>';
            }
        }
    }

    renderRevenues() {
        try {
            const revenuesList = document.getElementById('revenuesList');
            if (!revenuesList) {
                console.warn('Elemento revenuesList não encontrado');
                return;
            }

            if (!Array.isArray(this.revenues) || this.revenues.length === 0) {
                revenuesList.innerHTML = '<p>Nenhuma receita encontrada.</p>';
                return;
            }

            revenuesList.innerHTML = this.revenues.map(revenue => {
                if (!this.validateRevenueData(revenue)) return '';
                
                return `
                    <div class="revenue-item">
                        <div class="item-header">
                            <h3 class="item-title">${this.escapeHtml(revenue.description)}</h3>
                            <span class="item-amount revenue-amount">
                                R$ ${revenue.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div class="item-details">
                            <div class="detail-item">
                                <span class="detail-label">Data</span>
                                <span class="detail-value">${this.formatDate(revenue.date)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Categoria</span>
                                <span class="detail-value">${this.getRevenueCategoryText(revenue.category)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Fonte</span>
                                <span class="detail-value">${this.escapeHtml(revenue.source || 'Não informado')}</span>
                            </div>
                        </div>
                        ${revenue.notes ? `
                            <div class="revenue-notes">
                                <span class="detail-label">Observações:</span>
                                <p>${this.escapeHtml(revenue.notes)}</p>
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
                revenuesList.innerHTML = '<p>Erro ao carregar receitas.</p>';
            }
        }
    }

    getRevenueCategoryText(category) {
        const categoryMap = {
            'sales': 'Vendas',
            'services': 'Prestação de Serviços',
            'investments': 'Investimentos',
            'rental': 'Aluguel',
            'freelance': 'Freelance',
            'other': 'Outros'
        };
        return categoryMap[category] || category;
    }

    renderNotifications() {
        this.generateNotifications();
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.type}">
                <div class="notification-header">
                    <h3 class="notification-title">${notification.title}</h3>
                    <span class="notification-time">${notification.time}</span>
                </div>
                <p class="notification-message">${notification.message}</p>
            </div>
        `).join('');
    }

    generateNotifications() {
        const now = new Date();
        this.notifications = [];

        // Check for upcoming bills
        this.bills.forEach(bill => {
            if (bill.status === 'pending') {
                const dueDate = new Date(bill.dueDate);
                const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                
                if (daysDiff <= this.settings.reminderDays && daysDiff > 0) {
                    this.notifications.push({
                        type: 'warning',
                        title: 'Vencimento Próximo',
                        message: `${bill.name} vence em ${daysDiff} dias (R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
                        time: 'Agora'
                    });
                } else if (daysDiff <= 0) {
                    this.notifications.push({
                        type: 'danger',
                        title: 'Boleto Vencido',
                        message: `${bill.name} venceu há ${Math.abs(daysDiff)} dias (R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
                        time: 'Agora'
                    });
                }
            }
        });

        // Add system notifications
        this.notifications.push({
            type: 'success',
            title: 'Sistema Atualizado',
            message: 'FinanceAI foi atualizado com novas funcionalidades de IA',
            time: '1 hora atrás'
        });
    }

    async markBillAsPaid(billId) {
        try {
            const bill = this.bills.find(b => b.id == billId);
            if (!bill) {
                throw new Error('Boleto não encontrado');
            }

            bill.status = 'paid';
            bill.paidAt = new Date().toISOString();
            
            await this.saveData();
            this.renderBills();
            this.updateDashboardMetrics();
            this.renderCashflowChart(); // Update chart when bill status changes
            
            this.showToast('Boleto marcado como pago!', 'success');
            
            // Send WhatsApp confirmation if enabled
            if (this.settings.whatsappEnabled && this.settings.whatsappNumber) {
                this.whatsappIntegration.sendPaymentConfirmation(bill, this.settings.whatsappNumber)
                    .catch(error => console.error('Erro ao enviar confirmação WhatsApp:', error));
            }
        } catch (error) {
            console.error('Erro ao marcar boleto como pago:', error);
            this.showToast(error.message || 'Erro ao marcar boleto como pago', 'error');
        }
    }

    async deleteBill(billId) {
        try {
            if (!confirm('Tem certeza que deseja excluir este boleto?')) {
                return;
            }

            const billIndex = this.bills.findIndex(b => b.id == billId);
            if (billIndex === -1) {
                throw new Error('Boleto não encontrado');
            }

            this.bills.splice(billIndex, 1);
            await this.saveData();
            this.renderBills();
            this.updateDashboardMetrics();
            this.renderCashflowChart(); // Update chart when bill is deleted
            
            this.showToast('Boleto excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir boleto:', error);
            this.showToast(error.message || 'Erro ao excluir boleto', 'error');
        }
    }

    editBill(billId) {
        try {
            const bill = this.bills.find(b => b.id == billId);
            if (!bill) {
                throw new Error('Boleto não encontrado');
            }

            // Populate form with bill data
            document.getElementById('billName').value = bill.name || '';
            document.getElementById('billAmount').value = bill.amount || '';
            document.getElementById('billDueDate').value = bill.dueDate || '';
            document.getElementById('billCategory').value = bill.category || 'other';
            const barcodeField = document.getElementById('billBarcode');
            if (barcodeField) {
                barcodeField.value = bill.barcode || '';
            }

            // Store the ID for updating
            this.editingBillId = billId;
            
            // Change form title and button text
            const modalTitle = document.querySelector('#addBillModal .modal-header h3');
            const submitButton = document.querySelector('#addBillForm button[type="submit"]');
            
            if (modalTitle) modalTitle.textContent = 'Editar Boleto';
            if (submitButton) submitButton.textContent = 'Atualizar';

            openAddBillModal();
        } catch (error) {
            console.error('Erro ao editar boleto:', error);
            this.showToast(error.message || 'Erro ao editar boleto', 'error');
        }
    }

    async deleteInvoice(invoiceId) {
        try {
            if (!confirm('Tem certeza que deseja excluir esta nota fiscal?')) {
                return;
            }

            const invoiceIndex = this.invoices.findIndex(i => i.id == invoiceId);
            if (invoiceIndex === -1) {
                throw new Error('Nota fiscal não encontrada');
            }

            this.invoices.splice(invoiceIndex, 1);
            await this.saveData();
            this.renderInvoices();
            this.renderCashflowChart(); // Update chart when invoice is deleted
            
            this.showToast('Nota fiscal excluída com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir nota fiscal:', error);
            this.showToast(error.message || 'Erro ao excluir nota fiscal', 'error');
        }
    }

    editInvoice(invoiceId) {
        try {
            const invoice = this.invoices.find(i => i.id == invoiceId);
            if (!invoice) {
                throw new Error('Nota fiscal não encontrada');
            }

            // Populate form with invoice data
            document.getElementById('invoiceNumber').value = invoice.number || '';
            document.getElementById('invoiceSupplier').value = invoice.supplier || '';
            document.getElementById('invoiceAmount').value = invoice.amount || '';
            document.getElementById('invoiceDate').value = invoice.date || '';
            document.getElementById('invoiceCategory').value = invoice.category || 'other';
            document.getElementById('invoiceStatus').value = invoice.status || 'received';

            // Store the ID for updating
            this.editingInvoiceId = invoiceId;
            
            // Change form title and button text
            const modalTitle = document.querySelector('#addInvoiceModal .modal-header h3');
            const submitButton = document.querySelector('#addInvoiceForm button[type="submit"]');
            
            if (modalTitle) modalTitle.textContent = 'Editar Nota Fiscal';
            if (submitButton) submitButton.textContent = 'Atualizar';

            openAddInvoiceModal();
        } catch (error) {
            console.error('Erro ao editar nota fiscal:', error);
            this.showToast(error.message || 'Erro ao editar nota fiscal', 'error');
        }
    }

    toggleDropdown(event, billId) {
        event.stopPropagation();
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-content').forEach(dropdown => {
            if (dropdown.id !== `dropdown-${billId}`) {
                dropdown.classList.remove('show');
            }
        });
        
        // Toggle current dropdown
        const dropdown = document.getElementById(`dropdown-${billId}`);
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    async toggleInvoiceStatus(invoiceId) {
        try {
            const invoice = this.invoices.find(i => i.id == invoiceId);
            if (!invoice) {
                throw new Error('Nota fiscal não encontrada');
            }

            invoice.status = invoice.status === 'pending' ? 'received' : 'pending';
            invoice.updatedAt = new Date().toISOString();
            
            await this.saveData();
            this.renderInvoices();
            
            this.showToast(`Status da nota fiscal atualizado para ${this.getStatusText(invoice.status)}!`, 'success');
        } catch (error) {
            console.error('Erro ao alterar status da nota fiscal:', error);
            this.showToast(error.message || 'Erro ao alterar status da nota fiscal', 'error');
        }
    }

    async addBill() {
        try {
            const form = document.getElementById('addBillForm');
            if (!form) {
                throw new Error('Formulário não encontrado');
            }

            const formData = new FormData(form);
            const billData = {
                name: formData.get('billName') || document.getElementById('billName')?.value,
                amount: parseFloat(formData.get('billAmount') || document.getElementById('billAmount')?.value),
                dueDate: formData.get('billDueDate') || document.getElementById('billDueDate')?.value,
                category: formData.get('billCategory') || document.getElementById('billCategory')?.value,
                barcode: formData.get('billBarcode') || document.getElementById('billBarcode')?.value || ''
            };

            // Validation
            if (!billData.name || billData.name.trim() === '') {
                throw new Error('Nome do boleto é obrigatório');
            }
            if (!billData.amount || billData.amount <= 0) {
                throw new Error('Valor deve ser maior que zero');
            }
            if (!billData.dueDate) {
                throw new Error('Data de vencimento é obrigatória');
            }

            const bill = {
                id: this.editingBillId || Date.now(),
                name: billData.name.trim(),
                amount: billData.amount,
                dueDate: billData.dueDate,
                category: billData.category || 'other',
                barcode: billData.barcode.trim(),
                status: 'pending',
                createdAt: this.editingBillId ? 
                    this.bills.find(b => b.id == this.editingBillId)?.createdAt || new Date().toISOString() :
                    new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (this.editingBillId) {
                const billIndex = this.bills.findIndex(b => b.id == this.editingBillId);
                if (billIndex !== -1) {
                    // Preserve original status and payment info
                    const originalBill = this.bills[billIndex];
                    bill.status = originalBill.status;
                    if (originalBill.paidAt) {
                        bill.paidAt = originalBill.paidAt;
                    }
                    this.bills[billIndex] = bill;
                }
                this.editingBillId = null;
            } else {
                this.bills.push(bill);
            }

            await this.saveData();
            this.renderBills();
            this.updateDashboardMetrics();
            this.renderCashflowChart(); // Update chart when bill is added/updated
            closeModal('addBillModal');
            form.reset();
            
            this.showToast(this.editingBillId ? 'Boleto atualizado com sucesso!' : 'Boleto adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar/atualizar boleto:', error);
            this.showToast(error.message || 'Erro ao salvar boleto', 'error');
        }
    }

    async addInvoice() {
        try {
            const form = document.getElementById('addInvoiceForm');
            if (!form) {
                throw new Error('Formulário não encontrado');
            }

            const formData = new FormData(form);
            const invoiceData = {
                number: formData.get('invoiceNumber') || document.getElementById('invoiceNumber')?.value,
                supplier: formData.get('invoiceSupplier') || document.getElementById('invoiceSupplier')?.value,
                amount: parseFloat(formData.get('invoiceAmount') || document.getElementById('invoiceAmount')?.value),
                date: formData.get('invoiceDate') || document.getElementById('invoiceDate')?.value,
                category: formData.get('invoiceCategory') || document.getElementById('invoiceCategory')?.value,
                status: formData.get('invoiceStatus') || document.getElementById('invoiceStatus')?.value
            };

            // Validation
            if (!invoiceData.number || invoiceData.number.trim() === '') {
                throw new Error('Número da nota fiscal é obrigatório');
            }
            if (!invoiceData.supplier || invoiceData.supplier.trim() === '') {
                throw new Error('Fornecedor é obrigatório');
            }
            if (!invoiceData.amount || invoiceData.amount <= 0) {
                throw new Error('Valor deve ser maior que zero');
            }
            if (!invoiceData.date) {
                throw new Error('Data é obrigatória');
            }

            const invoice = {
                id: this.editingInvoiceId || Date.now(),
                number: invoiceData.number.trim(),
                supplier: invoiceData.supplier.trim(),
                amount: invoiceData.amount,
                date: invoiceData.date,
                category: invoiceData.category || 'other',
                status: invoiceData.status || 'received',
                createdAt: this.editingInvoiceId ? 
                    this.invoices.find(i => i.id == this.editingInvoiceId)?.createdAt || new Date().toISOString() :
                    new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (this.editingInvoiceId) {
                const invoiceIndex = this.invoices.findIndex(i => i.id == this.editingInvoiceId);
                if (invoiceIndex !== -1) {
                    this.invoices[invoiceIndex] = invoice;
                }
                this.editingInvoiceId = null;
            } else {
                this.invoices.push(invoice);
            }

            await this.saveData();
            this.renderInvoices();
            this.renderCashflowChart(); // Update chart when invoice is added/updated
            closeModal('addInvoiceModal');
            form.reset();
            
            this.showToast(this.editingInvoiceId ? 'Nota fiscal atualizada com sucesso!' : 'Nota fiscal adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar/atualizar nota fiscal:', error);
            this.showToast(error.message || 'Erro ao salvar nota fiscal', 'error');
        }
    }

    async addRevenue() {
        try {
            const form = document.getElementById('addRevenueForm');
            if (!form) {
                throw new Error('Formulário não encontrado');
            }

            const formData = new FormData(form);
            const revenueData = {
                description: formData.get('revenueDescription') || document.getElementById('revenueDescription')?.value,
                amount: parseFloat(formData.get('revenueAmount') || document.getElementById('revenueAmount')?.value),
                date: formData.get('revenueDate') || document.getElementById('revenueDate')?.value,
                category: formData.get('revenueCategory') || document.getElementById('revenueCategory')?.value,
                source: formData.get('revenueSource') || document.getElementById('revenueSource')?.value || '',
                notes: formData.get('revenueNotes') || document.getElementById('revenueNotes')?.value || ''
            };

            // Validation
            if (!revenueData.description || revenueData.description.trim() === '') {
                throw new Error('Descrição da receita é obrigatória');
            }
            if (!revenueData.amount || revenueData.amount <= 0) {
                throw new Error('Valor deve ser maior que zero');
            }
            if (!revenueData.date) {
                throw new Error('Data é obrigatória');
            }

            const revenue = {
                id: this.editingRevenueId || Date.now(),
                description: revenueData.description.trim(),
                amount: revenueData.amount,
                date: revenueData.date,
                category: revenueData.category || 'other',
                source: revenueData.source.trim(),
                notes: revenueData.notes.trim(),
                createdAt: this.editingRevenueId ? 
                    this.revenues.find(r => r.id == this.editingRevenueId)?.createdAt || new Date().toISOString() :
                    new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (this.editingRevenueId) {
                const revenueIndex = this.revenues.findIndex(r => r.id == this.editingRevenueId);
                if (revenueIndex !== -1) {
                    this.revenues[revenueIndex] = revenue;
                }
                this.editingRevenueId = null;
            } else {
                this.revenues.push(revenue);
            }

            await this.saveData();
            this.renderRevenues();
            this.updateDashboardMetrics();
            this.renderCashflowChart(); // Update chart when revenue is added/updated
            closeModal('addRevenueModal');
            form.reset();
            
            this.showToast(this.editingRevenueId ? 'Receita atualizada com sucesso!' : 'Receita adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar/atualizar receita:', error);
            this.showToast(error.message || 'Erro ao salvar receita', 'error');
        }
    }

    editRevenue(revenueId) {
        try {
            const revenue = this.revenues.find(r => r.id == revenueId);
            if (!revenue) {
                throw new Error('Receita não encontrada');
            }

            // Populate form with revenue data
            document.getElementById('revenueDescription').value = revenue.description || '';
            document.getElementById('revenueAmount').value = revenue.amount || '';
            document.getElementById('revenueDate').value = revenue.date || '';
            document.getElementById('revenueCategory').value = revenue.category || 'other';
            document.getElementById('revenueSource').value = revenue.source || '';
            document.getElementById('revenueNotes').value = revenue.notes || '';

            // Store the ID for updating
            this.editingRevenueId = revenueId;
            
            // Change form title and button text
            const modalTitle = document.querySelector('#addRevenueModal .modal-header h3');
            const submitButton = document.querySelector('#addRevenueForm button[type="submit"]');
            
            if (modalTitle) modalTitle.textContent = 'Editar Receita';
            if (submitButton) submitButton.textContent = 'Atualizar';

            openAddRevenueModal();
        } catch (error) {
            console.error('Erro ao editar receita:', error);
            this.showToast(error.message || 'Erro ao editar receita', 'error');
        }
    }

    setupFileUpload() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }

    async handleFiles(files) {
        try {
            const progressContainer = document.getElementById('importProgress');
            if (!progressContainer) {
                throw new Error('Container de progresso não encontrado');
            }
            
            progressContainer.innerHTML = '';

            if (!files || files.length === 0) {
                this.showToast('Nenhum arquivo selecionado', 'warning');
                return;
            }

            for (let file of files) {
                await this.processFile(file, progressContainer);
            }
        } catch (error) {
            console.error('Erro ao processar arquivos:', error);
            this.showToast('Erro ao processar arquivos', 'error');
        }
    }

    async processFile(file, container) {
        if (!file || !container) {
            throw new Error('Arquivo ou container inválido');
        }

        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
            <div class="progress-header">
                <span>${this.escapeHtml(file.name)}</span>
                <span class="progress-status">Processando...</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
        `;
        container.appendChild(progressItem);

        const progressFill = progressItem.querySelector('.progress-fill');
        const progressStatus = progressItem.querySelector('.progress-status');

        try {
            // Simulate processing with AI
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (progressFill) {
                    progressFill.style.width = `${i}%`;
                }
            }

            // Process file with AI engine
            const result = await this.fileProcessor.processFile(file);
            
            if (!result || !result.data) {
                throw new Error('Resultado de processamento inválido');
            }

            if (result.type === 'bill') {
                if (this.validateBillData(result.data)) {
                    this.bills.push(result.data);
                    await this.saveData();
                    this.renderBills();
                } else {
                    throw new Error('Dados do boleto inválidos');
                }
            } else if (result.type === 'invoice') {
                if (this.validateInvoiceData(result.data)) {
                    this.invoices.push(result.data);
                    await this.saveData();
                    this.renderInvoices();
                } else {
                    throw new Error('Dados da nota fiscal inválidos');
                }
            }

            if (progressStatus) {
                progressStatus.textContent = 'Concluído';
                progressStatus.style.color = 'var(--success-color)';
            }
            
            this.showToast(`${file.name} processado com sucesso!`, 'success');
        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            if (progressStatus) {
                progressStatus.textContent = 'Erro';
                progressStatus.style.color = 'var(--danger-color)';
            }
            this.showToast(`Erro ao processar ${file.name}: ${error.message}`, 'error');
        }
    }

    scheduleNotifications() {
        // Check for notifications every hour
        setInterval(() => {
            this.checkUpcomingBills();
        }, 3600000); // 1 hour

        // Initial check
        this.checkUpcomingBills();
    }

    checkUpcomingBills() {
        if (!this.settings.whatsappEnabled || !this.isInitialized) return;

        try {
            const now = new Date();
            const upcomingBills = this.bills.filter(bill => {
                if (!bill || bill.status !== 'pending' || !bill.dueDate) return false;
                
                const dueDate = new Date(bill.dueDate);
                if (isNaN(dueDate.getTime())) return false;
                
                const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                
                return daysDiff === this.settings.reminderDays;
            });

            upcomingBills.forEach(bill => {
                if (this.settings.whatsappNumber) {
                    this.whatsappIntegration.sendReminder(bill, this.settings.whatsappNumber)
                        .catch(error => {
                            console.error('Erro ao enviar lembrete WhatsApp:', error);
                        });
                }
            });
        } catch (error) {
            console.error('Erro ao verificar boletos próximos do vencimento:', error);
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'paid': 'Pago',
            'overdue': 'Vencido',
            'received': 'Recebido'
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

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        try {
            if (!message) return;
            
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                background: var(--surface-color);
                border-left: 4px solid var(--${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'}-color);
                border-radius: var(--radius);
                box-shadow: var(--shadow-lg);
                z-index: 1001;
                animation: slideIn 0.3s ease;
                max-width: 300px;
                word-wrap: break-word;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 3000);
        } catch (error) {
            console.error('Erro ao exibir toast:', error);
        }
    }

    async deleteRevenue(revenueId) {
        try {
            if (!confirm('Tem certeza que deseja excluir esta receita?')) {
                return;
            }

            const revenueIndex = this.revenues.findIndex(r => r.id == revenueId);
            if (revenueIndex === -1) {
                throw new Error('Receita não encontrada');
            }

            this.revenues.splice(revenueIndex, 1);
            await this.saveData();
            this.renderRevenues();
            this.updateDashboardMetrics();
            this.renderCashflowChart(); // Update chart when revenue is deleted
            
            this.showToast('Receita excluída com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir receita:', error);
            this.showToast(error.message || 'Erro ao excluir receita', 'error');
        }
    }

    generateFinancialSummary() {
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();

            // Calculate monthly totals
            const monthlyRevenues = this.revenues
                .filter(revenue => {
                    const revenueDate = new Date(revenue.date);
                    return revenueDate.getMonth() === currentMonth && revenueDate.getFullYear() === currentYear;
                })
                .reduce((sum, revenue) => sum + revenue.amount, 0);

            const monthlyExpenses = this.bills
                .filter(bill => {
                    const billDate = new Date(bill.dueDate);
                    return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
                })
                .reduce((sum, bill) => sum + bill.amount, 0);

            const monthlyInvoices = this.invoices
                .filter(invoice => {
                    const invoiceDate = new Date(invoice.date);
                    return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
                })
                .reduce((sum, invoice) => sum + invoice.amount, 0);

            const netCashFlow = monthlyRevenues - (monthlyExpenses + monthlyInvoices);

            return {
                monthlyRevenues,
                monthlyExpenses: monthlyExpenses + monthlyInvoices,
                netCashFlow,
                totalPendingBills: this.bills.filter(bill => bill.status === 'pending').length,
                totalOverdueBills: this.bills.filter(bill => {
                    const dueDate = new Date(bill.dueDate);
                    return bill.status === 'pending' && dueDate < currentDate;
                }).length
            };
        } catch (error) {
            console.error('Erro ao gerar resumo financeiro:', error);
            return {
                monthlyRevenues: 0,
                monthlyExpenses: 0,
                netCashFlow: 0,
                totalPendingBills: 0,
                totalOverdueBills: 0
            };
        }
    }

    async exportFinancialData() {
        try {
            const data = await this.storageManager.exportData();
            const summary = this.generateFinancialSummary();
            
            const exportData = {
                ...data,
                summary,
                exportedAt: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `financeai-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Dados exportados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            this.showToast('Erro ao exportar dados', 'error');
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

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        
                        if (!data || !data.bills && !data.invoices && !data.revenues) {
                            throw new Error('Formato de arquivo inválido');
                        }

                        await this.storageManager.importData(data);
                        await this.loadData();
                        
                        this.renderSection('dashboard');
                        this.renderSection('bills');
                        this.renderSection('invoices');
                        this.renderSection('revenues');
                        
                        this.showToast('Dados importados com sucesso!', 'success');
                    } catch (error) {
                        console.error('Erro ao importar dados:', error);
                        this.showToast('Erro ao importar dados: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
            };
            
            input.click();
        } catch (error) {
            console.error('Erro ao iniciar importação:', error);
            this.showToast('Erro ao iniciar importação', 'error');
        }
    }
}

// Modal functions with error handling
function openAddBillModal() {
    try {
        const modal = document.getElementById('addBillModal');
        if (modal) {
            modal.classList.add('active');
        }
    } catch (error) {
        console.error('Erro ao abrir modal de boleto:', error);
    }
}

function openAddInvoiceModal() {
    try {
        const modal = document.getElementById('addInvoiceModal');
        if (modal) {
            modal.classList.add('active');
        }
    } catch (error) {
        console.error('Erro ao abrir modal de nota fiscal:', error);
    }
}

function openAddRevenueModal() {
    try {
        const modal = document.getElementById('addRevenueModal');
        if (modal) {
            modal.classList.add('active');
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
            
            // Reset editing state when closing modals
            if (window.financeAI) {
                if (modalId === 'addBillModal') {
                    window.financeAI.editingBillId = null;
                    const modalTitle = document.querySelector('#addBillModal .modal-header h3');
                    const submitButton = document.querySelector('#addBillForm button[type="submit"]');
                    if (modalTitle) modalTitle.textContent = 'Adicionar Boleto';
                    if (submitButton) submitButton.textContent = 'Salvar';
                }
                if (modalId === 'addInvoiceModal') {
                    window.financeAI.editingInvoiceId = null;
                    const modalTitle = document.querySelector('#addInvoiceModal .modal-header h3');
                    const submitButton = document.querySelector('#addInvoiceForm button[type="submit"]');
                    if (modalTitle) modalTitle.textContent = 'Adicionar Nota Fiscal';
                    if (submitButton) submitButton.textContent = 'Salvar';
                }
                if (modalId === 'addRevenueModal') {
                    window.financeAI.editingRevenueId = null;
                    const modalTitle = document.querySelector('#addRevenueModal .modal-header h3');
                    const submitButton = document.querySelector('#addRevenueForm button[type="submit"]');
                    if (modalTitle) modalTitle.textContent = 'Adicionar Receita';
                    if (submitButton) submitButton.textContent = 'Salvar';
                }
            }
        }
    } catch (error) {
        console.error('Erro ao fechar modal:', error);
    }
}

// Initialize app with error handling
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