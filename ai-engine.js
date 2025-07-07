class AIEngine {
    constructor() {
        this.models = {
            textExtraction: 'ocr-model',
            documentClassification: 'classification-model',
            duplicateDetection: 'similarity-model'
        };
        this.isReady = false;
        this.initializationPromise = null;
    }

    async init() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }

    async _initialize() {
        try {
            console.log('Inicializando motores de IA...');
            await this.loadModels();
            this.isReady = true;
            console.log('IA pronta para uso');
        } catch (error) {
            console.error('Erro na inicialização da IA:', error);
            throw error;
        }
    }

    async loadModels() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout no carregamento dos modelos de IA'));
            }, 10000);

            setTimeout(() => {
                clearTimeout(timeout);
                console.log('Modelos de IA carregados');
                resolve();
            }, 1000);
        });
    }

    async extractTextFromImage(imageFile) {
        if (!this.isReady) {
            throw new Error('AI Engine não está pronto');
        }

        if (!imageFile) {
            throw new Error('Arquivo de imagem não fornecido');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout na extração de texto'));
            }, 15000);

            setTimeout(() => {
                clearTimeout(timeout);
                
                try {
                    // Mock OCR results based on file type
                    const mockResults = {
                        'boleto': {
                            bankCode: '001',
                            amount: 450.30,
                            dueDate: '2024-01-15',
                            barcode: '8364000012345678901234567890123456789012',
                            beneficiary: 'Empresa de Energia',
                            description: 'Conta de luz - Janeiro/2024'
                        },
                        'invoice': {
                            number: 'NF-12345',
                            supplier: 'Fornecedor ABC Ltda',
                            amount: 1250.00,
                            date: '2024-01-05',
                            cnpj: '12.345.678/0001-90',
                            items: [
                                { description: 'Produto A', quantity: 10, unitPrice: 125.00 }
                            ]
                        }
                    };

                    // Simulate classification
                    const docType = Math.random() > 0.5 ? 'boleto' : 'invoice';
                    resolve({
                        type: docType,
                        confidence: 0.95,
                        data: mockResults[docType]
                    });
                } catch (error) {
                    reject(error);
                }
            }, 2000);
        });
    }

    async extractTextFromPDF(pdfFile) {
        if (!this.isReady) {
            throw new Error('AI Engine não está pronto');
        }

        if (!pdfFile) {
            throw new Error('Arquivo PDF não fornecido');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout na extração de texto do PDF'));
            }, 10000);

            setTimeout(() => {
                clearTimeout(timeout);
                
                try {
                    const mockPDFData = {
                        type: 'boleto',
                        confidence: 0.98,
                        data: {
                            bankCode: '033',
                            amount: 1250.50,
                            dueDate: '2024-01-20',
                            barcode: '8364000012345678901234567890123456789015',
                            beneficiary: 'Banco Santander',
                            description: 'Financiamento veículo - Parcela 12/48'
                        }
                    };
                    resolve(mockPDFData);
                } catch (error) {
                    reject(error);
                }
            }, 1500);
        });
    }

    async classifyDocument(text) {
        if (!this.isReady) {
            throw new Error('AI Engine não está pronto');
        }

        if (!text || typeof text !== 'string') {
            throw new Error('Texto inválido para classificação');
        }

        try {
            // Simulate document classification
            const keywords = {
                boleto: ['vencimento', 'banco', 'código de barras', 'pagamento'],
                invoice: ['nota fiscal', 'cnpj', 'fornecedor', 'valor total'],
                receipt: ['recibo', 'comprovante', 'pagamento realizado']
            };

            const textLower = text.toLowerCase();
            let maxScore = 0;
            let classification = 'unknown';

            Object.entries(keywords).forEach(([type, words]) => {
                const score = words.reduce((acc, word) => {
                    return acc + (textLower.includes(word) ? 1 : 0);
                }, 0);
                
                if (score > maxScore) {
                    maxScore = score;
                    classification = type;
                }
            });

            return {
                type: classification,
                confidence: maxScore / (keywords[classification]?.length || 1),
                keywords: keywords[classification] || []
            };
        } catch (error) {
            console.error('Erro na classificação de documento:', error);
            throw error;
        }
    }

    async detectDuplicates(newDocument, existingDocuments) {
        if (!this.isReady) {
            throw new Error('AI Engine não está pronto');
        }

        if (!newDocument) {
            throw new Error('Documento para verificação não fornecido');
        }

        if (!Array.isArray(existingDocuments)) {
            existingDocuments = [];
        }

        try {
            // Simulate duplicate detection
            const duplicates = existingDocuments.filter(doc => {
                if (!doc || typeof doc.amount !== 'number') return false;

                // Check for similar amounts and dates
                const amountDiff = Math.abs(doc.amount - (newDocument.amount || 0));
                
                const newDate = new Date(newDocument.dueDate || newDocument.date);
                const docDate = new Date(doc.dueDate || doc.date);
                
                if (isNaN(newDate.getTime()) || isNaN(docDate.getTime())) return false;
                
                const dateDiff = Math.abs(newDate - docDate);
                
                return amountDiff < 1 && dateDiff < 24 * 60 * 60 * 1000; // Less than 1 real and same day
            });

            return {
                isDuplicate: duplicates.length > 0,
                duplicates: duplicates,
                confidence: duplicates.length > 0 ? 0.95 : 0.05
            };
        } catch (error) {
            console.error('Erro na detecção de duplicatas:', error);
            throw error;
        }
    }

    async smartCategorization(documentData) {
        if (!this.isReady) {
            throw new Error('AI Engine não está pronto');
        }

        if (!documentData) {
            throw new Error('Dados do documento não fornecidos');
        }

        try {
            // Simulate smart categorization based on document content
            const categoryRules = {
                'utilities': ['energia', 'água', 'luz', 'gas', 'telefone', 'internet'],
                'rent': ['aluguel', 'locação', 'imóvel'],
                'insurance': ['seguro', 'seguros', 'proteção'],
                'taxes': ['imposto', 'taxa', 'tributo', 'iptu', 'ipva'],
                'supplies': ['suprimentos', 'materiais', 'insumos'],
                'services': ['serviços', 'consultoria', 'manutenção'],
                'equipment': ['equipamentos', 'máquinas', 'ferramentas']
            };

            const description = (documentData.description || documentData.beneficiary || documentData.supplier || '').toLowerCase();
            
            for (const [category, keywords] of Object.entries(categoryRules)) {
                const matchedKeywords = keywords.filter(keyword => description.includes(keyword));
                if (matchedKeywords.length > 0) {
                    return {
                        category: category,
                        confidence: 0.9,
                        reason: `Detectado palavras-chave: ${matchedKeywords.join(', ')}`
                    };
                }
            }

            return {
                category: 'other',
                confidence: 0.5,
                reason: 'Não foi possível categorizar automaticamente'
            };
        } catch (error) {
            console.error('Erro na categorização inteligente:', error);
            throw error;
        }
    }

    async analyzeSpendingPatterns(bills, invoices) {
        if (!this.isReady) {
            throw new Error('AI Engine não está pronto');
        }

        if (!Array.isArray(bills)) bills = [];
        if (!Array.isArray(invoices)) invoices = [];

        try {
            // Simulate spending pattern analysis
            const allDocuments = [...bills, ...invoices].filter(doc => 
                doc && typeof doc.amount === 'number' && (doc.dueDate || doc.date)
            );
            
            const monthlySpending = {};
            const categorySpending = {};

            allDocuments.forEach(doc => {
                try {
                    const date = new Date(doc.dueDate || doc.date);
                    if (isNaN(date.getTime())) return;

                    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                    
                    if (!monthlySpending[monthKey]) {
                        monthlySpending[monthKey] = 0;
                    }
                    monthlySpending[monthKey] += doc.amount;

                    const category = doc.category || 'other';
                    if (!categorySpending[category]) {
                        categorySpending[category] = 0;
                    }
                    categorySpending[category] += doc.amount;
                } catch (error) {
                    console.warn('Erro ao processar documento individual:', error);
                }
            });

            const monthlyValues = Object.values(monthlySpending);
            const monthlyAverage = monthlyValues.length > 0 
                ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
                : 0;

            return {
                monthlyAverage: monthlyAverage,
                topCategories: Object.entries(categorySpending)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5),
                trends: this.calculateTrends(monthlySpending),
                recommendations: this.generateRecommendations(categorySpending)
            };
        } catch (error) {
            console.error('Erro na análise de padrões de gastos:', error);
            throw error;
        }
    }

    calculateTrends(monthlyData) {
        try {
            if (!monthlyData || typeof monthlyData !== 'object') {
                return { trend: 'stable', change: 0 };
            }

            const months = Object.keys(monthlyData).sort();
            if (months.length < 2) return { trend: 'stable', change: 0 };

            const recent = monthlyData[months[months.length - 1]];
            const previous = monthlyData[months[months.length - 2]];
            
            if (previous === 0) return { trend: 'stable', change: 0 };
            
            const change = ((recent - previous) / previous) * 100;

            return {
                trend: change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable',
                change: Math.abs(change),
                direction: change > 0 ? 'up' : 'down'
            };
        } catch (error) {
            console.error('Erro no cálculo de tendências:', error);
            return { trend: 'stable', change: 0 };
        }
    }

    generateRecommendations(categorySpending) {
        try {
            const recommendations = [];
            
            if (!categorySpending || typeof categorySpending !== 'object') {
                return recommendations;
            }

            const sortedCategories = Object.entries(categorySpending)
                .filter(([category, amount]) => typeof amount === 'number')
                .sort(([,a], [,b]) => b - a);

            if (sortedCategories.length > 0) {
                const [topCategory, topAmount] = sortedCategories[0];
                if (topAmount > 5000) {
                    recommendations.push({
                        type: 'cost-reduction',
                        category: topCategory,
                        message: `Considere revisar gastos em ${topCategory} - representa o maior gasto mensal`
                    });
                }
            }

            if (sortedCategories.length > 3) {
                recommendations.push({
                    type: 'consolidation',
                    message: 'Considere consolidar fornecedores para obter melhores preços'
                });
            }

            return recommendations;
        } catch (error) {
            console.error('Erro na geração de recomendações:', error);
            return [];
        }
    }

    async generateInsights(financialData) {
        if (!this.isReady) {
            throw new Error('AI Engine não está pronto');
        }

        if (!financialData) {
            throw new Error('Dados financeiros não fornecidos');
        }

        try {
            const insights = [];
            const bills = Array.isArray(financialData.bills) ? financialData.bills : [];
            const invoices = Array.isArray(financialData.invoices) ? financialData.invoices : [];
            
            // Cash flow insights
            const totalPending = bills
                .filter(bill => bill && bill.status === 'pending' && typeof bill.amount === 'number')
                .reduce((sum, bill) => sum + bill.amount, 0);

            if (totalPending > 10000) {
                insights.push({
                    type: 'warning',
                    title: 'Alto valor em aberto',
                    message: `Você tem R$ ${totalPending.toLocaleString('pt-BR')} em boletos pendentes`,
                    priority: 'high'
                });
            }

            // Due date insights
            const now = new Date();
            const overdueBills = bills.filter(bill => {
                if (!bill || bill.status !== 'pending' || !bill.dueDate) return false;
                const dueDate = new Date(bill.dueDate);
                return !isNaN(dueDate.getTime()) && dueDate < now;
            });

            if (overdueBills.length > 0) {
                insights.push({
                    type: 'urgent',
                    title: 'Boletos vencidos',
                    message: `${overdueBills.length} boletos estão vencidos`,
                    priority: 'urgent'
                });
            }

            // Spending pattern insights
            try {
                const patterns = await this.analyzeSpendingPatterns(bills, invoices);
                if (patterns.trends.trend === 'increasing' && patterns.trends.change > 0) {
                    insights.push({
                        type: 'info',
                        title: 'Gastos em alta',
                        message: `Seus gastos aumentaram ${patterns.trends.change.toFixed(1)}% no último mês`,
                        priority: 'medium'
                    });
                }
            } catch (error) {
                console.warn('Erro na análise de padrões para insights:', error);
            }

            return insights;
        } catch (error) {
            console.error('Erro na geração de insights:', error);
            throw error;
        }
    }
}