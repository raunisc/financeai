class EmailIntegration {
    constructor() {
        this.serviceId = 'service_financeai';
        this.templateId = 'template_financeai';
        this.publicKey = null; // Will be set by user configuration
        this.isEnabled = false;
        this.rateLimitDelay = 3000; // 3 seconds between emails
        this.lastEmailTime = 0;
        this.maxEmailsPerHour = 20;
        this.emailsSentThisHour = 0;
        this.hourResetTime = Date.now() + 3600000; // 1 hour from now
        this.isConfigured = false;
        this.initialize();
    }

    initialize() {
        try {
            // Check if EmailJS is loaded
            if (typeof emailjs !== 'undefined') {
                console.log('EmailJS library carregada');
                this.isEnabled = true;
                
                // Load saved configuration
                this.loadConfiguration();
            } else {
                console.warn('EmailJS library não encontrada');
                this.isEnabled = false;
            }
        } catch (error) {
            console.error('Erro ao inicializar Email Integration:', error);
            this.isEnabled = false;
        }
    }

    loadConfiguration() {
        try {
            const savedConfig = localStorage.getItem('financeai_email_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                if (config.publicKey && config.serviceId && config.templateId) {
                    this.publicKey = config.publicKey;
                    this.serviceId = config.serviceId;
                    this.templateId = config.templateId;
                    this.isConfigured = true;
                    
                    // Initialize EmailJS with the public key
                    emailjs.init(this.publicKey);
                    console.log('Configuração de email carregada');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar configuração de email:', error);
        }
    }

    saveConfiguration(publicKey, serviceId, templateId) {
        try {
            const config = {
                publicKey,
                serviceId,
                templateId,
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem('financeai_email_config', JSON.stringify(config));
            
            this.publicKey = publicKey;
            this.serviceId = serviceId;
            this.templateId = templateId;
            this.isConfigured = true;
            
            // Initialize EmailJS with the new key
            if (typeof emailjs !== 'undefined') {
                emailjs.init(this.publicKey);
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao salvar configuração de email:', error);
            return false;
        }
    }

    isReady() {
        return this.isEnabled && this.isConfigured && this.publicKey;
    }

    async sendReminder(bill, emailAddress) {
        if (!this.isReady()) {
            throw new Error('Serviço de email não configurado. Configure as credenciais do EmailJS nas configurações.');
        }

        if (!emailAddress || !this.isValidEmail(emailAddress)) {
            throw new Error('Endereço de email inválido');
        }

        if (!bill || typeof bill !== 'object') {
            throw new Error('Dados do boleto inválidos');
        }

        try {
            // Check rate limiting
            if (!this.checkRateLimit()) {
                throw new Error('Limite de emails atingido. Tente novamente em alguns minutos.');
            }

            const emailData = this.formatReminderEmail(bill);
            const templateParams = {
                to_email: emailAddress,
                to_name: 'Usuário FinanceAI',
                subject: emailData.subject,
                message: emailData.message,
                bill_name: bill.name || 'Boleto',
                bill_amount: this.formatCurrency(bill.amount || 0),
                due_date: this.formatDate(bill.dueDate),
                days_until_due: this.getDaysUntilDue(bill.dueDate)
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );

            if (response.status === 200) {
                this.updateRateLimit();
                console.log('Email de lembrete enviado com sucesso');
                return true;
            } else {
                throw new Error('Erro no envio do email: ' + response.text);
            }
        } catch (error) {
            console.error('Erro ao enviar email:', error);
            throw error;
        }
    }

    formatReminderEmail(bill) {
        try {
            if (!bill || !bill.dueDate || typeof bill.amount !== 'number') {
                throw new Error('Dados do boleto inválidos');
            }

            const dueDate = new Date(bill.dueDate);
            if (isNaN(dueDate.getTime())) {
                throw new Error('Data de vencimento inválida');
            }

            const today = new Date();
            const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let urgencyText = '';
            let subject = '';
            
            if (daysDiff <= 0) {
                urgencyText = '🚨 VENCIDO';
                subject = `URGENTE: Boleto vencido - ${bill.name}`;
            } else if (daysDiff <= 1) {
                urgencyText = '⚠️ VENCE HOJE';
                subject = `ATENÇÃO: Boleto vence hoje - ${bill.name}`;
            } else if (daysDiff <= 3) {
                urgencyText = '⏰ VENCE EM BREVE';
                subject = `Lembrete: Boleto vence em ${daysDiff} dias - ${bill.name}`;
            } else {
                urgencyText = '📅 LEMBRETE';
                subject = `Lembrete de pagamento - ${bill.name}`;
            }

            const categoryText = this.getCategoryText(bill.category || 'other');

            const message = `
${urgencyText}

💰 Lembrete de Pagamento - FinanceAI

📋 Boleto: ${bill.name}
💵 Valor: R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📅 Vencimento: ${dueDate.toLocaleDateString('pt-BR')}
🏷️ Categoria: ${this.getCategoryEmoji(bill.category)} ${categoryText}

${bill.barcode ? `📊 Código de Barras: ${bill.barcode}` : ''}

${daysDiff > 0 ? `⏳ Vence em ${daysDiff} dias` : `⚠️ Vencido há ${Math.abs(daysDiff)} dias`}

---
Este email foi enviado automaticamente pelo FinanceAI
Para parar de receber esses lembretes, desative as notificações nas configurações.
            `.trim();

            return { subject, message };
        } catch (error) {
            console.error('Erro ao formatar email:', error);
            return { 
                subject: 'Lembrete de pagamento - FinanceAI',
                message: 'Erro ao gerar mensagem de lembrete'
            };
        }
    }

    getCategoryEmoji(category) {
        const emojiMap = {
            'utilities': '⚡',
            'rent': '🏠',
            'insurance': '🛡️',
            'taxes': '🏛️',
            'supplies': '📦',
            'services': '🔧',
            'equipment': '🖥️',
            'other': '📄'
        };
        return emojiMap[category] || '📄';
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

    async sendBulkReminders(bills, emailAddress) {
        if (!this.isReady()) {
            throw new Error('Serviço de email não configurado. Configure as credenciais do EmailJS nas configurações.');
        }

        if (!emailAddress || !this.isValidEmail(emailAddress)) {
            throw new Error('Endereço de email inválido');
        }

        if (!Array.isArray(bills)) {
            throw new Error('Lista de boletos inválida');
        }

        try {
            const pendingBills = bills.filter(bill => 
                bill && bill.status === 'pending' && bill.dueDate && typeof bill.amount === 'number'
            );
            
            const today = new Date();
            
            const upcomingBills = pendingBills.filter(bill => {
                const dueDate = new Date(bill.dueDate);
                if (isNaN(dueDate.getTime())) return false;
                const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                return daysDiff <= 7 && daysDiff >= 0;
            });

            const overdueBills = pendingBills.filter(bill => {
                const dueDate = new Date(bill.dueDate);
                return !isNaN(dueDate.getTime()) && dueDate < today;
            });

            if (upcomingBills.length === 0 && overdueBills.length === 0) {
                throw new Error('Nenhum boleto pendente ou vencido encontrado');
            }

            if (!this.checkRateLimit()) {
                throw new Error('Limite de emails atingido. Tente novamente em alguns minutos.');
            }

            const emailData = this.formatBulkEmail(upcomingBills, overdueBills);
            const templateParams = {
                to_email: emailAddress,
                to_name: 'Usuário FinanceAI',
                subject: emailData.subject,
                message: emailData.message
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );

            if (response.status === 200) {
                this.updateRateLimit();
                console.log('Email de resumo enviado com sucesso');
                return true;
            } else {
                throw new Error('Erro no envio do resumo: ' + response.text);
            }
        } catch (error) {
            console.error('Erro ao enviar resumo por email:', error);
            throw error;
        }
    }

    formatBulkEmail(upcomingBills, overdueBills) {
        try {
            let subject = '💰 Resumo Financeiro - FinanceAI';
            let message = '💰 Resumo Financeiro - FinanceAI\n\n';

            if (Array.isArray(overdueBills) && overdueBills.length > 0) {
                subject = `🚨 URGENTE: ${overdueBills.length} boletos vencidos - FinanceAI`;
                message += '🚨 BOLETOS VENCIDOS\n';
                overdueBills.forEach(bill => {
                    if (bill && bill.name && typeof bill.amount === 'number' && bill.dueDate) {
                        const dueDate = new Date(bill.dueDate);
                        if (!isNaN(dueDate.getTime())) {
                            const daysDiff = Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24));
                            message += `• ${bill.name} - R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${daysDiff} dias em atraso)\n`;
                        }
                    }
                });
                message += '\n';
            }

            if (Array.isArray(upcomingBills) && upcomingBills.length > 0) {
                message += '⏰ VENCIMENTOS PRÓXIMOS\n';
                upcomingBills.forEach(bill => {
                    if (bill && bill.name && typeof bill.amount === 'number' && bill.dueDate) {
                        const dueDate = new Date(bill.dueDate);
                        if (!isNaN(dueDate.getTime())) {
                            const daysDiff = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                            message += `• ${bill.name} - R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${daysDiff} dias)\n`;
                        }
                    }
                });
            }

            const validBills = [...(upcomingBills || []), ...(overdueBills || [])].filter(bill => 
                bill && typeof bill.amount === 'number'
            );
            const totalAmount = validBills.reduce((sum, bill) => sum + bill.amount, 0);
            
            message += `\n💵 Total: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            message += '\n\n---\nEnviado automaticamente pelo FinanceAI';

            return { subject, message };
        } catch (error) {
            console.error('Erro ao formatar email em lote:', error);
            return {
                subject: 'Erro - Resumo Financeiro',
                message: 'Erro ao gerar resumo financeiro'
            };
        }
    }

    async sendPaymentConfirmation(bill, emailAddress) {
        if (!this.isEnabled || !emailAddress || !this.isValidEmail(emailAddress)) {
            return false;
        }

        if (!bill || typeof bill !== 'object') {
            console.error('Dados do boleto inválidos');
            return false;
        }

        try {
            const templateParams = {
                to_email: emailAddress,
                to_name: 'Usuário FinanceAI',
                subject: `✅ Pagamento Confirmado - ${bill.name}`,
                message: `
✅ Pagamento Confirmado - FinanceAI

📋 Boleto: ${bill.name}
💵 Valor: R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📅 Vencimento: ${new Date(bill.dueDate).toLocaleDateString('pt-BR')}
✅ Status: Pago

Pagamento registrado com sucesso em ${new Date().toLocaleDateString('pt-BR')}!

---
Enviado automaticamente pelo FinanceAI
                `.trim()
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );

            if (response.status === 200) {
                this.updateRateLimit();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao enviar confirmação por email:', error);
            return false;
        }
    }

    async sendMonthlyReport(bills, invoices, revenues, emailAddress) {
        if (!this.isEnabled || !emailAddress || !this.isValidEmail(emailAddress)) {
            return false;
        }

        if (!Array.isArray(bills) || !Array.isArray(invoices) || !Array.isArray(revenues)) {
            console.error('Lista de boletos, notas fiscais ou receitas inválida');
            return false;
        }

        try {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            const monthlyBills = bills.filter(bill => {
                const billDate = new Date(bill.createdAt);
                return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
            });

            const monthlyInvoices = invoices.filter(invoice => {
                const invoiceDate = new Date(invoice.createdAt);
                return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
            });

            const monthlyRevenues = revenues.filter(revenue => {
                const revenueDate = new Date(revenue.date);
                return revenueDate.getMonth() === currentMonth && revenueDate.getFullYear() === currentYear;
            });

            const totalBills = monthlyBills.reduce((sum, bill) => sum + bill.amount, 0);
            const totalInvoices = monthlyInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
            const totalRevenues = monthlyRevenues.reduce((sum, revenue) => sum + revenue.amount, 0);
            const paidBills = monthlyBills.filter(bill => bill.status === 'paid');
            const pendingBills = monthlyBills.filter(bill => bill.status === 'pending');

            const templateParams = {
                to_email: emailAddress,
                to_name: 'Usuário FinanceAI',
                subject: `📊 Relatório Mensal - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
                message: `
📊 Relatório Mensal - FinanceAI

📅 Período: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}

💰 RESUMO FINANCEIRO
• Receitas: ${monthlyRevenues.length} (R$ ${totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
• Boletos: ${monthlyBills.length} (R$ ${totalBills.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
• Notas Fiscais: ${monthlyInvoices.length} (R$ ${totalInvoices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})

✅ Pagos: ${paidBills.length} boletos
⏳ Pendentes: ${pendingBills.length} boletos

💵 Saldo do Mês: R$ ${(totalRevenues - totalBills - totalInvoices).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

---
Relatório gerado automaticamente pelo FinanceAI
                `.trim()
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );

            if (response.status === 200) {
                this.updateRateLimit();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao enviar relatório mensal:', error);
            return false;
        }
    }

    async sendTestEmail(emailAddress) {
        if (!this.isReady()) {
            throw new Error('Serviço de email não configurado. Configure as credenciais do EmailJS nas configurações.');
        }

        if (!emailAddress || !this.isValidEmail(emailAddress)) {
            throw new Error('Endereço de email inválido');
        }

        if (!this.checkRateLimit()) {
            throw new Error('Limite de emails atingido. Tente novamente em alguns minutos.');
        }

        try {
            const templateParams = {
                to_email: emailAddress,
                to_name: 'Usuário FinanceAI',
                subject: '✅ Teste de Email - FinanceAI',
                message: `
✅ Teste de Email - FinanceAI

Parabéns! Seu sistema de notificações por email está funcionando corretamente.

📧 Email de destino: ${emailAddress}
📅 Enviado em: ${new Date().toLocaleString('pt-BR')}

Agora você receberá notificações sobre:
• Boletos próximos do vencimento
• Boletos vencidos
• Confirmações de pagamento
• Relatórios mensais

---
Sistema de notificações ativo - FinanceAI
                `.trim()
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );

            if (response.status === 200) {
                this.updateRateLimit();
                return true;
            } else {
                throw new Error('Falha no envio do email de teste: ' + response.text);
            }
        } catch (error) {
            console.error('Erro ao enviar email de teste:', error);
            throw error;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    checkRateLimit() {
        const now = Date.now();
        
        // Reset counter if hour has passed
        if (now > this.hourResetTime) {
            this.emailsSentThisHour = 0;
            this.hourResetTime = now + 3600000; // Next hour
        }

        // Check if we've exceeded hourly limit
        if (this.emailsSentThisHour >= this.maxEmailsPerHour) {
            return false;
        }

        // Check minimum delay between emails
        if (now - this.lastEmailTime < this.rateLimitDelay) {
            return false;
        }

        return true;
    }

    updateRateLimit() {
        this.lastEmailTime = Date.now();
        this.emailsSentThisHour++;
    }

    formatCurrency(amount) {
        if (typeof amount !== 'number') return 'R$ 0,00';
        return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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

    getDaysUntilDue(dueDate) {
        try {
            if (!dueDate) return 0;
            const due = new Date(dueDate);
            const today = new Date();
            if (isNaN(due.getTime())) return 0;
            return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        } catch (error) {
            return 0;
        }
    }

    getRateLimitStatus() {
        const now = Date.now();
        const timeUntilReset = Math.max(0, this.hourResetTime - now);
        const emailsRemaining = Math.max(0, this.maxEmailsPerHour - this.emailsSentThisHour);
        
        return {
            emailsSent: this.emailsSentThisHour,
            emailsRemaining: emailsRemaining,
            timeUntilReset: Math.ceil(timeUntilReset / 60000), // minutes
            canSendNow: this.checkRateLimit()
        };
    }
}