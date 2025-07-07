class WhatsAppIntegration {
    constructor() {
        this.apiEndpoint = 'https://api.whatsapp.com/send';
        this.businessApiEndpoint = 'https://graph.facebook.com/v18.0/';
        this.accessToken = null;
        this.phoneNumberId = null;
        this.isEnabled = false;
        this.rateLimitDelay = 1000; // 1 second between messages
        this.lastMessageTime = 0;
    }

    async initialize(accessToken, phoneNumberId) {
        try {
            if (accessToken && typeof accessToken === 'string') {
                this.accessToken = accessToken;
            }
            if (phoneNumberId && typeof phoneNumberId === 'string') {
                this.phoneNumberId = phoneNumberId;
            }
            this.isEnabled = true;
            console.log('WhatsApp Integration inicializada');
        } catch (error) {
            console.error('Erro ao inicializar WhatsApp Integration:', error);
            throw error;
        }
    }

    async sendReminder(bill, phoneNumber) {
        if (!this.isEnabled || !phoneNumber) {
            console.log('WhatsApp não configurado ou número não fornecido');
            return false;
        }

        if (!bill || typeof bill !== 'object') {
            console.error('Dados do boleto inválidos');
            return false;
        }

        try {
            // Rate limiting
            const now = Date.now();
            if (now - this.lastMessageTime < this.rateLimitDelay) {
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
            }
            this.lastMessageTime = Date.now();

            const message = this.formatReminderMessage(bill);
            
            if (this.accessToken && this.phoneNumberId) {
                // Business API (requires setup)
                return await this.sendBusinessMessage(phoneNumber, message);
            } else {
                // Fallback to web WhatsApp
                return this.openWhatsAppWeb(phoneNumber, message);
            }
        } catch (error) {
            console.error('Erro ao enviar lembrete WhatsApp:', error);
            return false;
        }
    }

    formatReminderMessage(bill) {
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
            if (daysDiff <= 0) {
                urgencyText = '🚨 *VENCIDO*';
            } else if (daysDiff <= 1) {
                urgencyText = '⚠️ *VENCE HOJE*';
            } else if (daysDiff <= 3) {
                urgencyText = '⏰ *VENCE EM BREVE*';
            }

            const billName = this.sanitizeText(bill.name || 'Boleto');
            const categoryText = this.getCategoryText(bill.category || 'other');

            return `
${urgencyText}

💰 *Lembrete de Pagamento - FinanceAI*

📋 *Boleto:* ${billName}
💵 *Valor:* R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📅 *Vencimento:* ${dueDate.toLocaleDateString('pt-BR')}
🏷️ *Categoria:* ${this.getCategoryEmoji(bill.category)} ${categoryText}

${bill.barcode ? `📊 *Código de Barras:* ${this.sanitizeText(bill.barcode)}` : ''}

${daysDiff > 0 ? `⏳ Vence em ${daysDiff} dias` : `⚠️ Vencido há ${Math.abs(daysDiff)} dias`}

_Enviado automaticamente pelo FinanceAI_
            `.trim();
        } catch (error) {
            console.error('Erro ao formatar mensagem:', error);
            return 'Erro ao gerar mensagem de lembrete';
        }
    }

    sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[*_~`]/g, '\\$&'); // Escape WhatsApp formatting characters
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

    async sendBusinessMessage(phoneNumber, message) {
        try {
            if (!phoneNumber || !message) {
                throw new Error('Número de telefone ou mensagem não fornecidos');
            }

            // WhatsApp Business API implementation
            const cleanNumber = phoneNumber.replace(/\D/g, '');
            
            if (cleanNumber.length < 10) {
                throw new Error('Número de telefone inválido');
            }

            const payload = {
                messaging_product: 'whatsapp',
                to: cleanNumber,
                type: 'text',
                text: {
                    body: message
                }
            };

            const response = await fetch(`${this.businessApiEndpoint}${this.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
                console.log('Mensagem WhatsApp enviada com sucesso');
                return true;
            } else {
                const errorText = await response.text();
                console.error('Erro ao enviar mensagem WhatsApp:', errorText);
                return false;
            }
        } catch (error) {
            console.error('Erro na API WhatsApp:', error);
            return false;
        }
    }

    openWhatsAppWeb(phoneNumber, message) {
        try {
            if (!phoneNumber || !message) {
                throw new Error('Número de telefone ou mensagem não fornecidos');
            }

            // Fallback to WhatsApp Web
            const cleanNumber = phoneNumber.replace(/\D/g, '');
            if (cleanNumber.length < 10) {
                throw new Error('Número de telefone inválido');
            }

            const encodedMessage = encodeURIComponent(message);
            const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
            
            window.open(url, '_blank');
            return true;
        } catch (error) {
            console.error('Erro ao abrir WhatsApp Web:', error);
            return false;
        }
    }

    async sendBulkReminders(bills, phoneNumber) {
        if (!this.isEnabled || !phoneNumber) {
            return false;
        }

        if (!Array.isArray(bills)) {
            console.error('Lista de boletos inválida');
            return false;
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
                return false;
            }

            const message = this.formatBulkMessage(upcomingBills, overdueBills);
            
            if (this.accessToken && this.phoneNumberId) {
                return await this.sendBusinessMessage(phoneNumber, message);
            } else {
                return this.openWhatsAppWeb(phoneNumber, message);
            }
        } catch (error) {
            console.error('Erro ao enviar lembretes em lote:', error);
            return false;
        }
    }

    formatBulkMessage(upcomingBills, overdueBills) {
        try {
            let message = '💰 *Resumo Financeiro - FinanceAI*\n\n';

            if (Array.isArray(overdueBills) && overdueBills.length > 0) {
                message += '🚨 *BOLETOS VENCIDOS*\n';
                overdueBills.forEach(bill => {
                    if (bill && bill.name && typeof bill.amount === 'number' && bill.dueDate) {
                        const dueDate = new Date(bill.dueDate);
                        if (!isNaN(dueDate.getTime())) {
                            const daysDiff = Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24));
                            message += `• ${this.sanitizeText(bill.name)} - R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${daysDiff} dias)\n`;
                        }
                    }
                });
                message += '\n';
            }

            if (Array.isArray(upcomingBills) && upcomingBills.length > 0) {
                message += '⏰ *VENCIMENTOS PRÓXIMOS*\n';
                upcomingBills.forEach(bill => {
                    if (bill && bill.name && typeof bill.amount === 'number' && bill.dueDate) {
                        const dueDate = new Date(bill.dueDate);
                        if (!isNaN(dueDate.getTime())) {
                            const daysDiff = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                            message += `• ${this.sanitizeText(bill.name)} - R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${daysDiff} dias)\n`;
                        }
                    }
                });
            }

            const validBills = [...(upcomingBills || []), ...(overdueBills || [])].filter(bill => 
                bill && typeof bill.amount === 'number'
            );
            const totalAmount = validBills.reduce((sum, bill) => sum + bill.amount, 0);
            
            message += `\n💵 *Total:* R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            message += '\n\n_Enviado automaticamente pelo FinanceAI_';

            return message;
        } catch (error) {
            console.error('Erro ao formatar mensagem em lote:', error);
            return 'Erro ao gerar resumo financeiro';
        }
    }

    async sendPaymentConfirmation(bill, phoneNumber) {
        if (!this.isEnabled || !phoneNumber) {
            return false;
        }

        const message = `
