// Restaurant Management System - Main Application
class RestaurantApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.charts = {};
        this.orderTotal = 0;
        this.orderItems = [];
        this.purchaseTotal = 0;
        this.purchaseItems = [];
        
        this.init();
    }

    async init() {
        await this.waitForDB();
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
    }

    // Enhanced sync status management
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

    // Update sync report data
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
            'deduction': 'fa-minus'
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
            'stock_movement': 'movimentação de estoque'
        };
        
        const tableName = tableNames[activity.table] || activity.table;
        const operations = {
            'create': 'Criado',
            'update': 'Atualizado',
            'delete': 'Excluído',
            'complete': 'Finalizado',
            'deduction': 'Baixa no estoque'
        };
        
        const operationName = operations[activity.operation] || activity.operation;
        
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

            // Calculate today's metrics
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
            
            const todayOrders = orders.filter(order => 
                new Date(order.created_at || order.date).toDateString() === today
            );
            const yesterdayOrders = orders.filter(order => 
                new Date(order.created_at || order.date).toDateString() === yesterday
            );

            const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            
            // Calculate profit (sales - costs)
            const todayCosts = this.calculateOrdersCosts(todayOrders, menu);
            const yesterdayCosts = this.calculateOrdersCosts(yesterdayOrders, menu);
            const todayProfit = todaySales - todayCosts;
            const yesterdayProfit = yesterdaySales - yesterdayCosts;

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

        // Prepare data for the last 7 days
        const last7Days = [];
        const salesData = [];
        const profitData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            
            last7Days.push(date.toLocaleDateString('pt-BR', { weekday: 'short' }));
            
            const dayOrders = orders.filter(order => 
                new Date(order.created_at || order.date).toDateString() === dateString
            );
            
            const dayTotal = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const dayCosts = this.calculateOrdersCosts(dayOrders, menu);
            
            salesData.push(dayTotal);
            profitData.push(dayTotal - dayCosts);
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

        // Calculate this month's data
        const thisMonth = new Date();
        const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
        
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.created_at || order.date);
            return orderDate >= startOfMonth;
        });

        const monthlyExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startOfMonth;
        });

        const revenue = monthlyOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const costs = this.calculateOrdersCosts(monthlyOrders, menu);
        const expensesTotal = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const profit = revenue - costs - expensesTotal;

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
            'entradas': 'Dogao do Canela Fina',
            'pratos': 'Burger e Otakus', 
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
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Check if we're editing or creating
            const editingId = document.getElementById('menuForm').dataset.editingId;
            let menuId;
            
            if (editingId) {
                // Update existing menu item
                formData.updated_at = new Date().toISOString();
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
            
            // Populate form with existing data
            document.getElementById('menuName').value = menuItem.name;
            document.getElementById('menuCategory').value = menuItem.category;
            document.getElementById('menuPrice').value = menuItem.price;
            document.getElementById('menuCostPrice').value = menuItem.cost_price || 0;
            document.getElementById('menuDescription').value = menuItem.description || '';
            
            // Set editing mode
            document.getElementById('menuForm').dataset.editingId = id;
            document.querySelector('#menuModal .modal-header h3').textContent = 'Editar Item do Menu';
            
            // Load existing ingredients
            await this.loadMenuIngredientsForEdit(id);
            
            this.openModal('menuModal');
        } catch (error) {
            console.error('Error loading menu item for edit:', error);
            this.showNotification('Erro ao carregar item para edição', 'error');
        }
    }

    async loadMenuIngredientsForEdit(menuId) {
        const menuIngredients = await window.db.read('menu_ingredients', { menu_id: menuId });
        const inventory = await window.db.read('inventory');
        const container = document.getElementById('menuIngredients');
        
        // Clear existing ingredients
        container.innerHTML = '';
        
        // Add existing ingredients
        for (const ingredient of menuIngredients) {
            const ingredientDiv = document.createElement('div');
            ingredientDiv.className = 'menu-ingredient-row';
            ingredientDiv.innerHTML = `
                <select class="ingredient-select" required onchange="app.calculateMenuCostFromIngredients()">
                    <option value="">Selecione um ingrediente</option>
                    ${inventory.map(item => `
                        <option value="${item.id}" ${item.id === ingredient.inventory_id ? 'selected' : ''} data-cost="${item.cost_price || 0}">
                            ${item.name} (${item.unit}) - Estoque: ${item.quantity} - Custo: ${this.formatCurrency(item.cost_price || 0)}
                        </option>
                    `).join('')}
                </select>
                <input type="number" class="ingredient-quantity" min="0.01" step="0.01" 
                       value="${ingredient.quantity_needed}" placeholder="Quantidade necessária" required onchange="app.calculateMenuCostFromIngredients()">
                <button type="button" class="btn btn-small btn-danger" onclick="app.removeMenuIngredient(this)">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            container.appendChild(ingredientDiv);
        }
        
        // Calculate initial cost
        await this.calculateMenuCostFromIngredients();
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

        container.innerHTML = orders.map(order => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            const itemsText = items.map(item => `${item.quantity}x ${item.name}`).join(', ');
            
            return `
                <div class="order-item">
                    <div class="order-info">
                        <h4>Pedido #${order.id}</h4>
                        <div class="order-details">
                            <p><strong>Cliente:</strong> ${order.customer}</p>
                            <p><strong>Mesa:</strong> ${order.table_number || 'N/A'}</p>
                            <p><strong>Itens:</strong> ${itemsText}</p>
                            <p><strong>Total:</strong> ${this.formatCurrency(order.total)}</p>
                        </div>
                    </div>
                    <div class="order-actions">
                        <span class="order-status ${order.status}">${this.getStatusText(order.status)}</span>
                        <button class="btn btn-small btn-primary" onclick="app.updateOrderStatus(${order.id}, '${this.getNextStatus(order.status)}')">
                            ${this.getNextStatusText(order.status)}
                        </button>
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

    async handleOrderSubmit() {
        try {
            const formData = {
                customer: document.getElementById('orderCustomer').value,
                table_number: parseInt(document.getElementById('orderTable').value) || null,
                items: JSON.stringify(this.orderItems),
                total: this.orderTotal,
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
            
            this.showNotification(message, 'success');
            
            // Reset order form
            this.orderItems = [];
            this.orderTotal = 0;
        } catch (error) {
            console.error('Error creating order:', error);
            this.showNotification('Erro ao criar pedido', 'error');
        }
    }

    async addOrderItem() {
        const menu = await window.db.read('menu');
        const container = document.getElementById('orderItems');
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item-row';
        itemDiv.innerHTML = `
            <select class="order-item-select" onchange="app.updateOrderTotal()">
                <option value="">Selecione um item</option>
                ${menu.map(item => `<option value="${item.id}" data-price="${item.price}">${item.name} - ${this.formatCurrency(item.price)}</option>`).join('')}
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
        this.orderTotal = 0;
        
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
                
                this.orderTotal += price * quantity;
            }
        });
        
        document.getElementById('orderTotal').textContent = this.formatCurrency(this.orderTotal);
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
            'delivered': 'Entregue'
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
                            <button class="btn btn-small btn-secondary" onclick="app.editInventoryItem(${item.id})" title="Editar Item">
                                <i class="fas fa-edit"></i>
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
            
            // Populate form with existing data
            document.getElementById('inventoryName').value = inventoryItem.name;
            document.getElementById('inventoryQuantity').value = inventoryItem.quantity;
            document.getElementById('inventoryUnit').value = inventoryItem.unit;
            document.getElementById('inventoryMinStock').value = inventoryItem.min_stock;
            document.getElementById('inventoryCostPrice').value = inventoryItem.cost_price || 0;
            document.getElementById('inventorySupplier').value = inventoryItem.supplier || '';
            
            // Set editing mode
            document.getElementById('inventoryForm').dataset.editingId = id;
            document.querySelector('#inventoryModal .modal-header h3').textContent = 'Editar Item do Estoque';
            
            this.openModal('inventoryModal');
        } catch (error) {
            console.error('Error loading inventory item for edit:', error);
            this.showNotification('Erro ao carregar item para edição', 'error');
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
                    const inventoryItems = await window.db.read('inventory', { id: parseInt(item.id) });
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
                        await window.db.update('inventory', parseInt(item.id), { 
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
        // Calculate this month's data
        const thisMonth = new Date();
        const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
        
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.created_at || order.date);
            return orderDate >= startOfMonth;
        });

        const monthlyExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startOfMonth;
        });

        const revenue = monthlyOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const costs = this.calculateOrdersCosts(monthlyOrders, menu);
        const expensesTotal = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const profit = revenue - costs - expensesTotal;

        // Update elements
        document.getElementById('monthlyRevenue').textContent = this.formatCurrency(revenue);
        document.getElementById('monthlyCosts').textContent = this.formatCurrency(costs);
        document.getElementById('monthlyExpenses').textContent = this.formatCurrency(expensesTotal);
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

        // Prepare data for the last 6 months
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
                return orderDate >= monthStart && orderDate <= monthEnd;
            });
            
            const monthExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate >= monthStart && expenseDate <= monthEnd;
            });
            
            const revenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const costs = this.calculateOrdersCosts(monthOrders, menu);
            const expensesTotal = monthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
            const totalExpenses = costs + expensesTotal;
            
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
                type: 'bar',
                data: {
                    labels: last6Months,
                    datasets: [{
                        label: 'Receita',
                        data: revenueData,
                        backgroundColor: '#059669',
                        borderColor: '#059669',
                        borderWidth: 1
                    }, {
                        label: 'Despesas',
                        data: expenseData,
                        backgroundColor: '#dc2626',
                        borderColor: '#dc2626',
                        borderWidth: 1
                    }, {
                        label: 'Lucro',
                        data: profitData,
                        backgroundColor: '#0891b2',
                        borderColor: '#0891b2',
                        borderWidth: 1,
                        type: 'line'
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
            const orders = await window.db.read('orders');
            const menu = await window.db.read('menu');
            
            this.loadCategoryChart(orders, menu);
            this.loadTrendChart(orders);
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async loadCategoryChart(orders, menu) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        // Calculate sales by category
        const categoryData = {};
        
        orders.forEach(order => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            items.forEach(item => {
                const menuItem = menu.find(m => m.id == item.id);
                if (menuItem) {
                    const category = menuItem.category;
                    if (!categoryData[category]) {
                        categoryData[category] = 0;
                    }
                    categoryData[category] += (item.price || 0) * (item.quantity || 1);
                }
            });
        });

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        // Destroy existing chart if it exists
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        // Create new chart with fixed import
        try {
            const ChartModule = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm');
            const Chart = ChartModule.default;
            
            this.charts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#059669',
                            '#0891b2',
                            '#7c3aed',
                            '#dc2626',
                            '#ea580c'
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
        } catch (error) {
            console.error('Error loading category chart:', error);
        }
    }

    async loadTrendChart(orders) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        // Calculate monthly trends
        const monthlyData = {};
        
        orders.forEach(order => {
            const date = new Date(order.created_at || order.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = 0;
            }
            monthlyData[monthKey] += order.total || 0;
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            return new Date(year, monthNum - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        });
        const data = sortedMonths.map(month => monthlyData[month]);

        // Destroy existing chart if it exists
        if (this.charts.trend) {
            this.charts.trend.destroy();
        }

        // Create new chart with fixed import
        try {
            const ChartModule = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm');
            const Chart = ChartModule.default;
            
            this.charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Vendas Mensais (R$)',
                        data: data,
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
                        tension: 0.4,
                        fill: true
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
                    }
                }
            });
        } catch (error) {
            console.error('Error loading trend chart:', error);
        }
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

    // Modal management
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
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        
        // Reset forms
        const form = document.querySelector(`#${modalId} form`);
        if (form) {
            form.reset();
            delete form.dataset.editingId;
        }
        
        // Reset menu modal specific elements
        if (modalId === 'menuModal') {
            document.getElementById('menuIngredients').innerHTML = '';
            document.getElementById('menuCostPrice').value = 0;
            delete document.getElementById('menuForm').dataset.editingId;
            document.querySelector('#menuModal .modal-header h3').textContent = 'Adicionar Item ao Menu';
        }
        
        // Reset inventory modal specific elements  
        if (modalId === 'inventoryModal') {
            delete document.getElementById('inventoryForm').dataset.editingId;
            document.querySelector('#inventoryModal .modal-header h3').textContent = 'Adicionar Item ao Estoque';
        }
        
        // Reset order items if closing order modal
        if (modalId === 'orderModal') {
            document.getElementById('orderItems').innerHTML = '';
            this.orderItems = [];
            this.orderTotal = 0;
        }
        
        // Reset purchase items if closing purchase modal
        if (modalId === 'purchaseModal') {
            document.getElementById('purchaseItems').innerHTML = '';
            this.purchaseItems = [];
            this.purchaseTotal = 0;
        }
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
