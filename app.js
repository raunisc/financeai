// Restaurant Management System - Main Application
class RestaurantApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.charts = {};
        this.orderTotal = 0;
        this.orderSubtotal = 0;
        this.orderFee = 0;
        this.orderItems = [];
        this.purchaseTotal = 0;
        this.purchaseItems = [];
        
        // Relatórios: estado do filtro de período
        this.analyticsPeriod = null; // {from: Date, to: Date} OU null (padrão: tudo)
        
        // Payment fees Taxa de Pagamento
        this.paymentFees = {
            creditCardFee: 3.5,
            debitCardFee: 2.5,
            pixFee: 0.00,
            ifoodFee: 26.3,
            ifoodInvestment: 5.0
        };
        
        this.init();
    }

    async init() {
        await this.waitForDB();
        await this.loadPaymentFees();
        this.setupEventListeners();
        this.loadDashboard();
        this.setupAutoSync();
    }

    async waitForDB() {
        // Wait for database to be ready
        while (!window.db || !window.db.indexedDB) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.showSection(section);
            });
        });

        // Forms
        document.getElementById('menuForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMenuSubmit();
        });

        document.getElementById('orderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleOrderSubmit();
        });

        document.getElementById('inventoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleInventorySubmit();
        });

        document.getElementById('purchaseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePurchaseSubmit();
        });

        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleExpenseSubmit();
        });

        document.getElementById('cancelOrderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCancelOrderSubmit();
        });

        // Order tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parentContainer = e.target.closest('.orders-container, .purchases-container');
                if (parentContainer && parentContainer.classList.contains('orders-container')) {
                    this.filterOrders(e.target.dataset.status);
                } else if (parentContainer && parentContainer.classList.contains('purchases-container')) {
                    this.filterPurchases(e.target.dataset.status);
                }
            });
        });

        // Inventory filters
        document.getElementById('inventorySearch').addEventListener('input', (e) => {
            this.filterInventory();
        });

        document.getElementById('inventoryFilter').addEventListener('change', (e) => {
            this.filterInventory();
        });

        // Settings
        document.getElementById('autoSync').addEventListener('change', (e) => {
            this.setupAutoSync();
        });

        // DATA IMPORT LOGIC: Import data ensuring DB compatibility with updated categories/fields
        // Overriding the importData logic from db.importData to convert categories/fields if needed
        const originalImport = window.db.importData.bind(window.db);
        window.db.importData = async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    // --- DADOS PREPROCESSAMENTO: 
                    // 1. Atualizar categorias do menu para as novas chaves
                    // 2. Corrigir campo 'mesa' -> 'plataforma'
                    if (data.tables) {
                        // Atualização de categorias no menu
                        if (Array.isArray(data.tables.menu)) {
                            data.tables.menu.forEach(item => {
                                if (item.category === 'entradas') item.category = 'dogao';
                                if (item.category === 'pratos') item.category = 'burger';
                            });
                        }
                        // Atualização dos pedidos: 'mesa' -> 'platform'
                        if (Array.isArray(data.tables.orders)) {
                            data.tables.orders.forEach(order => {
                                // Se "mesa" existe, converte para platform
                                if ('mesa' in order) {
                                    // Se for valor 2 = ifood, outro = vendas internas (ou adapte se necessário)
                                    if (typeof order.mesa === "string" && order.mesa.toLowerCase().includes("ifood")) {
                                        order.platform = 'ifood';
                                    } else {
                                        order.platform = 'vendas';
                                    }
                                }
                                // Se por acaso veio com 'plataforma', renomeia para 'platform'
                                if ('plataforma' in order) {
                                    order.platform = order.plataforma;
                                    // Remove antigo
                                    delete order.plataforma;
                                }
                                // Add default payment method if missing
                                if (!order.payment_method) {
                                    order.payment_method = 'dinheiro';
                                }
                            });
                        }
                    }
                    // Serializa temp e faz o import original!
                    const newBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                    const newFile = new File([newBlob], 'import.json');
                    Object.defineProperty(newFile, 'text', { value: () => Promise.resolve(newBlob.text()) });
                    // Simula File event para o import original
                    const fakeEvent = { target: { files: [newFile] } };
                    await originalImport(fakeEvent);
                } catch (error) {
                    console.error('Erro ao importar e converter:', error);
                    window.app.showNotification('Erro ao importar dados: ' + error.message, 'error');
                }
            };
            input.click();
        };
    }

    async loadPaymentFees() {
        try {
            const settings = await window.db.read('settings');
            const feesSettings = settings.filter(s => s.key.includes('Fee') || s.key.includes('Investment'));
            
            feesSettings.forEach(setting => {
                if (setting.key === 'creditCardFee') this.paymentFees.creditCardFee = parseFloat(setting.value);
                if (setting.key === 'debitCardFee') this.paymentFees.debitCardFee = parseFloat(setting.value);
                if (setting.key === 'pixFee') this.paymentFees.pixFee = parseFloat(setting.value);
                if (setting.key === 'ifoodFee') this.paymentFees.ifoodFee = parseFloat(setting.value);
                if (setting.key === 'ifoodInvestment') this.paymentFees.ifoodInvestment = parseFloat(setting.value);
            });

            // Update UI
            document.getElementById('creditCardFee').value = this.paymentFees.creditCardFee;
            document.getElementById('debitCardFee').value = this.paymentFees.debitCardFee;
            document.getElementById('pixFee').value = this.paymentFees.pixFee;
            document.getElementById('ifoodFee').value = this.paymentFees.ifoodFee;
            document.getElementById('ifoodInvestment').value = this.paymentFees.ifoodInvestment;
        } catch (error) {
            console.error('Error loading payment fees:', error);
        }
    }

    async savePaymentFees() {
        try {
            this.paymentFees.creditCardFee = parseFloat(document.getElementById('creditCardFee').value);
            this.paymentFees.debitCardFee = parseFloat(document.getElementById('debitCardFee').value);
            this.paymentFees.pixFee = parseFloat(document.getElementById('pixFee').value);
            this.paymentFees.ifoodFee = parseFloat(document.getElementById('ifoodFee').value);
            this.paymentFees.ifoodInvestment = parseFloat(document.getElementById('ifoodInvestment').value);

            // Save to database
            const feeKeys = Object.keys(this.paymentFees);
            for (const key of feeKeys) {
                try {
                    const existing = await window.db.read('settings', { key });
                    if (existing.length > 0) {
                        await window.db.update('settings', existing[0].id, { 
                            value: this.paymentFees[key].toString(),
                            updated_at: new Date().toISOString()
                        });
                    } else {
                        await window.db.create('settings', {
                            key,
                            value: this.paymentFees[key].toString(),
                            updated_at: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error(`Error saving ${key}:`, error);
                }
            }

            this.showNotification('Taxas de pagamento salvas!', 'success');
        } catch (error) {
            console.error('Error saving payment fees:', error);
            this.showNotification('Erro ao salvar taxas', 'error');
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(sectionName).classList.add('active');

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        // Activate both desktop and mobile nav button for the current section
        document.querySelectorAll(`#main-nav .nav-btn, #mobile-nav .nav-btn`).forEach(btn => {
            if(btn.dataset.section === sectionName) btn.classList.add('active');
        });

        // --- EMIT CUSTOM EVENT SO HEADER/JS CAN TRACK ACTIVE SECTION
        window.dispatchEvent(new CustomEvent('sectionchange', { detail: { section: sectionName } }));

        this.currentSection = sectionName;

        // Load section data
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'menu':
                this.loadMenu();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'purchases':
                this.loadPurchases();
                break;
            case 'finances':
                this.loadFinances();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }

        // Reset analytics filter when switching away
        if (sectionName !== 'analytics') {
            this.analyticsPeriod = null;
            this.resetAnalyticsFilterInputs();
        }
    }

    updateSyncIndicator(status = 'idle', pendingChanges = 0) {
        const indicator = document.getElementById('sync-indicator');
        const badge = document.getElementById('sync-badge');
        
        if (!indicator || !badge) return;
        
        // Update indicator appearance
        indicator.className = 'sync-indicator';
        
        switch (status) {
            case 'syncing':
                indicator.classList.add('syncing');
                indicator.innerHTML = '<i class="fas fa-sync-alt"></i>';
                break;
            case 'success':
                indicator.classList.add('success');
                indicator.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    if (indicator) {
                        indicator.className = 'sync-indicator';
                        indicator.innerHTML = '<i class="fas fa-database"></i>';
                    }
                }, 2000);
                break;
            case 'error':
                indicator.classList.add('error');
                indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default:
                indicator.innerHTML = '<i class="fas fa-database"></i>';
        }
        
        // Update badge
        if (pendingChanges > 0) {
            badge.style.display = 'flex';
            badge.textContent = pendingChanges > 99 ? '99+' : pendingChanges;
        } else {
            badge.style.display = 'none';
        }
        
        // Add badge back to indicator if it's not already there
        if (!indicator.querySelector('.sync-badge')) {
            indicator.appendChild(badge);
        }
    }

    updateSyncReport() {
        const changeLog = JSON.parse(localStorage.getItem('changeLog') || '[]');
        const lastSync = localStorage.getItem('lastSync');
        
        // Update last sync time
        const lastSyncElement = document.getElementById('lastSyncTime');
        if (lastSyncElement) {
            if (lastSync) {
                const date = new Date(lastSync);
                lastSyncElement.textContent = date.toLocaleString('pt-BR');
            } else {
                lastSyncElement.textContent = 'Nunca';
            }
        }
        
        // Calculate statistics
        const totalOperations = changeLog.length;
        const creates = changeLog.filter(c => c.operation === 'create').length;
        const updates = changeLog.filter(c => c.operation === 'update').length;
        const deletes = changeLog.filter(c => c.operation === 'delete').length;
        
        // Update statistics with null checks
        const totalOpsElement = document.getElementById('totalOperations');
        const totalCreatesElement = document.getElementById('totalCreates');
        const totalUpdatesElement = document.getElementById('totalUpdates');
        const totalDeletesElement = document.getElementById('totalDeletes');
        
        if (totalOpsElement) totalOpsElement.textContent = totalOperations;
        if (totalCreatesElement) totalCreatesElement.textContent = creates;
        if (totalUpdatesElement) totalUpdatesElement.textContent = updates;
        if (totalDeletesElement) totalDeletesElement.textContent = deletes;
        
        // Update database status
        this.updateDatabaseStatus();
        
        // Update recent activities
        this.updateRecentActivities(changeLog.slice(-10));
        
        // Update sync indicator badge
        const pendingChanges = changeLog.filter(c => 
            !lastSync || new Date(c.timestamp) > new Date(lastSync)
        ).length;
        
        this.updateSyncIndicator('idle', pendingChanges);
    }
    
    updateDatabaseStatus() {
        const dbStatusElement = document.getElementById('dbStatus');
        if (!dbStatusElement) return;
        
        const mysqlStatus = window.db?.mysql?.connected ? '✓' : '✗';
        const sqliteStatus = window.db?.sqlite ? '✓' : '✗';
        const indexedDBStatus = window.db?.indexedDB ? '✓' : '✗';
        
        dbStatusElement.innerHTML = `
            MySQL ${mysqlStatus} | SQLite ${sqliteStatus} | IndexedDB ${indexedDBStatus}
        `;
    }
    
    updateRecentActivities(activities) {
        const container = document.getElementById('syncActivityList');
        if (!container) return;
        
        if (activities.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b; font-size: 0.875rem;">Nenhuma atividade recente</p>';
            return;
        }
        
        container.innerHTML = activities.reverse().map(activity => {
            const time = new Date(activity.timestamp).toLocaleString('pt-BR');
            const icon = this.getActivityIcon(activity.operation);
            const description = this.getActivityDescription(activity);
            
            return `
                <div class="sync-activity-item">
                    <div class="sync-activity-icon ${activity.operation}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="sync-activity-content">
                        <div class="sync-activity-title">${description}</div>
                        <div class="sync-activity-time">${time}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getActivityIcon(operation) {
        const icons = {
            'create': 'fa-plus',
            'update': 'fa-edit',
            'delete': 'fa-trash',
            'complete': 'fa-check',
            'deduction': 'fa-minus',
            'cancel': 'fa-times'
        };
        return icons[operation] || 'fa-circle';
    }
    
    getActivityDescription(activity) {
        const tableNames = {
            'menu': 'menu',
            'orders': 'pedidos',
            'inventory': 'estoque',
            'purchases': 'compras',
            'expenses': 'despesas',
            'purchase_completion': 'finalização de compra',
            'menu_price_adjustment': 'ajuste de preço do menu',
            'stock_movement': 'movimentação de estoque',
            'order_cancellation': 'cancelamento de pedido'
        };
        
        const tableName = tableNames[activity.table] || activity.table;
        const operations = {
            'create': 'Criado',
            'update': 'Atualizado',
            'delete': 'Excluído',
            'complete': 'Finalizado',
            'deduction': 'Baixa no estoque',
            'cancel': 'Cancelado'
        };
        
        const operationName = operations[activity.operation] || activity.operation;
        
        // Special handling for order cancellation
        if (activity.table === 'order_cancellation') {
            const data = activity.data;
            return `Pedido #${data.orderId} cancelado por ${data.cancelled_by} - ${data.customer} (${this.formatCurrency(data.total)})`;
        }
        
        // Special handling for stock movements
        if (activity.table === 'stock_movement') {
            const data = activity.data;
            const movementsCount = data.movements ? data.movements.length : 0;
            return `Baixa automática no estoque: ${movementsCount} ingredientes (Pedido: ${data.customer})`;
        }
        
        // Special handling for purchase completion
        if (activity.table === 'purchase_completion') {
            const data = activity.data;
            return `Compra ${data.supplier} finalizada - ${data.itemsCount} itens, ${this.formatCurrency(data.totalCost)}`;
        }
        
        // Special handling for menu price adjustments
        if (activity.table === 'menu_price_adjustment') {
            const data = activity.data;
            return `Preço ajustado: ${data.menuItem} (ingrediente: ${data.affectedByIngredient})`;
        }
        
        const itemName = activity.data?.name || activity.data?.customer || activity.data?.description || activity.data?.supplier || `ID ${activity.data?.id}`;
        
        return `${operationName} ${tableName}: ${itemName}`;
    }

    // Dashboard
    async loadDashboard() {
        try {
            const orders = await window.db.read('orders');
            const menu = await window.db.read('menu');
            const inventory = await window.db.read('inventory');
            const expenses = await window.db.read('expenses');

            // Calculate today's metrics (excluding cancelled orders)
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
            
            const todayOrders = orders.filter(order => 
                new Date(order.created_at || order.date).toDateString() === today &&
                order.status !== 'cancelled'
            );
            const yesterdayOrders = orders.filter(order => 
                new Date(order.created_at || order.date).toDateString() === yesterday &&
                order.status !== 'cancelled'
            );

            const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            
            // Calculate profit (sales - costs - fees)
            const todayCosts = this.calculateOrdersCosts(todayOrders, menu);
            const yesterdayCosts = this.calculateOrdersCosts(yesterdayOrders, menu);
            const todayFees = this.calculateOrdersFees(todayOrders);
            const yesterdayFees = this.calculateOrdersFees(yesterdayOrders);
            const todayProfit = todaySales - todayCosts - todayFees;
            const yesterdayProfit = yesterdaySales - yesterdayCosts - yesterdayFees;

            // Calculate stock alerts
            const criticalStock = inventory.filter(item => item.quantity <= 0).length;
            const lowStock = inventory.filter(item => item.quantity > 0 && item.quantity <= item.min_stock).length;
            
            // Update metrics
            document.getElementById('todaySales').textContent = this.formatCurrency(todaySales);
            document.getElementById('todayProfit').textContent = this.formatCurrency(todayProfit);
            document.getElementById('todayOrders').textContent = todayOrders.length;
            document.getElementById('stockItems').textContent = inventory.length;
            document.getElementById('stockAlert').textContent = `${criticalStock} críticos, ${lowStock} baixos`;

            // Update changes
            this.updateMetricChange('todaySalesChange', todaySales, yesterdaySales);
            this.updateMetricChange('todayProfitChange', todayProfit, yesterdayProfit);
            this.updateMetricChange('todayOrdersChange', todayOrders.length, yesterdayOrders.length);

            // Load charts
            this.loadSalesChart(orders, menu);
            this.loadFinancialSummary(orders, menu, expenses);
            
            // Update sync report
            this.updateSyncReport();
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    calculateOrdersCosts(orders, menu) {
        return orders.reduce((totalCost, order) => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            const orderCost = items.reduce((sum, item) => {
                const menuItem = menu.find(m => m.id == item.id);
                const costPrice = menuItem ? (menuItem.cost_price || 0) : 0;
                return sum + (costPrice * (item.quantity || 1));
            }, 0);
            return totalCost + orderCost;
        }, 0);
    }

    calculateOrdersFees(orders) {
        return orders.reduce((totalFees, order) => {
            const fee = this.calculatePaymentFee(
                order.total || 0, 
                order.payment_method || 'dinheiro', 
                order.platform || 'vendas'
            );
            return totalFees + fee;
        }, 0);
    }

    updateMetricChange(elementId, current, previous) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
        const changeText = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
        
        element.textContent = changeText;
        element.className = 'metric-change';
        
        if (change > 0) {
            element.classList.add('positive');
        } else if (change < 0) {
            element.classList.add('warning');
        }
    }

    async loadSalesChart(orders, menu) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        // Prepare data for the last 7 days (excluding cancelled orders)
        const last7Days = [];
        const salesData = [];
        const profitData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            
            last7Days.push(date.toLocaleDateString('pt-BR', { weekday: 'short' }));
            
            const dayOrders = orders.filter(order => 
                new Date(order.created_at || order.date).toDateString() === dateString &&
                order.status !== 'cancelled'
            );
            
            const dayTotal = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const dayCosts = this.calculateOrdersCosts(dayOrders, menu);
            const dayFees = this.calculateOrdersFees(dayOrders);
            
            salesData.push(dayTotal);
            profitData.push(dayTotal - dayCosts - dayFees);
        }

        // Destroy existing chart if it exists
        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        // Create new chart with fixed import
        try {
            const ChartModule = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm');
            const Chart = ChartModule.default;
            
            this.charts.sales = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last7Days,
                    datasets: [{
                        label: 'Vendas (R$)',
                        data: salesData,
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Lucro (R$)',
                        data: profitData,
                        borderColor: '#0891b2',
                        backgroundColor: 'rgba(8, 145, 178, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading chart:', error);
        }
    }

    async loadFinancialSummary(orders, menu, expenses) {
        const container = document.getElementById('financialSummary');
        if (!container) return;

        // Calculate this month's data (excluding cancelled orders)
        const thisMonth = new Date();
        const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
        
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.created_at || order.date);
            return orderDate >= startOfMonth && order.status !== 'cancelled';
        });

        const monthlyExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startOfMonth;
        });

        const revenue = monthlyOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const costs = this.calculateOrdersCosts(monthlyOrders, menu);
        const fees = this.calculateOrdersFees(monthlyOrders);
        const expensesTotal = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const profit = revenue - costs - fees - expensesTotal;

        container.innerHTML = `
            <div class="financial-summary-item">
                <span class="financial-summary-label">Receita do Mês</span>
                <span class="financial-summary-value positive">${this.formatCurrency(revenue)}</span>
            </div>
            <div class="financial-summary-item">
                <span class="financial-summary-label">Custos dos Produtos</span>
                <span class="financial-summary-value negative">${this.formatCurrency(costs)}</span>
            </div>
            <div class="financial-summary-item">
                <span class="financial-summary-label">Taxas de Pagamento</span>
                <span class="financial-summary-value negative">${this.formatCurrency(fees)}</span>
            </div>
            <div class="financial-summary-item">
                <span class="financial-summary-label">Despesas Operacionais</span>
                <span class="financial-summary-value negative">${this.formatCurrency(expensesTotal)}</span>
            </div>
            <div class="financial-summary-item">
                <span class="financial-summary-label">Lucro Líquido</span>
                <span class="financial-summary-value ${profit >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(profit)}</span>
            </div>
        `;
    }

    // Menu Management
    async loadMenu() {
        try {
            const menu = await window.db.read('menu');
            const container = document.getElementById('menuGrid');
            
            if (menu.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #64748b;">
                        <i class="fas fa-utensils" style="font-size: 3rem; margin-bottom: 1rem; color: #e2e8f0;"></i>
                        <h3 style="margin-bottom: 0.5rem; color: #374151;">Nenhum item no menu</h3>
                        <p>Adicione o primeiro item para começar!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = await Promise.all(menu.map(async (item) => {
                const menuIngredients = await window.db.read('menu_ingredients', { menu_id: item.id });
                const inventory = await window.db.read('inventory');
                
                let ingredientsList = '';
                if (menuIngredients.length > 0) {
                    const ingredients = menuIngredients.map(ingredient => {
                        const inventoryItem = inventory.find(inv => inv.id === ingredient.inventory_id);
                        return inventoryItem ? `${ingredient.quantity_needed} ${inventoryItem.unit} de ${inventoryItem.name}` : null;
                    }).filter(Boolean);
                    
                    ingredientsList = ingredients.length > 0 ? `
                        <div class="menu-item-ingredients">
                            <span class="menu-item-ingredients-label">Ingredientes:</span>
                            ${ingredients.join(', ')}
                        </div>
                    ` : '';
                }
                
                return `
                    <div class="menu-item">
                        <div class="menu-item-header">
                            <div class="menu-item-info">
                                <h4>${item.name}</h4>
                                <span class="menu-item-category">${this.getCategoryName(item.category)}</span>
                            </div>
                            <div class="menu-item-price">${this.formatCurrency(item.price)}</div>
                        </div>
                        ${item.description ? `<div class="menu-item-description">${item.description}</div>` : ''}
                        ${item.cost_price ? `
                            <div class="menu-item-cost">
                                <span class="menu-item-cost-label">Custo:</span>
                                <span class="menu-item-cost-value">${this.formatCurrency(item.cost_price)}</span>
                                <span style="margin-left: 0.5rem; color: #059669; font-weight: 600;">
                                    Margem: ${item.price > 0 ? (((item.price - item.cost_price) / item.price) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        ` : ''}
                        ${ingredientsList}
                        <div class="menu-item-actions">
                            <button class="btn btn-small btn-secondary" onclick="app.viewMenuIngredients(${item.id})" title="Ver Ingredientes">
                                <i class="fas fa-list"></i> <span>Ingredientes</span>
                            </button>
                            <button class="btn btn-small btn-secondary" onclick="app.editMenuItem(${item.id})" title="Editar Item">
                                <i class="fas fa-edit"></i> <span>Editar</span>
                            </button>
                            <button class="btn btn-small btn-danger" onclick="app.deleteMenuItem(${item.id})" title="Excluir Item">
                                <i class="fas fa-trash"></i> <span>Excluir</span>
                            </button>
                        </div>
                    </div>
                `;
            })).then(items => items.join(''));
        } catch (error) {
            console.error('Error loading menu:', error);
            const container = document.getElementById('menuGrid');
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #dc2626;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Erro ao carregar menu. Tente novamente.</p>
                </div>
            `;
        }
    }

    getCategoryName(category) {
        const categoryNames = {
            'dogao': 'Dogão do Canela Fina',
            'burger': 'Burger e Otakus',
            'sobremesas': 'Sobremesas',
            'bebidas': 'Bebidas'
        };
        return categoryNames[category] || category;
    }

    async handleMenuSubmit() {
        try {
            // Calculate cost price from ingredients
            const calculatedCostPrice = await this.calculateMenuCostFromIngredients();
            
            const formData = {
                name: document.getElementById('menuName').value,
                category: document.getElementById('menuCategory').value,
                price: parseFloat(document.getElementById('menuPrice').value),
                cost_price: calculatedCostPrice,
                description: document.getElementById('menuDescription').value,
                updated_at: new Date().toISOString()
            };

            // Check if we're editing or creating
            const editingId = document.getElementById('menuForm').dataset.editingId;
            let menuId;

            if (editingId) {
                // Update existing menu item instead of creating new one
                await window.db.update('menu', parseInt(editingId), formData);
                menuId = parseInt(editingId);

                // Delete existing ingredients for this menu item
                const existingIngredients = await window.db.read('menu_ingredients', { menu_id: menuId });
                for (const ingredient of existingIngredients) {
                    await window.db.delete('menu_ingredients', ingredient.id);
                }

                this.showNotification('Item do menu atualizado com sucesso!', 'success');
            } else {
                // Create new menu item
                formData.created_at = new Date().toISOString();
                menuId = await window.db.create('menu', formData);
                this.showNotification('Item adicionado ao menu com ingredientes!', 'success');
            }

            // Save menu ingredients
            await this.saveMenuIngredients(menuId);

            this.closeModal('menuModal');
            this.loadMenu();
        } catch (error) {
            console.error('Error saving menu item:', error);
            this.showNotification('Erro ao salvar item', 'error');
        }
    }

    async calculateMenuCostFromIngredients() {
        const ingredientRows = document.querySelectorAll('.menu-ingredient-row');
        let totalCost = 0;
        
        for (const row of ingredientRows) {
            const inventorySelect = row.querySelector('.ingredient-select');
            const quantityInput = row.querySelector('.ingredient-quantity');
            
            if (inventorySelect.value && quantityInput.value) {
                const inventory = await window.db.read('inventory', { id: parseInt(inventorySelect.value) });
                if (inventory.length > 0) {
                    const inventoryItem = inventory[0];
                    const ingredientCost = (inventoryItem.cost_price || 0) * parseFloat(quantityInput.value);
                    totalCost += ingredientCost;
                }
            }
        }
        
        // Update the cost price field for user visibility
        const costPriceField = document.getElementById('menuCostPrice');
        if (costPriceField) {
            costPriceField.value = totalCost.toFixed(2);
        }
        
        return totalCost;
    }

    async saveMenuIngredients(menuId) {
        const ingredientRows = document.querySelectorAll('.menu-ingredient-row');
        
        for (const row of ingredientRows) {
            const inventorySelect = row.querySelector('.ingredient-select');
            const quantityInput = row.querySelector('.ingredient-quantity');
            
            if (inventorySelect.value && quantityInput.value) {
                await window.db.create('menu_ingredients', {
                    menu_id: menuId,
                    inventory_id: parseInt(inventorySelect.value),
                    quantity_needed: parseFloat(quantityInput.value),
                    created_at: new Date().toISOString()
                });
            }
        }
    }

    async addMenuIngredient() {
        const inventory = await window.db.read('inventory');
        const container = document.getElementById('menuIngredients');
        
        const ingredientDiv = document.createElement('div');
        ingredientDiv.className = 'menu-ingredient-row';
        ingredientDiv.innerHTML = `
            <select class="ingredient-select" required onchange="app.calculateMenuCostFromIngredients()">
                <option value="">Selecione um ingrediente</option>
                ${inventory.map(item => `
                    <option value="${item.id}" data-cost="${item.cost_price || 0}">
                        ${item.name} (${item.unit}) - Estoque: ${item.quantity} - Custo: ${this.formatCurrency(item.cost_price || 0)}
                    </option>
                `).join('')}
            </select>
            <input type="number" class="ingredient-quantity" min="0.01" step="0.01" 
                   placeholder="Quantidade necessária" required onchange="app.calculateMenuCostFromIngredients()">
            <button type="button" class="btn btn-small btn-danger" onclick="app.removeMenuIngredient(this)">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        container.appendChild(ingredientDiv);
    }

    removeMenuIngredient(button) {
        button.parentElement.remove();
        this.calculateMenuCostFromIngredients();
    }

    async viewMenuIngredients(menuId) {
        try {
            const menuIngredients = await window.db.read('menu_ingredients', { menu_id: menuId });
            const inventory = await window.db.read('inventory');
            const menu = await window.db.read('menu', { id: menuId });
            
            if (menu.length === 0) return;
            
            const menuItem = menu[0];
            
            if (menuIngredients.length === 0) {
                this.showNotification(`"${menuItem.name}" não possui ingredientes cadastrados`, 'warning');
                return;
            }
            
            const ingredientsList = menuIngredients.map(ingredient => {
                const inventoryItem = inventory.find(inv => inv.id === ingredient.inventory_id);
                if (inventoryItem) {
                    const totalCost = (inventoryItem.cost_price || 0) * ingredient.quantity_needed;
                    return `• ${ingredient.quantity_needed} ${inventoryItem.unit} de ${inventoryItem.name} (${this.formatCurrency(totalCost)})`;
                }
                return '• Ingrediente não encontrado';
            }).join('\n');
            
            const totalCost = menuIngredients.reduce((sum, ingredient) => {
                const inventoryItem = inventory.find(inv => inv.id === ingredient.inventory_id);
                return sum + ((inventoryItem?.cost_price || 0) * ingredient.quantity_needed);
            }, 0);
            
            alert(`Ingredientes de "${menuItem.name}":\n\n${ingredientsList}\n\nCusto Total: ${this.formatCurrency(totalCost)}\nPreço de Venda: ${this.formatCurrency(menuItem.price)}\nMargem: ${menuItem.price > 0 ? (((menuItem.price - totalCost) / menuItem.price) * 100).toFixed(1) : 0}%`);
        } catch (error) {
            console.error('Error viewing menu ingredients:', error);
            this.showNotification('Erro ao carregar ingredientes', 'error');
        }
    }

    async editMenuItem(id) {
        try {
            const menuItems = await window.db.read('menu', { id: id });
            if (menuItems.length === 0) {
                this.showNotification('Item não encontrado', 'error');
                return;
            }

            const menuItem = menuItems[0];

            document.getElementById('menuName').value = menuItem.name;
            document.getElementById('menuCategory').value = menuItem.category;
            document.getElementById('menuPrice').value = menuItem.price;
            document.getElementById('menuCostPrice').value = menuItem.cost_price || 0;
            document.getElementById('menuDescription').value = menuItem.description || '';

            // Set editing mode WITH UNIQUE IDENTIFIER
            // (Remover dataset.editingId se existir)
            delete document.getElementById('menuForm').dataset.editingId;
            document.querySelector('#menuModal .modal-header h3').textContent = 'Duplicar Item do Menu';

            // Adiciona botão duplicar visível
            let dupBtn = document.querySelector('#menuModal .form-actions .duplicate-btn');
            if(!dupBtn) {
                dupBtn = document.createElement('button');
                dupBtn.type = "button";
                dupBtn.className = "btn btn-secondary duplicate-btn";
                dupBtn.innerHTML = '<i class="fas fa-copy"></i> Duplicar';
                dupBtn.onclick = () => this.duplicateMenuItem(id);
                document.querySelector('#menuModal .form-actions').prepend(dupBtn);
            }
            dupBtn.style.display = 'inline-flex';

            this.openModal('menuModal');
        } catch (error) {
            console.error('Error loading menu item for edit:', error);
            this.showNotification('Erro ao carregar item para edição', 'error');
        }
    }

    async duplicateMenuItem(id) {
        // Load item again and open modal, but do NOT set editingId (so it's a CREATE operation with prefilled values)
        try {
            const menuItems = await window.db.read('menu', { id: id });
            if (menuItems.length === 0) {
                this.showNotification('Item não encontrado', 'error');
                return;
            }
            const menuItem = menuItems[0];
            document.getElementById('menuName').value = menuItem.name + " (Cópia)";
            document.getElementById('menuCategory').value = menuItem.category;
            document.getElementById('menuPrice').value = menuItem.price;
            document.getElementById('menuCostPrice').value = menuItem.cost_price || 0;
            document.getElementById('menuDescription').value = menuItem.description || '';

            delete document.getElementById('menuForm').dataset.editingId;
            document.querySelector('#menuModal .modal-header h3').textContent = 'Duplicar Item do Menu';

            let dupBtn = document.querySelector('#menuModal .form-actions .duplicate-btn');
            if (dupBtn) dupBtn.style.display = "none";

            this.openModal('menuModal');
        } catch (error) {
            console.error('Erro ao duplicar menu:', error);
            this.showNotification('Erro ao duplicar item do menu', 'error');
        }
    }

    async deleteMenuItem(id) {
        if (confirm('Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.')) {
            try {
                // Delete menu ingredients first
                const menuIngredients = await window.db.read('menu_ingredients', { menu_id: id });
                for (const ingredient of menuIngredients) {
                    await window.db.delete('menu_ingredients', ingredient.id);
                }
                
                // Delete menu item
                await window.db.delete('menu', id);
                this.loadMenu();
                this.showNotification('Item excluído com sucesso!', 'success');
            } catch (error) {
                console.error('Error deleting menu item:', error);
                this.showNotification('Erro ao excluir item', 'error');
            }
        }
    }

    // Orders Management
    async loadOrders() {
        try {
            const orders = await window.db.read('orders');
            this.renderOrders(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    renderOrders(orders) {
        const container = document.getElementById('ordersList');
        
        if (orders.length === 0) {
            container.innerHTML = '<p>Nenhum pedido encontrado.</p>';
            return;
        }

        // Detectar status filtrado pelo tab ativo
        const activeTab = document.querySelector('.orders-tabs .tab-btn.active');
        const tabStatus = activeTab ? activeTab.dataset.status : 'all';

        let filteredOrders = [];
        if (tabStatus === 'all') {
            filteredOrders = orders.filter(order => order.status !== 'cancelled' && order.status !== 'delivered');
        } else if (tabStatus === 'pending' || tabStatus === 'preparing' || tabStatus === 'ready') {
            filteredOrders = orders.filter(order => order.status === tabStatus && order.status !== 'cancelled' && order.status !== 'delivered');
        } else if (tabStatus === 'delivered') {
            filteredOrders = orders.filter(order => order.status === 'delivered');
        } else if (tabStatus === 'cancelled') {
            filteredOrders = orders.filter(order => order.status === 'cancelled');
        } else {
            filteredOrders = orders.filter(order => order.status !== 'cancelled' && order.status !== 'delivered');
        }

        if (filteredOrders.length === 0) {
            let msg = '';
            if (tabStatus === 'cancelled') msg = '<p>Nenhum pedido cancelado.</p>';
            else if (tabStatus === 'delivered') msg = '<p>Nenhum pedido entregue.</p>';
            else msg = '<p>Nenhum pedido encontrado.</p>';
            container.innerHTML = msg;
            return;
        }

        container.innerHTML = filteredOrders.map(order => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            const itemsText = items.map(item => `${item.quantity}x ${item.name}`).join(', ');
            // NOVO: Adicionando plataforma na exibição com fallback "Vendas Internas" se vazio
            const platform = order.platform === 'ifood' ? 'Ifood' : 'Vendas Internas';
            const paymentMethod = this.getPaymentMethodText(order.payment_method, order.platform);
            const fee = this.calculatePaymentFee(order.total || 0, order.payment_method || 'dinheiro', order.platform || 'vendas');
            
            return `
                <div class="order-item">
                    <div class="order-info">
                        <h4>Pedido #${order.id}</h4>
                        <div class="order-details">
                            <p><strong>Cliente:</strong> ${order.customer}</p>
                            <p><strong>Plataforma:</strong> ${platform}</p>
                            <p><strong>Pagamento:</strong> ${paymentMethod}</p>
                            <p><strong>Itens:</strong> ${itemsText}</p>
                            <p><strong>Subtotal:</strong> ${this.formatCurrency((order.total || 0) + fee)}</p>
                            ${fee > 0 ? `<p><strong>Taxa:</strong> -${this.formatCurrency(fee)}</p>` : ''}
                            <p><strong>Total:</strong> ${this.formatCurrency(order.total)}</p>
                            ${order.status === 'cancelled' ? `
                                <p><strong>Cancelado por:</strong> ${order.cancelled_by || 'N/A'}</p>
                                <p><strong>Motivo:</strong> ${order.cancellation_reason || 'Não informado'}</p>
                                <p><strong>Data cancelamento:</strong> ${new Date(order.cancelled_at).toLocaleString('pt-BR')}</p>
                            ` : ''}
                        </div>
                    </div>
                    <div class="order-actions">
                        <span class="order-status ${order.status}">${this.getStatusText(order.status)}</span>
                        ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
                            <button class="btn btn-small btn-primary" onclick="app.updateOrderStatus(${order.id}, '${this.getNextStatus(order.status)}')">
                                ${this.getNextStatusText(order.status)}
                            </button>
                            <button class="btn btn-small btn-danger" onclick="app.cancelOrder(${order.id})">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        ` : order.status === 'delivered' ? `
                            <button class="btn btn-small btn-danger" onclick="app.cancelOrder(${order.id})">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    filterOrders(status) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-status="${status}"]`).classList.add('active');

        // Filter orders
        window.db.read('orders', status === 'all' ? {} : { status }).then(orders => {
            this.renderOrders(orders);
        });
    }

    async cancelOrder(orderId) {
        try {
            const orders = await window.db.read('orders', { id: orderId });
            if (orders.length === 0) {
                this.showNotification('Pedido não encontrado', 'error');
                return;
            }

            const order = orders[0];
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            const itemsText = items.map(item => `${item.quantity}x ${item.name}`).join(', ');
            // NOVO: Adicionando plataforma na exibição com fallback "Vendas Internas" se vazio
            const platform = order.platform === 'ifood' ? 'Ifood' : 'Vendas Internas';
            
            // Populate order info in modal
            document.getElementById('cancelOrderInfo').innerHTML = `
                <div style="display: grid; gap: 0.5rem; font-size: 0.875rem;">
                    <div><strong>Pedido:</strong> #${order.id}</div>
                    <div><strong>Cliente:</strong> ${order.customer}</div>
                    <div><strong>Plataforma:</strong> ${platform}</div>
                    <div><strong>Status atual:</strong> ${this.getStatusText(order.status)}</div>
                    <div><strong>Itens:</strong> ${itemsText}</div>
                    <div><strong>Valor:</strong> ${this.formatCurrency(order.total)}</div>
                    <div><strong>Data:</strong> ${new Date(order.created_at || order.date).toLocaleString('pt-BR')}</div>
                </div>
            `;
            
            // Store order ID for form submission
            document.getElementById('cancelOrderForm').dataset.orderId = orderId;
            
            // Clear form fields
            document.getElementById('cancelOrderBy').value = '';
            document.getElementById('cancelOrderReason').value = '';
            
            // Show modal
            this.openModal('cancelOrderModal');
            
        } catch (error) {
            console.error('Error preparing order cancellation:', error);
            this.showNotification('Erro ao preparar cancelamento', 'error');
        }
    }

    async handleOrderSubmit() {
        try {
            if (this.orderItems.length === 0) {
                this.showNotification('Adicione pelo menos um item ao pedido', 'warning');
                return;
            }

            const platform = document.getElementById('orderPlatform').value;
            const paymentMethod = platform === 'ifood' ? 'ifood' : document.getElementById('orderPaymentMethod').value;

            if (!paymentMethod) {
                this.showNotification('Selecione a forma de pagamento', 'warning');
                return;
            }

            const subtotal = this.orderSubtotal;
            const fee = this.orderFee;
            const total = subtotal - fee; // Total que o cliente paga (já com desconto da taxa)

            const formData = {
                customer: document.getElementById('orderCustomer').value,
                platform: platform,
                payment_method: paymentMethod,
                items: JSON.stringify(this.orderItems),
                total: total,
                subtotal: subtotal,
                fee: fee,
                status: 'pending',
                date: new Date().toISOString()
            };

            // Create the order
            await window.db.create('orders', formData);
            
            // Process stock deduction
            const stockMovements = await window.db.processStockDeduction(this.orderItems);
            
            // Log stock movements
            if (stockMovements.length > 0) {
                const stockMovementReport = {
                    id: Date.now(),
                    table: 'stock_movement',
                    operation: 'deduction',
                    data: {
                        orderId: formData.id,
                        customer: formData.customer,
                        movements: stockMovements,
                        timestamp: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                };
                
                window.db.logChange(stockMovementReport);
            }
            
            this.closeModal('orderModal');
            this.loadOrders();
            
            let message = 'Pedido criado!';
            if (stockMovements.length > 0) {
                message += ` Estoque atualizado para ${stockMovements.length} ingredientes.`;
            }
            if (fee > 0) {
                message += ` Taxa aplicada: ${this.formatCurrency(fee)}.`;
            }
            
            this.showNotification(message, 'success');
            
            // Reset order form
            this.orderItems = [];
            this.orderSubtotal = 0;
            this.orderFee = 0;
            this.orderTotal = 0;
        } catch (error) {
            console.error('Error creating order:', error);
            this.showNotification('Erro ao criar pedido', 'error');
        }
    }

    async addOrderItem() {
        const menuItems = await window.db.read('menu');
        const container = document.getElementById('orderItems');
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item-row';
        itemDiv.innerHTML = `
            <select class="order-item-select" onchange="app.updateOrderTotal()" required>
                <option value="">Selecione um item</option>
                ${menuItems.map(item => `<option value="${item.id}" data-price="${item.price || 0}">${item.name} (${this.getCategoryName(item.category)}) - Valor: ${this.formatCurrency(item.price || 0)}</option>`).join('')}
            </select>
            <input type="number" class="order-item-quantity" min="1" value="1" onchange="app.updateOrderTotal()">
            <button type="button" class="btn btn-small btn-danger" onclick="app.removeOrderItem(this)">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        container.appendChild(itemDiv);
    }

    removeOrderItem(button) {
        button.parentElement.remove();
        this.updateOrderTotal();
    }

    updateOrderTotal() {
        const orderItems = document.querySelectorAll('.order-item-row');
        this.orderItems = [];
        this.orderSubtotal = 0;
        
        orderItems.forEach(row => {
            const select = row.querySelector('.order-item-select');
            const quantity = parseInt(row.querySelector('.order-item-quantity').value) || 1;
            
            if (select.value) {
                const option = select.selectedOptions[0];
                const price = parseFloat(option.dataset.price);
                const name = option.textContent.split(' - ')[0];
                
                this.orderItems.push({
                    id: select.value,
                    name: name,
                    price: price,
                    quantity: quantity
                });
                
                this.orderSubtotal += price * quantity;
            }
        });
        
        // Calculate fees
        const platform = document.getElementById('orderPlatform').value;
        const paymentMethod = platform === 'ifood' ? 'ifood' : document.getElementById('orderPaymentMethod').value;
        
        this.orderFee = this.calculatePaymentFee(this.orderSubtotal, paymentMethod || 'dinheiro', platform);
        this.orderTotal = this.orderSubtotal - this.orderFee;
        
        // Update UI
        document.getElementById('orderSubtotal').textContent = this.formatCurrency(this.orderSubtotal);
        document.getElementById('orderTotal').textContent = this.formatCurrency(this.orderTotal);
        
        // Update fee info
        const feeInfo = document.getElementById('orderFeeInfo');
        if (this.orderFee > 0) {
            const feeText = platform === 'ifood' 
                ? `Taxa Ifood (${this.paymentFees.ifoodFee}%) + Investimento (${this.paymentFees.ifoodInvestment}%): -${this.formatCurrency(this.orderFee)}`
                : `Taxa ${this.getPaymentMethodText(paymentMethod, platform)} (${this.getPaymentFeePercentage(paymentMethod)}%): -${this.formatCurrency(this.orderFee)}`;
            feeInfo.innerHTML = `<span style="color: #dc2626;">${feeText}</span>`;
        } else {
            feeInfo.innerHTML = '';
        }
    }

    getPaymentMethodText(method, platform) {
        if (platform === 'ifood') return 'Ifood (Taxa + Investimento)';
        
        const methods = {
            'dinheiro': 'Dinheiro',
            'credito': 'Cartão de Crédito',
            'debito': 'Cartão de Débito',
            'pix': 'PIX'
        };
        return methods[method] || 'Não informado';
    }

    getPaymentFeePercentage(method) {
        const fees = {
            'credito': this.paymentFees.creditCardFee,
            'debito': this.paymentFees.debitCardFee,
            'pix': this.paymentFees.pixFee
        };
        return fees[method] || 0;
    }

    async updateOrderStatus(id, newStatus) {
        try {
            await window.db.update('orders', id, { status: newStatus });
            this.loadOrders();
            this.showNotification('Status do pedido atualizado!', 'success');
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showNotification('Erro ao atualizar status', 'error');
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'preparing': 'Preparando',
            'ready': 'Pronto',
            'delivered': 'Entregue',
            'cancelled': 'Cancelado'
        };
        return statusMap[status] || status;
    }

    getNextStatus(status) {
        const statusFlow = {
            'pending': 'preparing',
            'preparing': 'ready',
            'ready': 'delivered',
            'delivered': 'delivered'
        };
        return statusFlow[status] || status;
    }

    getNextStatusText(status) {
        const nextStatus = this.getNextStatus(status);
        const textMap = {
            'preparing': 'Iniciar Preparo',
            'ready': 'Marcar como Pronto',
            'delivered': 'Entregar'
        };
        return textMap[nextStatus] || 'Atualizar';
    }

    async handleCancelOrderSubmit() {
        try {
            const orderId = document.getElementById('cancelOrderForm').dataset.orderId;
            const cancelledBy = document.getElementById('cancelOrderBy').value.trim();
            const cancellationReason = document.getElementById('cancelOrderReason').value.trim();
            
            if (!orderId || !cancelledBy) {
                this.showNotification('Por favor, preencha quem está cancelando o pedido', 'warning');
                return;
            }

            const orders = await window.db.read('orders', { id: parseInt(orderId) });
            if (orders.length === 0) {
                this.showNotification('Pedido não encontrado', 'error');
                return;
            }

            const order = orders[0];
            const cancelledAt = new Date().toISOString();
            
            // Update order status to cancelled
            await window.db.update('orders', parseInt(orderId), {
                status: 'cancelled',
                cancelled_by: cancelledBy,
                cancellation_reason: cancellationReason,
                cancelled_at: cancelledAt
            });

            // Log the cancellation
            const cancellationLog = {
                id: Date.now(),
                table: 'order_cancellation',
                operation: 'cancel',
                data: {
                    orderId: parseInt(orderId),
                    customer: order.customer,
                    total: order.total,
                    cancelled_by: cancelledBy,
                    cancellation_reason: cancellationReason,
                    cancelled_at: cancelledAt,
                    original_status: order.status
                },
                timestamp: cancelledAt
            };

            window.db.logChange(cancellationLog);

            this.closeModal('cancelOrderModal');
            this.loadOrders();
            this.showNotification('Pedido cancelado com sucesso!', 'success');
            
            // Update dashboard if visible
            if (this.currentSection === 'dashboard') {
                this.loadDashboard();
            }

        } catch (error) {
            console.error('Error cancelling order:', error);
            this.showNotification('Erro ao cancelar pedido: ' + error.message, 'error');
        }
    }

    // Inventory Management
    async loadInventory() {
        try {
            const inventory = await window.db.read('inventory');
            this.renderInventory(inventory);
        } catch (error) {
            console.error('Error loading inventory:', error);
            const tbody = document.getElementById('inventoryTable');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #dc2626;">Erro ao carregar estoque. Tente novamente.</td></tr>';
            }
        }
    }

    renderInventory(inventory) {
        const tbody = document.getElementById('inventoryTable');
        
        if (!tbody) {
            console.error('Inventory table body not found');
            return;
        }

        if (!inventory || inventory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem; color: #64748b;">
                        <i class="fas fa-boxes" style="font-size: 2rem; margin-bottom: 1rem; color: #e2e8f0; display: block;"></i>
                        <strong style="display: block; margin-bottom: 0.5rem; color: #374151;">Nenhum item no estoque</strong>
                        Adicione o primeiro item para começar!
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = inventory.map(item => {
            const status = this.getStockStatus(item.quantity || 0, item.min_stock || 0);
            return `
                <tr>
                    <td>
                        <div>
                            <div style="font-weight: 700; font-size: 0.95rem; color: #1e293b; margin-bottom: 0.25rem;">${item.name || 'Item sem nome'}</div>
                            ${item.supplier ? `<div style="font-size: 0.75rem; color: #64748b;"><i class="fas fa-truck" style="margin-right: 0.25rem;"></i>${item.supplier}</div>` : ''}
                            ${item.cost_price ? `<div style="font-size: 0.75rem; color: #059669; font-weight: 600; margin-top: 0.25rem;">${this.formatCurrency(item.cost_price)}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <span style="font-weight: 700; font-size: 1.1rem; color: ${(item.quantity || 0) <= 0 ? '#dc2626' : (item.quantity || 0) <= (item.min_stock || 0) ? '#d97706' : '#059669'};">
                            ${(item.quantity || 0).toFixed(2)}
                        </span>
                    </td>
                    <td style="font-weight: 600; color: #64748b;">${item.unit || ''}</td>
                    <td style="font-weight: 600; color: #64748b;">${(item.min_stock || 0).toFixed(2)}</td>
                    <td><span class="stock-status ${status}">${this.getStockStatusText(status)}</span></td>
                    <td>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="btn btn-small btn-secondary" onclick="app.duplicateInventoryItem(${item.id})" title="Duplicar Item">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-small btn-danger" onclick="app.deleteInventoryItem(${item.id})" title="Excluir Item">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterInventory() {
        const searchTerm = document.getElementById('inventorySearch').value.toLowerCase();
        const filterValue = document.getElementById('inventoryFilter').value;
        
        window.db.read('inventory').then(inventory => {
            let filtered = inventory;
            
            // Apply search filter
            if (searchTerm) {
                filtered = filtered.filter(item => 
                    item.name.toLowerCase().includes(searchTerm)
                );
            }
            
            // Apply status filter
            if (filterValue !== 'all') {
                filtered = filtered.filter(item => {
                    const status = this.getStockStatus(item.quantity, item.min_stock);
                    return status === filterValue;
                });
            }
            
            this.renderInventory(filtered);
        });
    }

    async handleInventorySubmit() {
        try {
            const formData = {
                name: document.getElementById('inventoryName').value.trim(),
                quantity: parseFloat(document.getElementById('inventoryQuantity').value),
                unit: document.getElementById('inventoryUnit').value,
                min_stock: parseFloat(document.getElementById('inventoryMinStock').value),
                cost_price: parseFloat(document.getElementById('inventoryCostPrice').value) || 0,
                supplier: document.getElementById('inventorySupplier').value.trim() || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Validate required fields
            if (!formData.name || !formData.unit || isNaN(formData.quantity) || isNaN(formData.min_stock) || formData.quantity < 0 || formData.min_stock < 0) {
                this.showNotification('Por favor, preencha todos os campos obrigatórios corretamente', 'warning');
                return;
            }

            // Check if we're editing or creating
            const editingId = document.getElementById('inventoryForm').dataset.editingId;

            if (editingId) {
                // Update existing inventory item
                formData.updated_at = new Date().toISOString();
                await window.db.update('inventory', parseInt(editingId), formData);
                this.showNotification('Item do estoque atualizado com sucesso!', 'success');
            } else {
                // Create new inventory item
                const result = await window.db.create('inventory', formData);
                if (result) {
                    this.showNotification('Item adicionado ao estoque com sucesso!', 'success');
                } else {
                    throw new Error('Failed to create inventory item');
                }
            }

            this.closeModal('inventoryModal');
            // Force reload the inventory with a small delay to ensure database update is complete
            setTimeout(async () => {
                await this.loadInventory();
            }, 100);

        } catch (error) {
            console.error('Error saving inventory item:', error);
            this.showNotification('Erro ao salvar item no estoque: ' + error.message, 'error');
        }
    }

    async editInventoryItem(id) {
        try {
            const inventoryItems = await window.db.read('inventory', { id: id });
            if (inventoryItems.length === 0) {
                this.showNotification('Item não encontrado', 'error');
                return;
            }

            const inventoryItem = inventoryItems[0];

            document.getElementById('inventoryName').value = inventoryItem.name;
            document.getElementById('inventoryQuantity').value = inventoryItem.quantity;
            document.getElementById('inventoryUnit').value = inventoryItem.unit;
            document.getElementById('inventoryMinStock').value = inventoryItem.min_stock;
            document.getElementById('inventoryCostPrice').value = inventoryItem.cost_price || 0;
            document.getElementById('inventorySupplier').value = inventoryItem.supplier || '';

            // Não permite edição, só duplicação
            // (Remover dataset.editingId se existir)
            delete document.getElementById('inventoryForm').dataset.editingId;
            document.querySelector('#inventoryModal .modal-header h3').textContent = 'Duplicar Item do Estoque';

            // Adiciona botão duplicar visível
            let dupBtn = document.querySelector('#inventoryModal .form-actions .duplicate-btn');
            if(!dupBtn) {
                dupBtn = document.createElement('button');
                dupBtn.type = "button";
                dupBtn.className = "btn btn-secondary duplicate-btn";
                dupBtn.innerHTML = '<i class="fas fa-copy"></i> Duplicar';
                dupBtn.onclick = () => this.duplicateInventoryItem(id);
                document.querySelector('#inventoryModal .form-actions').prepend(dupBtn);
            }
            dupBtn.style.display = 'inline-flex';

            this.openModal('inventoryModal');
        } catch (error) {
            console.error('Error loading inventory item for edit:', error);
            this.showNotification('Erro ao carregar item para edição', 'error');
        }
    }

    async duplicateInventoryItem(id) {
        // Load item again and open modal, but do NOT set editingId (so it's a CREATE operation with prefilled values)
        try {
            const inventoryItems = await window.db.read('inventory', { id: id });
            if (inventoryItems.length === 0) {
                this.showNotification('Item não encontrado', 'error');
                return;
            }
            const inventoryItem = inventoryItems[0];
            document.getElementById('inventoryName').value = inventoryItem.name + " (Cópia)";
            document.getElementById('inventoryQuantity').value = inventoryItem.quantity;
            document.getElementById('inventoryUnit').value = inventoryItem.unit;
            document.getElementById('inventoryMinStock').value = inventoryItem.min_stock;
            document.getElementById('inventoryCostPrice').value = inventoryItem.cost_price || 0;
            document.getElementById('inventorySupplier').value = inventoryItem.supplier || '';

            delete document.getElementById('inventoryForm').dataset.editingId;
            document.querySelector('#inventoryModal .modal-header h3').textContent = 'Duplicar Item do Estoque';

            let dupBtn = document.querySelector('#inventoryModal .form-actions .duplicate-btn');
            if (dupBtn) dupBtn.style.display = "none";

            this.openModal('inventoryModal');
        } catch (error) {
            console.error('Erro ao duplicar estoque:', error);
            this.showNotification('Erro ao duplicar item do estoque', 'error');
        }
    }

    async deleteInventoryItem(id) {
        if (confirm('Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.')) {
            try {
                await window.db.delete('inventory', id);
                this.loadInventory();
                this.showNotification('Item excluído com sucesso!', 'success');
            } catch (error) {
                console.error('Error deleting inventory item:', error);
                this.showNotification('Erro ao excluir item', 'error');
            }
        }
    }

    getStockStatus(quantity, minStock) {
        if (quantity <= 0) return 'critical';
        if (quantity <= minStock) return 'low';
        return 'ok';
    }

    getStockStatusText(status) {
        const statusMap = {
            'ok': 'Disponível',
            'low': 'Baixo',
            'critical': 'Crítico'
        };
        return statusMap[status] || status;
    }

    // Purchases Management
    async loadPurchases() {
        try {
            const purchases = await window.db.read('purchases');
            this.renderPurchases(purchases);
        } catch (error) {
            console.error('Error loading purchases:', error);
        }
    }

    renderPurchases(purchases) {
        const container = document.getElementById('purchasesList');
        
        if (purchases.length === 0) {
            container.innerHTML = '<p>Nenhuma compra encontrada.</p>';
            return;
        }

        container.innerHTML = purchases.map(purchase => {
            const items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : purchase.items || [];
            const itemsText = items.map(item => `${item.quantity}${item.unit || ''} ${item.name}`).join(', ');
            const deliveryDate = purchase.delivery_date ? new Date(purchase.delivery_date).toLocaleDateString('pt-BR') : 'Não definida';
            const createdDate = new Date(purchase.created_at || Date.now()).toLocaleDateString('pt-BR');
            
            return `
                <div class="purchase-item">
                    <div class="purchase-info">
                        <h4>Compra #${purchase.id} - ${createdDate}</h4>
                        <div class="purchase-details">
                            <p><strong>Fornecedor:</strong> ${purchase.supplier}</p>
                            <p><strong>Entrega:</strong> ${deliveryDate}</p>
                            <p><strong>Itens:</strong> ${itemsText}</p>
                            <p><strong>Total:</strong> ${this.formatCurrency(purchase.total_cost)}</p>
                        </div>
                    </div>
                    <div class="purchase-actions">
                        <span class="purchase-status ${purchase.status}">${this.getPurchaseStatusText(purchase.status)}</span>
                        ${purchase.status !== 'completed' ? `
                            <button class="btn btn-small btn-success" onclick="app.completePurchase(${purchase.id})">
                                <i class="fas fa-check"></i> Finalizar Compra
                            </button>
                        ` : `
                            <span class="purchase-completed">
                                <i class="fas fa-check-circle"></i> Finalizada
                            </span>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    filterPurchases(status) {
        // Update active tab
        const tabsContainer = document.querySelector('.purchases-container .purchases-tabs');
        tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        tabsContainer.querySelector(`[data-status="${status}"]`).classList.add('active');

        // Filter purchases
        window.db.read('purchases', status === 'all' ? {} : { status }).then(purchases => {
            this.renderPurchases(purchases);
        });
    }

    async handlePurchaseSubmit() {
        try {
            if (this.purchaseItems.length === 0) {
                this.showNotification('Adicione pelo menos um item à compra', 'warning');
                return;
            }

            const formData = {
                supplier: document.getElementById('purchaseSupplier').value,
                delivery_date: document.getElementById('purchaseDeliveryDate').value || null,
                items: JSON.stringify(this.purchaseItems),
                total_cost: this.purchaseTotal,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            await window.db.create('purchases', formData);
            this.closeModal('purchaseModal');
            this.loadPurchases();
            this.showNotification('Compra criada! Use "Finalizar Compra" para adicionar ao estoque.', 'success');
            
            // Reset purchase form
            this.purchaseItems = [];
            this.purchaseTotal = 0;
        } catch (error) {
            console.error('Error creating purchase:', error);
            this.showNotification('Erro ao criar compra', 'error');
        }
    }

    async addPurchaseItem() {
        const inventory = await window.db.read('inventory');
        const container = document.getElementById('purchaseItems');
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'purchase-item-row';
        itemDiv.innerHTML = `
            <select class="purchase-item-select" onchange="app.updatePurchaseTotal()" required>
                <option value="">Selecione um item</option>
                ${inventory.map(item => `
                    <option value="${item.id}" 
                            data-name="${item.name}" 
                            data-unit="${item.unit}" 
                            data-current-price="${item.cost_price || 0}">
                        ${item.name} (${item.unit}) - Atual: ${this.formatCurrency(item.cost_price || 0)}
                    </option>
                `).join('')}
            </select>
            <input type="number" class="purchase-item-quantity" min="0.01" step="0.01" value="1" 
                   placeholder="Quantidade" onchange="app.updatePurchaseTotal()" required>
            <input type="number" class="purchase-item-price" min="0.01" step="0.01" 
                   placeholder="Preço unitário" onchange="app.updatePurchaseTotal()" required>
            <button type="button" class="btn btn-small btn-danger" onclick="app.removePurchaseItem(this)">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        container.appendChild(itemDiv);
    }

    removePurchaseItem(button) {
        button.parentElement.remove();
        this.updatePurchaseTotal();
    }

    updatePurchaseTotal() {
        const purchaseItems = document.querySelectorAll('.purchase-item-row');
        this.purchaseItems = [];
        this.purchaseTotal = 0;
        
        purchaseItems.forEach(row => {
            const select = row.querySelector('.purchase-item-select');
            const quantityInput = row.querySelector('.purchase-item-quantity');
            const priceInput = row.querySelector('.purchase-item-price');
            
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            
            if (select.value && quantity > 0 && price > 0) {
                const option = select.selectedOptions[0];
                const name = option.dataset.name;
                const unit = option.dataset.unit;
                const currentPrice = parseFloat(option.dataset.currentPrice) || 0;
                
                this.purchaseItems.push({
                    id: select.value,
                    name: name,
                    unit: unit,
                    quantity: quantity,
                    price: price,
                    currentPrice: currentPrice,
                    total: price * quantity
                });
                
                this.purchaseTotal += price * quantity;
            }
        });
        
        document.getElementById('purchaseTotal').textContent = this.formatCurrency(this.purchaseTotal);
    }

    async completePurchase(purchaseId) {
        if (!confirm('Tem certeza que deseja finalizar esta compra? Isso adicionará os itens ao estoque e não poderá ser desfeito.')) {
            return;
        }

        try {
            // Get purchase details
            const purchases = await window.db.read('purchases', { id: purchaseId });
            if (purchases.length === 0) {
                this.showNotification('Compra não encontrada', 'error');
                return;
            }

            const purchase = purchases[0];
            const items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : purchase.items || [];
            
            let priceChanges = [];
            let stockMovements = [];

            // Process each item
            for (const item of items) {
                try {
                    const inventoryItems = await window.db.read('inventory', { id: item.id });
                    if (inventoryItems.length > 0) {
                        const inventoryItem = inventoryItems[0];
                        const oldPrice = inventoryItem.cost_price || 0;
                        const newPrice = item.price;
                        const priceChange = ((newPrice - oldPrice) / oldPrice) * 100;
                        
                        // Update inventory quantity
                        const newQuantity = inventoryItem.quantity + item.quantity;
                        
                        // Calculate new weighted average cost price
                        const totalOldValue = oldPrice * inventoryItem.quantity;
                        const totalNewValue = newPrice * item.quantity;
                        const newCostPrice = (totalOldValue + totalNewValue) / newQuantity;
                        
                        // Update inventory
                        await window.db.update('inventory', item.id, { 
                            quantity: newQuantity,
                            cost_price: newCostPrice
                        });

                        // Record movements
                        stockMovements.push({
                            item: item.name,
                            oldQuantity: inventoryItem.quantity,
                            addedQuantity: item.quantity,
                            newQuantity: newQuantity,
                            unit: item.unit
                        });

                        // Record price changes if significant (>5%)
                        if (Math.abs(priceChange) > 5) {
                            priceChanges.push({
                                item: item.name,
                                oldPrice: oldPrice,
                                newPrice: newCostPrice,
                                change: priceChange
                            });

                            // Update menu items that use this ingredient
                            await this.updateMenuPricesForIngredient(item.name, priceChange);
                        }
                    }
                } catch (error) {
                    console.error('Error processing item:', item, error);
                }
            }

            // Update purchase status
            await window.db.update('purchases', purchaseId, { 
                status: 'completed',
                completed_at: new Date().toISOString()
            });

            // Log comprehensive purchase completion
            const purchaseReport = {
                id: Date.now(),
                table: 'purchase_completion',
                operation: 'complete',
                data: {
                    purchaseId: purchaseId,
                    supplier: purchase.supplier,
                    totalCost: purchase.total_cost,
                    itemsCount: items.length,
                    stockMovements: stockMovements,
                    priceChanges: priceChanges,
                    completedAt: new Date().toISOString()
                },
                timestamp: new Date().toISOString()
            };

            window.db.logChange(purchaseReport);

            // Show detailed completion message
            let message = `Compra finalizada! ${stockMovements.length} itens adicionados ao estoque.`;
            if (priceChanges.length > 0) {
                message += ` ${priceChanges.length} preços foram ajustados.`;
            }

            this.showNotification(message, 'success');
            this.loadPurchases();
            this.loadInventory();
            
            // Update dashboard if visible
            if (this.currentSection === 'dashboard') {
                this.loadDashboard();
            }

        } catch (error) {
            console.error('Error completing purchase:', error);
            this.showNotification('Erro ao finalizar compra', 'error');
        }
    }

    async updateMenuPricesForIngredient(ingredientName, priceChangePercent) {
        try {
            const menu = await window.db.read('menu');
            const adjustmentFactor = priceChangePercent / 100;
            
            for (const menuItem of menu) {
                if (menuItem.ingredients && menuItem.ingredients.toLowerCase().includes(ingredientName.toLowerCase())) {
                    // Calculate proportional cost increase (reduced impact on final price)
                    const costAdjustment = (menuItem.cost_price || 0) * adjustmentFactor * 0.3; // 30% of the ingredient price change
                    const newCostPrice = (menuItem.cost_price || 0) + costAdjustment;
                    
                    // Optionally adjust selling price to maintain margin
                    const currentMargin = ((menuItem.price - (menuItem.cost_price || 0)) / menuItem.price) * 100;
                    let newPrice = menuItem.price;
                    
                    // If margin drops below 60%, adjust selling price
                    const newMargin = ((menuItem.price - newCostPrice) / menuItem.price) * 100;
                    if (newMargin < 60) {
                        newPrice = newCostPrice / 0.4; // Maintain 60% margin
                    }
                    
                    await window.db.update('menu', menuItem.id, {
                        cost_price: newCostPrice,
                        price: newPrice
                    });

                    // Log menu price adjustment
                    const priceAdjustmentReport = {
                        id: Date.now() + Math.random(),
                        table: 'menu_price_adjustment',
                        operation: 'update',
                        data: {
                            menuItem: menuItem.name,
                            affectedByIngredient: ingredientName,
                            oldCostPrice: menuItem.cost_price || 0,
                            newCostPrice: newCostPrice,
                            oldPrice: menuItem.price,
                            newPrice: newPrice,
                            priceChangePercent: priceChangePercent
                        },
                        timestamp: new Date().toISOString()
                    };

                    window.db.logChange(priceAdjustmentReport);
                }
            }
        } catch (error) {
            console.error('Error updating menu prices:', error);
        }
    }

    async updatePurchaseStatus(id, newStatus) {
        try {
            await window.db.update('purchases', id, { status: newStatus });
            
            // If status is 'delivered', update inventory
            if (newStatus === 'delivered') {
                const purchase = await window.db.read('purchases', { id });
                if (purchase.length > 0) {
                    await this.updateInventoryFromPurchase(purchase[0]);
                }
            }
            
            this.loadPurchases();
            this.showNotification('Status da compra atualizado!', 'success');
        } catch (error) {
            console.error('Error updating purchase status:', error);
            this.showNotification('Erro ao atualizar status', 'error');
        }
    }

    async updateInventoryFromPurchase(purchase) {
        const items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : purchase.items || [];
        
        for (const item of items) {
            try {
                const inventoryItems = await window.db.read('inventory', { id: item.id });
                if (inventoryItems.length > 0) {
                    const inventoryItem = inventoryItems[0];
                    const newQuantity = inventoryItem.quantity + item.quantity;
                    await window.db.update('inventory', item.id, { quantity: newQuantity });
                }
            } catch (error) {
                console.error('Error updating inventory item:', error);
            }
        }
    }

    getPurchaseStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'completed': 'Finalizada'
        };
        return statusMap[status] || status;
    }

    getNextPurchaseStatus(status) {
        const statusFlow = {
            'pending': 'ordered',
            'ordered': 'delivered',
            'delivered': 'delivered'
        };
        return statusFlow[status] || status;
    }

    getNextPurchaseStatusText(status) {
        const nextStatus = this.getNextPurchaseStatus(status);
        const textMap = {
            'ordered': 'Fazer Pedido',
            'delivered': 'Marcar como Entregue'
        };
        return textMap[nextStatus] || 'Atualizar';
    }

    // Finances Management
    async loadFinances() {
        try {
            const orders = await window.db.read('orders');
            const menu = await window.db.read('menu');
            const expenses = await window.db.read('expenses');
            
            this.renderFinancialSummary(orders, menu, expenses);
            this.renderExpensesList(expenses);
            this.loadCashFlowChart(orders, menu, expenses);
        } catch (error) {
            console.error('Error loading finances:', error);
        }
    }

    renderFinancialSummary(orders, menu, expenses) {
        // Calculate this month's data (excluding cancelled orders)
        const thisMonth = new Date();
        const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
        
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.created_at || order.date);
            return orderDate >= startOfMonth && order.status !== 'cancelled';
        });

        const monthlyExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startOfMonth;
        });

        const revenue = monthlyOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const costs = this.calculateOrdersCosts(monthlyOrders, menu);
        const fees = this.calculateOrdersFees(monthlyOrders);
        const expensesTotal = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const profit = revenue - costs - fees - expensesTotal;

        // Update elements
        document.getElementById('monthlyRevenue').textContent = this.formatCurrency(revenue);
        document.getElementById('monthlyCosts').textContent = this.formatCurrency(costs);
        document.getElementById('monthlyExpenses').textContent = this.formatCurrency(expensesTotal + fees);
        document.getElementById('monthlyProfit').textContent = this.formatCurrency(profit);
        
        // Update profit color
        const profitElement = document.getElementById('monthlyProfit');
        profitElement.className = `finance-value ${profit >= 0 ? 'profit' : 'expense'}`;
    }

    renderExpensesList(expenses) {
        const container = document.getElementById('expensesList');
        
        if (expenses.length === 0) {
            container.innerHTML = '<p>Nenhuma despesa encontrada.</p>';
            return;
        }

        // Sort by date (most recent first)
        const sortedExpenses = expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = sortedExpenses.slice(0, 10).map(expense => `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-description">${expense.description}</div>
                    <div class="expense-category">${expense.category}</div>
                </div>
                <div class="expense-amount">${this.formatCurrency(expense.amount)}</div>
                <div class="expense-date">${new Date(expense.date).toLocaleDateString('pt-BR')}</div>
            </div>
        `).join('');
    }

    async loadCashFlowChart(orders, menu, expenses) {
        const ctx = document.getElementById('cashFlowChart');
        if (!ctx) return;

        // Prepare data for the last 6 months (excluding cancelled orders)
        const last6Months = [];
        const revenueData = [];
        const expenseData = [];
        const profitData = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            last6Months.push(date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }));
            
            const monthOrders = orders.filter(order => {
                const orderDate = new Date(order.created_at || order.date);
                return orderDate >= monthStart && orderDate <= monthEnd && order.status !== 'cancelled';
            });
            
            const monthExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate >= monthStart && expenseDate <= monthEnd;
            });
            
            const revenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const costs = this.calculateOrdersCosts(monthOrders, menu);
            const fees = this.calculateOrdersFees(monthOrders);
            const expensesTotal = monthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
            const totalExpenses = costs + fees + expensesTotal;
            
            revenueData.push(revenue);
            expenseData.push(totalExpenses);
            profitData.push(revenue - totalExpenses);
        }

        // Destroy existing chart if it exists
        if (this.charts.cashFlow) {
            this.charts.cashFlow.destroy();
        }

        // Create new chart with fixed import
        try {
            const ChartModule = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm');
            const Chart = ChartModule.default;
            
            this.charts.cashFlow = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last6Months,
                    datasets: [{
                        label: 'Receita',
                        data: revenueData,
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
                        tension: 0.4,
                        fill: false
                    }, {
                        label: 'Despesas',
                        data: expenseData,
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        tension: 0.4,
                        fill: false
                    }, {
                        label: 'Lucro',
                        data: profitData,
                        borderColor: '#0891b2',
                        backgroundColor: 'rgba(8, 145, 178, 0.1)',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value.toFixed(2);
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading cash flow chart:', error);
        }
    }

    async handleExpenseSubmit() {
        try {
            const formData = {
                description: document.getElementById('expenseDescription').value,
                category: document.getElementById('expenseCategory').value,
                amount: parseFloat(document.getElementById('expenseAmount').value),
                date: document.getElementById('expenseDate').value
            };

            await window.db.create('expenses', formData);
            this.closeModal('expenseModal');
            this.loadFinances();
            this.showNotification('Despesa adicionada!', 'success');
        } catch (error) {
            console.error('Error adding expense:', error);
            this.showNotification('Erro ao adicionar despesa', 'error');
        }
    }

    // Analytics
    async loadAnalytics() {
        try {
            // Carrega todos, mas sempre filtra os pedidos pelo período global se setado
            const ordersRaw = await window.db.read('orders');
            const menu = await window.db.read('menu');
            const inventory = await window.db.read('inventory');
            const expenses = await window.db.read('expenses');
            const changeLog = JSON.parse(localStorage.getItem('changeLog') || '[]');

            // -- GARANTE: Não é null para loaders abaixo
            const orders = this.filterOrdersByAnalyticsPeriod
                ? this.filterOrdersByAnalyticsPeriod(ordersRaw)
                : ordersRaw;

            // --- Se não houver pedidos/itens, mostrar mensagens ou gráficos/relatórios zerados ---

            // Gráfico de vendas por categoria
            await this.loadCategoryChart(orders, menu);

            // Lista de vendas por categoria (texto explicativo)
            this.renderSalesCategoryList(orders, menu);

            // Tendência mensal (gráfico: linha única de vendas, linha única qtd pedidos)
            await this.loadTrendChart(orders);

            // Ticket médio mensal
            this.renderAvgOrderValueTrend(orders, menu);

            // Top 10 itens do menu vendidos
            this.renderTopMenuItems(orders, menu);

            // Top clientes
            this.renderTopClients(orders, menu);

            // Estatísticas gerais (resumos)
            this.renderGeneralStats(orders, menu, expenses);

            // Gráfico de pedidos por plataforma (pie)
            await this.renderOrdersByPlatformChart(orders, menu);

            // NOVO: Relatório específico de cancelamentos
            this.renderCancellationReport(changeLog);

            // NOVO: Relatório de taxas e descontos
            this.renderFeesReport(orders);

            // Movimentação de estoque (logs)
            this.renderStockMovementReport(changeLog, inventory);

        } catch (error) {
            console.error('Error loading analytics:', error);

            // Solução: Limpa TODOS OS CANVAS, reseta todos com mensagem clara
            const reportIds = [
                'categoryChart', 'topSalesCategory',
                'trendChart', 'avgOrderValueTrend',
                'topMenuItems', 'topClients',
                'generalStats', 'ordersByPlatformChart',
                'cancellationReport', 'feesReport',
                'stockMovementReport'
            ];
            reportIds.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;

                // CANVAS: Limpa e exibe texto (erro)
                if (el.tagName === "CANVAS") {
                    const ctx = el.getContext && el.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, el.width, el.height);
                        // Pode opcionalmente exibir o erro desenhando na tela
                        ctx.save();
                        ctx.font = "16px Arial";
                        ctx.fillStyle = "#dc2626";
                        ctx.textAlign = "center";
                        ctx.fillText("Erro ao carregar gráfico", el.width/2, el.height/2);
                        ctx.restore();
                    }
                } else {
                    el.innerHTML = '<em>Erro ao carregar relatório.</em>';
                }
            });
        }
    }

    filterOrdersByAnalyticsPeriod(orders) {
        if (!this.analyticsPeriod || (!this.analyticsPeriod.from && !this.analyticsPeriod.to)) {
            // Exclude cancelled orders by default
            return orders.filter(order => order.status !== 'cancelled');
        }
        const {from, to} = this.analyticsPeriod;
        return orders.filter(order => {
            if (order.status === 'cancelled') return false;
            const createdAt = new Date(order.created_at || order.date);
            if (from && createdAt < from) return false;
            if (to && createdAt > to) return false;
            return true;
        });
    }

    applyAnalyticsPeriodFilter() {
        // Lê datas dos campos
        const dateFromInput = document.getElementById('analyticsDateFrom').value;
        const dateToInput   = document.getElementById('analyticsDateTo').value;
        // Se ambos vazios, ignora
        if (!dateFromInput && !dateToInput) {
            this.analyticsPeriod = null;
            this.loadAnalytics();
            return;
        }
        let fromDate = dateFromInput ? new Date(dateFromInput + "T00:00:00") : null;
        let toDate   = dateToInput   ? new Date(dateToInput   + "T23:59:59") : null;
        // Sanidade: inverte datas se from > to
        if (fromDate && toDate && fromDate > toDate) {
            const temp = fromDate; fromDate = toDate; toDate = temp;
        }
        this.analyticsPeriod = {from: fromDate, to: toDate};
        document.getElementById('analyticsClearFilterBtn').style.display = '';
        this.loadAnalytics();
    }

    clearAnalyticsPeriodFilter() {
        this.analyticsPeriod = null;
        document.getElementById('analyticsDateFrom').value = '';
        document.getElementById('analyticsDateTo').value = '';
        document.getElementById('analyticsClearFilterBtn').style.display = 'none';
        this.loadAnalytics();
    }

    resetAnalyticsFilterInputs() {
        const from = document.getElementById('analyticsDateFrom');
        const to   = document.getElementById('analyticsDateTo');
        if (from) from.value = '';
        if (to)   to.value = '';
        const btn = document.getElementById('analyticsClearFilterBtn');
        if (btn) btn.style.display = 'none';
    }

    async loadCategoryChart(orders, menu) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;
        
        // Calcula vendas por categoria (excluding cancelled orders)
        const catMap = {};
        orders.filter(order => order.status !== 'cancelled').forEach(order => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            items.forEach(item => {
                const menuItem = menu.find(m => m.id == item.id);
                if (menuItem) {
                    const cat = this.getCategoryName(menuItem.category);
                    if (!catMap[cat]) catMap[cat] = 0;
                    catMap[cat] += (item.price || 0) * (item.quantity || 1);
                }
            });
        });

        // O filtro pode trazer meses sem vendas — removemos as categorias zeradas do gráfico (mas mantém na lista textual para comparação)
        // Atenção: Mantém a ordem das categorias, para não duplicar/aparecer zerado no final
        // Se estiver filtrado e não houver pedidos no período, exibe apenas vazio.
        const cats = Object.keys(catMap);
        const sales = cats.map(c => catMap[c]);

        // Limpa gráfico antigo
        if (this.charts.categoryChart) {
            this.charts.categoryChart.destroy();
        }

        try {
            const ChartModule = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm');
            const Chart = ChartModule.default;
            // Pie chart redondo conforme solicitado
            this.charts.categoryChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: cats,
                    datasets: [
                        {
                            label: 'Vendas por Categoria',
                            data: sales,
                            backgroundColor: cats.map((c, i) => ["#059669", "#dc2626","#3b82f6", "#d97706", "#a21caf", "#eab308", "#0ea5e9", "#84cc16"][i%8])
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: true, position: 'bottom' } }
                }
            });

        } catch (e) {
            console.error('Erro ao exibir gráfico de categoria:', e);
        }
    }

    renderSalesCategoryList(orders, menu) {
        const catSums = {};
        orders.filter(order => order.status !== 'cancelled').forEach(order => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            items.forEach(item => {
                const menuItem = menu.find(m => m.id == item.id);
                if (menuItem) {
                    const cat = this.getCategoryName(menuItem.category);
                    if (!catSums[cat]) catSums[cat] = 0;
                    catSums[cat] += (item.price || 0) * (item.quantity || 1);
                }
            });
        });
        const cats = Object.keys(catSums);
        const el = document.getElementById('topSalesCategory');
        if (!el) return;
        if (cats.length === 0) {
            el.innerHTML = '<em>Sem vendas na categoria neste período.</em>'; return;
        }
        // Exibe rank e valores:
        const sorted = cats
            .map(cat => ({ cat, val: catSums[cat] }))
            .sort((a, b) => b.val - a.val);

        el.innerHTML = `
        <ol class="top-sales-category-list">
            ${sorted.map(({cat, val}, idx) => `
                <li class="top-sales-category-item">
                    <span class="top10-rank">#${idx + 1}</span>
                    <span class="top-sales-category-name">${cat}</span>
                    <span class="top-sales-category-sum">${this.formatCurrency(val)}</span>
                </li>
            `).join('')}
        </ol>
        `;
    }

    async loadTrendChart(orders) {
        // Se houver filtro de período ativo e ambos campos preenchidos, mostrar meses exatos do período.
        // Caso contrário, mostra os últimos 6 meses (como padrão).

        let months = [];
        let sales = [];
        let qtys = [];

        let usePeriod = false;
        let fromDate, toDate;
        if (this.analyticsPeriod && (this.analyticsPeriod.from || this.analyticsPeriod.to)) {
            usePeriod = true;
            fromDate = this.analyticsPeriod.from;
            toDate = this.analyticsPeriod.to;
        }

        let ordersInPeriod = orders.slice();

        if (usePeriod) {
            // Se filtrando, selecionar apenas os pedidos dentro do range (excluding cancelled)
            if (fromDate || toDate) {
                ordersInPeriod = ordersInPeriod.filter(order => {
                    if (order.status === 'cancelled') return false;
                    const orderDate = new Date(order.created_at || order.date);
                    if (fromDate && orderDate < fromDate) return false;
                    if (toDate && orderDate > toDate) return false;
                    return true;
                });
            }

            // Gera meses presentes dentro do período filtrado (mesmo sem vendas)
            months = [];
            if (fromDate && toDate) {
                // De from até to, lista todos os meses (inclusive)
                let d = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
                const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
                while (d <= end) {
                    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                    d.setMonth(d.getMonth() + 1);
                }
            } else if (fromDate) {
                let d = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
                const lastOrder = ordersInPeriod.length
                  ? new Date(Math.max(...ordersInPeriod.map(o => +new Date(o.created_at || o.date))))
                  : fromDate;
                const end = new Date(lastOrder.getFullYear(), lastOrder.getMonth(), 1);
                while (d <= end) {
                    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                    d.setMonth(d.getMonth() + 1);
                }
            } else if (toDate) {
                // Mostra os 6 meses antes da data final
                let d = new Date(toDate.getFullYear(), toDate.getMonth() - 5, 1);
                const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
                while (d <= end) {
                    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                    d.setMonth(d.getMonth() + 1);
                }
            } else {
                // Não deveria acontecer, mas como fallback pegar todos meses de pedidos presentes
                let uniques = {};
                ordersInPeriod.forEach(order => {
                    const date = new Date(order.created_at || order.date);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    uniques[key] = true;
                });
                months = Object.keys(uniques).sort();
            }
        } else {
            // PADRÃO: últimos 6 meses (excluding cancelled orders)
            months = [];
            let dt = new Date();
            dt.setDate(1);
            for (let i = 5; i >= 0; i--) {
                let d = new Date(dt.getFullYear(), dt.getMonth() - i, 1);
                months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }
            // Filter out cancelled orders
            ordersInPeriod = ordersInPeriod.filter(order => order.status !== 'cancelled');
        }

        sales = months.map(() => 0);
        qtys = months.map(() => 0);

        ordersInPeriod.forEach(order => {
            const date = new Date(order.created_at || order.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const idx = months.indexOf(key);
            if (idx !== -1) {
                sales[idx] += (order.total || 0);
                qtys[idx]++;
            }
        });

        // Monta labels amigáveis para meses
        const labels = months.map(m => {
            const parts = m.split('-');
            const mm = new Date(parts[0], parts[1] - 1);
            return mm.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        });

        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        if (this.charts.trendChart) this.charts.trendChart.destroy();

        try {
            const ChartModule = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm');
            const Chart = ChartModule.default;

            // Apenas linhas (sem área)
            this.charts.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Vendas (R$)',
                            data: sales,
                            fill: false,
                            borderColor: '#059669',
                            backgroundColor: 'rgba(5,150,105,0.1)',
                            tension: 0.32,
                            pointRadius: 5,
                            pointBackgroundColor: '#059669',
                            order: 1
                        },
                        {
                            label: 'Pedidos',
                            data: qtys,
                            fill: false,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59,130,246,0.12)',
                            tension: 0.32,
                            pointRadius: 5,
                            pointBackgroundColor: '#3b82f6',
                            yAxisID: 'y2',
                            order: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: context => {
                                    if (context.datasetIndex === 0)
                                        return `Vendas: ${context.parsed.y ? 'R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 0}`;
                                    return `Pedidos: ${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            position: "left",
                            title: { display: true, text: 'Vendas (R$)' },
                            ticks: {
                                callback: val => 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })
                            }
                        },
                        y2: {
                            beginAtZero: true,
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            title: { display: true, text: 'Qtd. Pedidos' },
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        } catch (e) {
            console.error("Erro ao carregar gráfico de tendência:", e);
        }
    }

    renderAvgOrderValueTrend(orders, menu) {
        // Ticket médio por mês, com período customizado se setado (excluding cancelled orders)
        let months = {};
        orders.filter(order => order.status !== 'cancelled').forEach(order => {
            const date = new Date(order.created_at || order.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!months[key]) months[key] = { sum: 0, qtd: 0 };
            months[key].sum += (order.total || 0);
            months[key].qtd++;
        });
        const sortedKeys = Object.keys(months).sort();
        if (sortedKeys.length === 0) {
            document.getElementById('avgOrderValueTrend').innerHTML = '<em>Sem pedidos para calcular ticket médio.</em>'; return;
        }
        const tr = sortedKeys.map(key => {
            const dt = new Date(key.split('-')[0], key.split('-')[1] - 1);
            const med = months[key].qtd ? months[key].sum / months[key].qtd : 0;
            return `<div>${dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}: <strong>${this.formatCurrency(med)}</strong> (${months[key].qtd} pedidos)</div>`;
        });
        document.getElementById('avgOrderValueTrend').innerHTML = tr.join('');
    }

    renderTopMenuItems(orders, menu) {
        // Pega os 10 mais vendidos (por quantidade) - excluding cancelled orders
        const sums = {};
        orders.filter(order => order.status !== 'cancelled').forEach(order => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            items.forEach(item => {
                if (!sums[item.id]) sums[item.id] = { qtd: 0, sum: 0, name: '', unit: '' };
                sums[item.id].qtd += item.quantity || 1;
                sums[item.id].sum += (item.price || 0) * (item.quantity || 1);
                const m = menu.find(e => e.id == item.id);
                if (m) { sums[item.id].name = m.name; sums[item.id].unit = m.category; }
            });
        });
        const sorted = Object.entries(sums)
            .sort((a, b) => b[1].qtd - a[1].qtd)
            .slice(0, 10);
        const el = document.getElementById('topMenuItems');
        if (!el) return;
        if (sorted.length === 0) { el.innerHTML = '<em>Nenhum dado de itens vendidos.</em>'; return; }
        el.innerHTML = `<ol class="top10-list">
            ${sorted.map(([id, d], idx) => `
            <li class="top10-item">
                <span class="top10-rank">#${idx + 1}</span>
                <span class="top10-name">${d.name || '-'}</span>
                <span style="font-size:0.86em; color:#64748b;">${d.unit}</span>
                <span class="top10-qtd">${d.qtd}x</span>
                <span class="top10-sum">${this.formatCurrency(d.sum)}</span>
            </li>`).join('')}
        </ol>`;
    }

    renderTopClients(orders, menu) {
        // Top clientes, por quantidade de pedidos e valor total (excluding cancelled orders)
        const clients = {};
        orders.filter(order => order.status !== 'cancelled').forEach(order => {
            if (!order.customer) return;
            if (!clients[order.customer]) clients[order.customer] = { qtd: 0, sum: 0 };
            clients[order.customer].qtd++;
            clients[order.customer].sum += (order.total || 0);
        });
        const sorted = Object.entries(clients).sort((a, b) => b[1].sum - a[1].sum).slice(0, 10);
        const el = document.getElementById('topClients');
        if (!el) return;
        if (sorted.length === 0) { el.innerHTML = '<em>Nenhum cliente recorrente.</em>'; return; }
        el.innerHTML = `<ol class="top-clients-list">
            ${sorted.map(([name, d], idx) => `
                <li class="top-client-item">
                    <span class="top10-rank">#${idx + 1}</span>
                    <span class="top-client-name">${name}</span>
                    <span class="top-client-qtd">${d.qtd} pedidos</span>
                    <span class="top-client-sum">${this.formatCurrency(d.sum)}</span>
                </li>
            `).join('')}
        </ol>`;
    }

    renderGeneralStats(orders, menu, expenses) {
        // Gera um resumo geral de dados para facilitar auditorias rápidas (excluding cancelled orders)
        const activeOrders = orders.filter(order => order.status !== 'cancelled');
        const cancelledOrders = orders.filter(order => order.status === 'cancelled');
        const totalSales = activeOrders.reduce((a, b) => a + (b.total || 0), 0);
        const totalOrders = activeOrders.length;
        const firstOrder = activeOrders.length > 0 ? new Date(Math.min(...activeOrders.map(o => +new Date(o.created_at || o.date)))) : null;
        const lastOrder = activeOrders.length > 0 ? new Date(Math.max(...activeOrders.map(o => +new Date(o.created_at || o.date)))) : null;
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
        const totalMenu = menu.length;
        const totalExpenses = expenses.reduce((a, b) => a + (b.amount || 0), 0);
        const cancelledValue = cancelledOrders.reduce((a, b) => a + (b.total || 0), 0);

        // Pedidos por plataforma
        let ifood = 0, vendas = 0;
        activeOrders.forEach(order => {
            if ((order.platform || '').toLowerCase() === 'ifood') ifood++;
            else vendas++;
        });

        const el = document.getElementById('generalStats');
        if (!el) return;
        el.innerHTML = `
        <div class="financial-summary-item">
            <span class="financial-summary-label">Total de Pedidos:</span>
            <span class="financial-summary-value">${totalOrders}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Pedidos Cancelados:</span>
            <span class="financial-summary-value negative">${cancelledOrders.length}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Valor Cancelado:</span>
            <span class="financial-summary-value negative">${this.formatCurrency(cancelledValue)}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Primeiro Pedido em:</span>
            <span class="financial-summary-value">${firstOrder ? firstOrder.toLocaleDateString('pt-BR') : '-'}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Último Pedido em:</span>
            <span class="financial-summary-value">${lastOrder ? lastOrder.toLocaleDateString('pt-BR') : '-'}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Ticket Médio:</span>
            <span class="financial-summary-value">${this.formatCurrency(avgOrderValue)}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Itens no Menu:</span>
            <span class="financial-summary-value">${totalMenu}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Total Vendas:</span>
            <span class="financial-summary-value positive">${this.formatCurrency(totalSales)}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Total Despesas:</span>
            <span class="financial-summary-value negative">${this.formatCurrency(totalExpenses)}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Pedidos Internos:</span>
            <span class="financial-summary-value">${vendas}</span>
        </div>
        <div class="financial-summary-item">
            <span class="financial-summary-label">Pedidos Ifood:</span>
            <span class="financial-summary-value">${ifood}</span>
        </div>
        `;
    }

    async renderOrdersByPlatformChart(orders, menu) {
        // Pie: pedidos por plataforma (excluding cancelled orders)
        const ctx = document.getElementById('ordersByPlatformChart');
        if (!ctx) return;
        let ifood = 0, vendas = 0;
        orders.filter(order => order.status !== 'cancelled').forEach(order => {
            if ((order.platform || '').toLowerCase() === 'ifood') ifood++;
            else vendas++;
        });

        // Se já existir, destrua
        if (this.charts.ordersByPlatform) this.charts.ordersByPlatform.destroy();

        try {
            const ChartModule = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm');
            const Chart = ChartModule.default;
            this.charts.ordersByPlatform = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Vendas Internas', 'Ifood'],
                    datasets: [{
                        data: [vendas, ifood],
                        backgroundColor: [
                            '#059669', '#dc2626'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        } catch (e) { }
    }

    renderStockMovementReport(changeLog, inventory) {
        // Baixas de estoque automáticas e cancelamentos (últimos pedidos e finalizações de compra), pegar só últimas 15
        const recent = changeLog
            .filter(log =>
                log.table === 'stock_movement' || log.table === 'purchase_completion' || log.table === 'order_cancellation'
            )
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 15);

        const el = document.getElementById('stockMovementReport');
        if (!el) return;

        if (recent.length === 0) {
            el.innerHTML = '<em>Nenhuma movimentação recente de estoque registrada.</em>'; return;
        }
        // Estrutura
        el.innerHTML = recent.map(log => {
            if (log.table === 'stock_movement') {
                const m = log.data;
                return `
                    <div class="sync-activity-item">
                        <div class="sync-activity-icon deduction">
                            <i class="fas fa-minus"></i>
                        </div>
                        <div class="sync-activity-content">
                            <span class="sync-activity-title">Pedido (${m.customer}) baixado no estoque</span>
                            <div class="sync-activity-time">${new Date(log.timestamp).toLocaleString('pt-BR')}</div>
                            <ul style="margin: .23em 0 0 0.7em; font-size: 0.925em;">
                                ${m.movements.map(mv => `<li>${mv.deducted} ${mv.unit} de ${mv.itemName} (de ${mv.oldQuantity} para ${mv.newQuantity})</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            } else if (log.table === 'purchase_completion') {
                const d = log.data;
                return `
                    <div class="sync-activity-item">
                        <div class="sync-activity-icon complete">
                            <i class="fas fa-cart-plus"></i>
                        </div>
                        <div class="sync-activity-content">
                            <span class="sync-activity-title">Compra de <strong>${d.supplier}</strong> finalizada</span>
                            <div class="sync-activity-time">${d.completedAt ? new Date(d.completedAt).toLocaleString('pt-BR') : ''}</div>
                            <ul style="margin: .17em 0 0 0.7em; font-size: 0.915em;">
                                ${d.stockMovements.map(mv => `<li>+${mv.addedQuantity} ${mv.unit} em ${mv.item}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            } else if (log.table === 'order_cancellation') {
                const d = log.data;
                return `
                    <div class="sync-activity-item">
                        <div class="sync-activity-icon delete">
                            <i class="fas fa-times"></i>
                        </div>
                        <div class="sync-activity-content">
                            <span class="sync-activity-title">Pedido #${d.orderId} cancelado</span>
                            <div class="sync-activity-time">${new Date(d.cancelled_at).toLocaleString('pt-BR')}</div>
                            <div style="margin: .17em 0 0 0.7em; font-size: 0.915em;">
                                Cliente: ${d.customer} | Valor: ${this.formatCurrency(d.total)}<br>
                                Cancelado por: ${d.cancelled_by}<br>
                                ${d.cancellation_reason ? `Motivo: ${d.cancellation_reason}` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }

    renderCancellationReport(changeLog) {
        const el = document.getElementById('cancellationReport');
        if (!el) return;

        // Busca todos os logs tipo 'order_cancellation'
        const logs = changeLog
            .filter(log => log.table === 'order_cancellation')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Mais recentes primeiro

        if (logs.length === 0) {
            el.innerHTML = '<em>Nenhum pedido cancelado registrado.</em>'; return;
        }

        el.innerHTML = `
        <table style="width:100%; font-size: 0.96em; border-collapse:collapse;">
            <thead>
                <tr style="background:#f0fdf4">
                    <th style="padding:0.6em 0.4em;">Pedido</th>
                    <th style="padding:0.6em 0.4em;">Cliente</th>
                    <th style="padding:0.6em 0.4em;">Valor</th>
                    <th style="padding:0.6em 0.4em;">Cancelado por</th>
                    <th style="padding:0.6em 0.4em;">Motivo</th>
                    <th style="padding:0.6em 0.4em;">Data/Hora</th>
                    <th style="padding:0.6em 0.4em;">Status Original</th>
                </tr>
            </thead>
            <tbody>
            ${logs.map(log => {
                const d = log.data || {};
                return `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:0.45em 0.3em;">#${d.orderId || '-'}</td>
                    <td style="padding:0.45em 0.3em;">${d.customer || '-'}</td>
                    <td style="padding:0.45em 0.3em;">${this.formatCurrency(d.total || 0)}</td>
                    <td style="padding:0.45em 0.3em;">${d.cancelled_by || '-'}</td>
                    <td style="padding:0.45em 0.3em; max-width: 180px; word-break:break-word;">
                        ${d.cancellation_reason ? `<span>${d.cancellation_reason}</span>` : '<span style="color:#64748b;">-</span>'}
                    </td>
                    <td style="padding:0.45em 0.3em;">${d.cancelled_at ? new Date(d.cancelled_at).toLocaleString('pt-BR') : '-'}</td>
                    <td style="padding:0.45em 0.3em;">${this.getStatusText(d.original_status)}</td>
                </tr>
                `;
            }).join('')}
            </tbody>
        </table>
        <div style="margin:1.2em 0 0.5em 0; font-size:0.89em; color:#64748b;">
            Total cancelamentos: <strong>${logs.length}</strong> | Valor total: <strong>${this.formatCurrency(logs.reduce((a, b) => a + (b.data?.total || 0), 0))}</strong>
        </div>
        `;
    }

    renderFeesReport(orders) {
        const el = document.getElementById('feesReport');
        if (!el) return;

        // Filtra apenas pedidos ativos (não cancelados)
        const activeOrders = orders.filter(order => order.status !== 'cancelled');

        if (activeOrders.length === 0) {
            el.innerHTML = '<em>Nenhum pedido para análise de taxas.</em>';
            return;
        }

        // Agrupa por método de pagamento
        const feesByMethod = {};
        let totalFees = 0;
        let totalRevenue = 0;

        activeOrders.forEach(order => {
            const platform = order.platform || 'vendas';
            const paymentMethod = order.payment_method || 'dinheiro';
            const orderTotal = order.total || 0;
            const fee = this.calculatePaymentFee(orderTotal, paymentMethod, platform);

            totalRevenue += orderTotal;
            totalFees += fee;

            let key = paymentMethod;
            if (platform === 'ifood') {
                key = 'ifood';
            }

            if (!feesByMethod[key]) {
                feesByMethod[key] = {
                    count: 0,
                    totalValue: 0,
                    totalFees: 0,
                    percentage: 0
                };
            }

            feesByMethod[key].count++;
            feesByMethod[key].totalValue += orderTotal;
            feesByMethod[key].totalFees += fee;
        });

        // Calcula percentuais
        Object.keys(feesByMethod).forEach(key => {
            const method = feesByMethod[key];
            if (key === 'ifood') {
                method.percentage = this.paymentFees.ifoodFee + this.paymentFees.ifoodInvestment;
            } else {
                method.percentage = this.getPaymentFeePercentage(key);
            }
        });

        const sortedMethods = Object.entries(feesByMethod)
            .sort((a, b) => b[1].totalFees - a[1].totalFees);

        el.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 1rem; color: #374151;">Resumo de Taxas</h4>
                <div class="financial-summary-item">
                    <span class="financial-summary-label">Receita Total:</span>
                    <span class="financial-summary-value positive">${this.formatCurrency(totalRevenue)}</span>
                </div>
                <div class="financial-summary-item">
                    <span class="financial-summary-label">Total de Taxas:</span>
                    <span class="financial-summary-value negative">${this.formatCurrency(totalFees)}</span>
                </div>
                <div class="financial-summary-item">
                    <span class="financial-summary-label">% de Taxas sobre Receita:</span>
                    <span class="financial-summary-value negative">${((totalFees / totalRevenue) * 100).toFixed(2)}%</span>
                </div>
            </div>

            <h4 style="margin-bottom: 1rem; color: #374151;">Detalhamento por Método</h4>
            <table style="width:100%; font-size: 0.96em; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f0fdf4">
                        <th style="padding:0.6em 0.4em; text-align:left;">Método</th>
                        <th style="padding:0.6em 0.4em; text-align:center;">Taxa %</th>
                        <th style="padding:0.6em 0.4em; text-align:center;">Pedidos</th>
                        <th style="padding:0.6em 0.4em; text-align:right;">Valor Vendido</th>
                        <th style="padding:0.6em 0.4em; text-align:right;">Total Taxas</th>
                        <th style="padding:0.6em 0.4em; text-align:right;">Valor Líquido</th>
                    </tr>
                </thead>
                <tbody>
                ${sortedMethods.map(([method, data]) => {
                    const methodName = this.getPaymentMethodText(method, method === 'ifood' ? 'ifood' : 'vendas');
                    const liquidValue = data.totalValue - data.totalFees;
                    return `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:0.45em 0.3em;">${methodName}</td>
                        <td style="padding:0.45em 0.3em; text-align:center;">${data.percentage.toFixed(2)}%</td>
                        <td style="padding:0.45em 0.3em; text-align:center;">${data.count}</td>
                        <td style="padding:0.45em 0.3em; text-align:right;">${this.formatCurrency(data.totalValue)}</td>
                        <td style="padding:0.45em 0.3em; text-align:right; color:#dc2626;">${this.formatCurrency(data.totalFees)}</td>
                        <td style="padding:0.45em 0.3em; text-align:right; color:#059669;">${this.formatCurrency(liquidValue)}</td>
                    </tr>
                    `;
                }).join('')}
                </tbody>
            </table>
        `;
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount);
    }

    showNotification(message, type = 'info') {
        // Enhanced notification with better positioning and animation
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 1002;
            max-width: 300px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease;
        `;
        
        // Set background color based on type
        const colors = {
            'success': 'linear-gradient(135deg, #059669, #047857)',
            'error': 'linear-gradient(135deg, #dc2626, #b91c1c)',
            'warning': 'linear-gradient(135deg, #d97706, #b45309)',
            'info': 'linear-gradient(135deg, #3b82f6, #2563eb)'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        
        // Reset editing mode for modals
        if (modalId === 'menuModal') {
            delete document.getElementById('menuForm').dataset.editingId;
            document.querySelector('#menuModal .modal-header h3').textContent = 'Adicionar Item ao Menu';
            document.getElementById('menuIngredients').innerHTML = '';
        }
        
        if (modalId === 'inventoryModal') {
            delete document.getElementById('inventoryForm').dataset.editingId;
            document.querySelector('#inventoryModal .modal-header h3').textContent = 'Adicionar Item ao Estoque';
        }
        
        // Set default date for expense modal
        if (modalId === 'expenseModal') {
            document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        }

        // Setup payment methods for order modal
        if (modalId === 'orderModal') {
            this.updatePaymentMethods();
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        
        // Reset forms
        const form = document.querySelector(`#${modalId} form`);
        if (form) {
            form.reset();
            delete form.dataset.editingId;
            delete form.dataset.orderId;
        }
        
        // Reset menu modal specific elements
        if (modalId === 'menuModal') {
            document.getElementById('menuIngredients').innerHTML = '';
            document.getElementById('menuCostPrice').value = 0;
            delete document.getElementById('menuForm').dataset.editingId;
            document.querySelector('#menuModal .modal-header h3').textContent = 'Adicionar Item ao Menu';
            // Hide duplicate btn if exists
            let btnGroup = document.querySelector('#menuModal .form-actions .duplicate-btn');
            if(btnGroup) btnGroup.style.display = 'none';
        }
        
        // Reset inventory modal specific elements  
        if (modalId === 'inventoryModal') {
            delete document.getElementById('inventoryForm').dataset.editingId;
            document.querySelector('#inventoryModal .modal-header h3').textContent = 'Adicionar Item ao Estoque';
            let dupBtn = document.querySelector('#inventoryModal .form-actions .duplicate-btn');
            if(dupBtn) dupBtn.style.display = 'none';
        }
        
        // Reset order items if closing order modal
        if (modalId === 'orderModal') {
            document.getElementById('orderItems').innerHTML = '';
            this.orderItems = [];
            this.orderSubtotal = 0;
            this.orderFee = 0;
            this.orderTotal = 0;
        }
        
        // Reset purchase items if closing purchase modal
        if (modalId === 'purchaseModal') {
            document.getElementById('purchaseItems').innerHTML = '';
            this.purchaseItems = [];
            this.purchaseTotal = 0;
        }
        
        // Reset cancel order modal
        if (modalId === 'cancelOrderModal') {
            document.getElementById('cancelOrderInfo').innerHTML = '';
            delete document.getElementById('cancelOrderForm').dataset.orderId;
        }
    }

    updatePaymentMethods() {
        const platform = document.getElementById('orderPlatform').value;
        const paymentGroup = document.getElementById('paymentMethodGroup');
        const paymentSelect = document.getElementById('orderPaymentMethod');
        
        if (platform === 'ifood') {
            paymentGroup.style.display = 'none';
            paymentSelect.value = 'ifood';
        } else {
            paymentGroup.style.display = 'block';
            paymentSelect.innerHTML = `
                <option value="">Selecione a forma de pagamento</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="credito">Cartão de Crédito</option>
                <option value="debito">Cartão de Débito</option>
                <option value="pix">PIX</option>
            `;
        }
        this.updateOrderTotal();
    }

    calculatePaymentFee(subtotal, paymentMethod, platform) {
        if (paymentMethod === 'dinheiro') return 0;
        
        let fee = 0;
        if (platform === 'ifood') {
            // Ifood has both platform fee and investment fee
            fee = (subtotal * this.paymentFees.ifoodFee / 100) + (subtotal * this.paymentFees.ifoodInvestment / 100);
        } else {
            switch (paymentMethod) {
                case 'credito':
                    fee = subtotal * this.paymentFees.creditCardFee / 100;
                    break;
                case 'debito':
                    fee = subtotal * this.paymentFees.debitCardFee / 100;
                    break;
                case 'pix':
                    fee = subtotal * this.paymentFees.pixFee / 100;
                    break;
            }
        }
        return fee;
    }

    // Auto-sync setup
    setupAutoSync() {
        const autoSync = document.getElementById('autoSync').checked;
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        if (autoSync) {
            this.syncInterval = setInterval(() => {
                window.db.syncDatabases();
            }, 30000); // Sync every 30 seconds
        }
    }

    // Refresh current section and update sync report
    refreshCurrentSection() {
        this.showSection(this.currentSection);
        this.updateSyncReport();
    }
}

// Global functions for HTML onclick handlers
function openMenuModal() {
    window.app.openModal('menuModal');
}

function openOrderModal() {
    window.app.openModal('orderModal');
}

function openInventoryModal() {
    window.app.openModal('inventoryModal');
}

function openPurchaseModal() {
    window.app.openModal('purchaseModal');
}

function openExpenseModal() {
    window.app.openModal('expenseModal');
}

function openCancelOrderModal() {
    window.app.openModal('cancelOrderModal');
}

function closeModal(modalId) {
    window.app.closeModal(modalId);
}

function addOrderItem() {
    window.app.addOrderItem();
}

function addPurchaseItem() {
    window.app.addPurchaseItem();
}

function syncDatabases() {
    window.db.syncDatabases();
}

function exportData() {
    window.db.exportData();
}

function importData() {
    window.db.importData();
}

function toggleSyncReport() {
    const modal = document.getElementById('syncReportModal');
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
    } else {
        modal.classList.add('active');
        if (window.app) {
            window.app.updateSyncReport();
        }
    }
}

// Close sync report when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('syncReportModal');
    const indicator = document.getElementById('sync-indicator');
    
    if (modal && modal.classList.contains('active') && 
        !modal.contains(e.target) && 
        !indicator.contains(e.target)) {
        modal.classList.remove('active');
    }
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RestaurantApp();
});