✅ *Pagamento Confirmado - FinanceAI*

📋 *Boleto:* ${bill.name}
💵 *Valor:* R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📅 *Vencimento:* ${new Date(bill.dueDate).toLocaleDateString('pt-BR')}
✅ *Status:* Pago

Pagamento registrado com sucesso!

_Enviado automaticamente pelo FinanceAI_
        `.trim();

        if (this.accessToken && this.phoneNumberId) {
            return await this.sendBusinessMessage(phoneNumber, message);
        } else {
            return this.openWhatsAppWeb(phoneNumber, message);
        }
    }

    async sendMonthlyReport(bills, invoices, phoneNumber) {
        if (!this.isEnabled || !phoneNumber) {
            return false;
        }

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

        const totalBills = monthlyBills.reduce((sum, bill) => sum + bill.amount, 0);
        const totalInvoices = monthlyInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
        const paidBills = monthlyBills.filter(bill => bill.status === 'paid');
        const pendingBills = monthlyBills.filter(bill => bill.status === 'pending');

        const message = `
📊 *Relatório Mensal - FinanceAI*

📅 *Período:* ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}

💰 *RESUMO FINANCEIRO*
• Boletos: ${monthlyBills.length} (R$ ${totalBills.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
• Notas Fiscais: ${monthlyInvoices.length} (R$ ${totalInvoices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})

✅ *Pagos:* ${paidBills.length} boletos
⏳ *Pendentes:* ${pendingBills.length} boletos

💵 *Total Geral:* R$ ${(totalBills + totalInvoices).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

_Relatório gerado automaticamente pelo FinanceAI_
        `.trim();

        if (this.accessToken && this.phoneNumberId) {
            return await this.sendBusinessMessage(phoneNumber, message);
        } else {
            return this.openWhatsAppWeb(phoneNumber, message);
        }
    }

    // Webhook handling for WhatsApp Business API
    handleWebhook(req, res) {
        try {
            if (!req || !req.body || !res) {
                throw new Error('Request ou response inválidos');
            }

            const body = req.body;

            if (body.object === 'whatsapp_business_account') {
                if (Array.isArray(body.entry)) {
                    body.entry.forEach(entry => {
                        if (Array.isArray(entry.changes)) {
                            entry.changes.forEach(change => {
                                if (change.field === 'messages') {
                                    const messages = change.value.messages;
                                    if (Array.isArray(messages)) {
                                        messages.forEach(message => {
                                            this.processIncomingMessage(message);
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
                res.status(200).send('OK');
            } else {
                res.status(404).send('Not Found');
            }
        } catch (error) {
            console.error('Erro no webhook:', error);
            if (res) {
                res.status(500).send('Internal Server Error');
            }
        }
    }

    processIncomingMessage(message) {
        try {
            if (!message || !message.type) {
                return;
            }

            // Process incoming WhatsApp messages
            // Could be used for interactive features like payment confirmations
            console.log('Mensagem recebida:', message);
            
            if (message.type === 'text' && message.text && message.text.body) {
                const text = message.text.body.toLowerCase();
                
                if (text.includes('pago') || text.includes('confirmado')) {
                    // Handle payment confirmation
                    this.handlePaymentConfirmation(message);
                } else if (text.includes('relatório') || text.includes('resumo')) {
                    // Send financial summary
                    if (message.from) {
                        this.sendQuickSummary(message.from);
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao processar mensagem recebida:', error);
        }
    }

    async handlePaymentConfirmation(message) {
        try {
            // Implementation for handling payment confirmations via WhatsApp
            console.log('Confirmação de pagamento via WhatsApp');
        } catch (error) {
            console.error('Erro ao processar confirmação de pagamento:', error);
        }
    }

    async sendQuickSummary(phoneNumber) {
        try {
            if (!phoneNumber) {
                throw new Error('Número de telefone não fornecido');
            }

            // Send a quick financial summary
            const message = `
📊 *Resumo Rápido - FinanceAI*

Para ver o relatório completo, acesse o sistema FinanceAI.

_Enviado automaticamente pelo FinanceAI_
            `.trim();

            if (this.accessToken && this.phoneNumberId) {
                return await this.sendBusinessMessage(phoneNumber, message);
            }
        } catch (error) {
            console.error('Erro ao enviar resumo rápido:', error);
            return false;
        }
    }
}