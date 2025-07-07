class FileProcessor {
    constructor() {
        this.supportedTypes = {
            'application/pdf': this.processPDF,
            'image/jpeg': this.processImage,
            'image/jpg': this.processImage,
            'image/png': this.processImage,
            'text/xml': this.processXML,
            'application/xml': this.processXML,
            'text/plain': this.processText
        };
        this.aiEngine = null;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.initializeAI();
    }

    async initializeAI() {
        try {
            this.aiEngine = new AIEngine();
            await this.aiEngine.init();
        } catch (error) {
            console.error('Erro ao inicializar AI Engine:', error);
        }
    }

    async processFile(file) {
        try {
            if (!file) {
                throw new Error('Arquivo não fornecido');
            }

            // Validate file size
            if (file.size > this.maxFileSize) {
                throw new Error('Arquivo muito grande. Máximo permitido: 10MB');
            }

            // Validate file type
            const fileType = file.type || this.getFileTypeFromExtension(file.name);
            const fileName = file.name.toLowerCase();
            
            if (!this.supportedTypes[fileType]) {
                throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
            }

            const processor = this.supportedTypes[fileType];
            if (typeof processor !== 'function') {
                throw new Error('Processador de arquivo inválido');
            }

            const result = await processor.call(this, file);
            
            if (!result || !result.data) {
                throw new Error('Resultado de processamento inválido');
            }

            // Apply AI processing if enabled and AI engine is available
            if (window.financeAI && window.financeAI.settings.aiProcessing && this.aiEngine) {
                try {
                    result.aiAnalysis = await this.aiEngine.classifyDocument(JSON.stringify(result.data));
                    
                    if (window.financeAI.settings.smartCategorization) {
                        const categorization = await this.aiEngine.smartCategorization(result.data);
                        if (categorization && categorization.category) {
                            result.data.category = categorization.category;
                            result.data.categoryConfidence = categorization.confidence;
                        }
                    }

                    if (window.financeAI.settings.duplicateDetection) {
                        const existingDocs = result.type === 'bill' ? 
                            window.financeAI.bills : window.financeAI.invoices;
                        const duplicateCheck = await this.aiEngine.detectDuplicates(result.data, existingDocs);
                        if (duplicateCheck) {
                            result.duplicateWarning = duplicateCheck.isDuplicate;
                            result.duplicates = duplicateCheck.duplicates;
                        }
                    }
                } catch (aiError) {
                    console.warn('Erro no processamento de IA:', aiError);
                    // Continue without AI processing
                }
            }
            
            return result;
        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            throw error;
        }
    }

    async processPDF(file) {
        try {
            // For production, you would use a PDF parsing library like PDF.js
            const text = await this.extractTextFromPDF(file);
            return await this.parseFinancialDocument(text, 'pdf');
        } catch (error) {
            throw new Error(`Erro ao processar PDF: ${error.message}`);
        }
    }

    async processImage(file) {
        try {
            // For production, you would use OCR services like Tesseract.js
            const text = await this.extractTextFromImage(file);
            return await this.parseFinancialDocument(text, 'image');
        } catch (error) {
            throw new Error(`Erro ao processar imagem: ${error.message}`);
        }
    }

    async processXML(file) {
        try {
            const text = await this.readFileAsText(file);
            if (!text || text.trim().length === 0) {
                throw new Error('Arquivo XML vazio');
            }
            return await this.parseXMLDocument(text);
        } catch (error) {
            throw new Error(`Erro ao processar XML: ${error.message}`);
        }
    }

    async processText(file) {
        try {
            const text = await this.readFileAsText(file);
            if (!text || text.trim().length === 0) {
                throw new Error('Arquivo de texto vazio');
            }
            return await this.parseFinancialDocument(text, 'text');
        } catch (error) {
            throw new Error(`Erro ao processar texto: ${error.message}`);
        }
    }

    async extractTextFromPDF(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('Arquivo PDF não fornecido'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Timeout na extração de texto do PDF'));
            }, 10000);

            setTimeout(() => {
                clearTimeout(timeout);
                resolve(`
                    BOLETO DE PAGAMENTO
                    Beneficiário: Empresa ABC Ltda
                    Valor: R$ 1.250,50
                    Vencimento: 15/01/2024
                    Código de Barras: 83640000123456789012345678901234567890
                    Descrição: Financiamento - Parcela 12/48
                `);
            }, 1000);
        });
    }

    async extractTextFromImage(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('Arquivo de imagem não fornecido'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Timeout na extração de texto da imagem'));
            }, 15000);

            setTimeout(() => {
                clearTimeout(timeout);
                resolve(`
                    CONTA DE ENERGIA ELÉTRICA
                    Valor a Pagar: R$ 450,30
                    Vencimento: 20/01/2024
                    Código de Barras: 83640000123456789012345678901234567891
                    Consumo: 350 kWh
                `);
            }, 2000);
        });
    }

    async parseXMLDocument(xmlText) {
        try {
            if (!xmlText || typeof xmlText !== 'string') {
                throw new Error('Texto XML inválido');
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Check for parser errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML mal formado');
            }
            
            // Check if it's a Brazilian NFe (Nota Fiscal Eletrônica)
            if (xmlDoc.getElementsByTagName('NFe').length > 0) {
                return this.parseNFe(xmlDoc);
            }
            
            // Check if it's a boleto XML
            if (xmlDoc.getElementsByTagName('boleto').length > 0) {
                return this.parseBoletoXML(xmlDoc);
            }
            
            throw new Error('Formato XML não reconhecido');
        } catch (error) {
            console.error('Erro ao processar XML:', error);
            throw error;
        }
    }

    parseNFe(xmlDoc) {
        try {
            if (!xmlDoc) {
                throw new Error('Documento XML inválido');
            }

            const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
            const emit = xmlDoc.getElementsByTagName('emit')[0];
            const total = xmlDoc.getElementsByTagName('total')[0];
            const ICMSTot = xmlDoc.getElementsByTagName('ICMSTot')[0];
            
            if (!infNFe || !emit || !ICMSTot) {
                throw new Error('Estrutura NFe inválida');
            }

            const invoiceData = {
                id: Date.now(),
                number: this.getElementText(infNFe, 'Id')?.replace('NFe', '') || 'AUTO-' + Date.now(),
                supplier: this.getElementText(emit, 'xNome') || 'Fornecedor não identificado',
                amount: this.parseFloat(this.getElementText(ICMSTot, 'vNF')) || 0,
                date: this.parseDate(this.getElementText(xmlDoc, 'dhEmi')) || new Date().toISOString().split('T')[0],
                cnpj: this.getElementText(emit, 'CNPJ') || '',
                category: 'supplies',
                status: 'received',
                createdAt: new Date().toISOString(),
                source: 'xml-import'
            };

            return {
                type: 'invoice',
                data: invoiceData,
                confidence: 0.95
            };
        } catch (error) {
            console.error('Erro ao processar NFe:', error);
            throw error;
        }
    }

    parseBoletoXML(xmlDoc) {
        try {
            if (!xmlDoc) {
                throw new Error('Documento XML inválido');
            }

            const boleto = xmlDoc.getElementsByTagName('boleto')[0];
            if (!boleto) {
                throw new Error('Estrutura de boleto inválida');
            }
            
            const billData = {
                id: Date.now(),
                name: this.getElementText(boleto, 'beneficiario') || 'Boleto Importado',
                amount: this.parseFloat(this.getElementText(boleto, 'valor')) || 0,
                dueDate: this.parseDate(this.getElementText(boleto, 'vencimento')) || new Date().toISOString().split('T')[0],
                barcode: this.getElementText(boleto, 'codigo_barras') || '',
                category: 'other',
                status: 'pending',
                createdAt: new Date().toISOString(),
                source: 'xml-import'
            };

            return {
                type: 'bill',
                data: billData,
                confidence: 0.95
            };
        } catch (error) {
            console.error('Erro ao processar boleto XML:', error);
            throw error;
        }
    }

    getElementText(parent, tagName) {
        try {
            if (!parent || !tagName) return null;
            const element = parent.getElementsByTagName(tagName)[0];
            return element ? element.textContent : null;
        } catch (error) {
            return null;
        }
    }

    parseFloat(value) {
        if (typeof value === 'number') return value;
        if (typeof value !== 'string') return 0;
        
        const cleanValue = value.replace(/[^\d,-]/g, '').replace(',', '.');
        const result = parseFloat(cleanValue);
        return isNaN(result) ? 0 : result;
    }

    async parseFinancialDocument(text, sourceType) {
        const patterns = {
            value: /(?:valor|total|importância).*?R\$?\s*(\d+(?:\.\d{3})*(?:,\d{2})?)/i,
            dueDate: /(?:vencimento|vence|data).*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
            barcode: /(\d{5}\.?\d{5}\s?\d{5}\.?\d{6}\s?\d{5}\.?\d{6}\s?\d{1}\s?\d{14})/,
            beneficiary: /(?:beneficiário|empresa|fornecedor).*?([A-Z][a-z\s]+(?:Ltda|S\.A\.|LTDA|SA)?)/i,
            invoiceNumber: /(?:nota fiscal|nf|número).*?(\d+)/i,
            cnpj: /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/
        };

        const extractedData = {};
        
        // Extract value
        const valueMatch = text.match(patterns.value);
        if (valueMatch) {
            extractedData.amount = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
        }

        // Extract due date
        const dateMatch = text.match(patterns.dueDate);
        if (dateMatch) {
            extractedData.dueDate = this.parseDate(dateMatch[1]);
        }

        // Extract barcode
        const barcodeMatch = text.match(patterns.barcode);
        if (barcodeMatch) {
            extractedData.barcode = barcodeMatch[1].replace(/\s/g, '');
        }

        // Extract beneficiary
        const beneficiaryMatch = text.match(patterns.beneficiary);
        if (beneficiaryMatch) {
            extractedData.beneficiary = beneficiaryMatch[1].trim();
        }

        // Extract invoice number
        const invoiceMatch = text.match(patterns.invoiceNumber);
        if (invoiceMatch) {
            extractedData.invoiceNumber = invoiceMatch[1];
        }

        // Extract CNPJ
        const cnpjMatch = text.match(patterns.cnpj);
        if (cnpjMatch) {
            extractedData.cnpj = cnpjMatch[1];
        }

        // Determine document type
        const isInvoice = text.toLowerCase().includes('nota fiscal') || 
                         text.toLowerCase().includes('nf') || 
                         extractedData.invoiceNumber;
        
        if (isInvoice) {
            return {
                type: 'invoice',
                data: {
                    id: Date.now(),
                    number: extractedData.invoiceNumber || 'AUTO-' + Date.now(),
                    supplier: extractedData.beneficiary || 'Fornecedor não identificado',
                    amount: extractedData.amount || 0,
                    date: extractedData.dueDate || new Date().toISOString().split('T')[0],
                    cnpj: extractedData.cnpj || '',
                    category: 'other',
                    status: 'received',
                    createdAt: new Date().toISOString(),
                    source: `${sourceType}-import`
                },
                confidence: 0.8
            };
        } else {
            return {
                type: 'bill',
                data: {
                    id: Date.now(),
                    name: extractedData.beneficiary || 'Boleto Importado',
                    amount: extractedData.amount || 0,
                    dueDate: extractedData.dueDate || new Date().toISOString().split('T')[0],
                    barcode: extractedData.barcode || '',
                    category: 'other',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    source: `${sourceType}-import`
                },
                confidence: 0.8
            };
        }
    }

    parseDate(dateString) {
        try {
            if (!dateString) return new Date().toISOString().split('T')[0];
            
            // Handle different date formats
            const formats = [
                /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
                /(\d{4})-(\d{2})-(\d{2})/,        // YYYY-MM-DD
                /(\d{2})-(\d{2})-(\d{4})/         // DD-MM-YYYY
            ];

            for (const format of formats) {
                const match = dateString.match(format);
                if (match) {
                    if (format.source.includes('4')) {
                        // YYYY-MM-DD
                        const date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
                        if (!isNaN(date.getTime())) {
                            return `${match[1]}-${match[2]}-${match[3]}`;
                        }
                    } else {
                        // DD/MM/YYYY or DD-MM-YYYY
                        const date = new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
                        if (!isNaN(date.getTime())) {
                            return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
                        }
                    }
                }
            }

            return new Date().toISOString().split('T')[0];
        } catch (error) {
            return new Date().toISOString().split('T')[0];
        }
    }

    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('Arquivo não fornecido'));
                return;
            }

            const reader = new FileReader();
            
            const timeout = setTimeout(() => {
                reader.abort();
                reject(new Error('Timeout na leitura do arquivo'));
            }, 30000);

            reader.onload = (e) => {
                clearTimeout(timeout);
                resolve(e.target.result);
            };
            
            reader.onerror = (e) => {
                clearTimeout(timeout);
                reject(new Error('Erro na leitura do arquivo'));
            };
            
            reader.readAsText(file);
        });
    }

    async readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('Arquivo não fornecido'));
                return;
            }

            const reader = new FileReader();
            
            const timeout = setTimeout(() => {
                reader.abort();
                reject(new Error('Timeout na leitura do arquivo'));
            }, 30000);

            reader.onload = (e) => {
                clearTimeout(timeout);
                resolve(e.target.result);
            };
            
            reader.onerror = (e) => {
                clearTimeout(timeout);
                reject(new Error('Erro na leitura do arquivo'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    async validateDocument(documentData, type) {
        const validations = {
            bill: {
                required: ['name', 'amount', 'dueDate'],
                amount: { min: 0, max: 1000000 },
                dueDate: { minDate: new Date('2020-01-01'), maxDate: new Date('2030-12-31') }
            },
            invoice: {
                required: ['number', 'supplier', 'amount', 'date'],
                amount: { min: 0, max: 10000000 },
                date: { minDate: new Date('2020-01-01'), maxDate: new Date() }
            }
        };

        const rules = validations[type];
        if (!rules) return { valid: true };

        const errors = [];

        // Check required fields
        for (const field of rules.required) {
            if (!documentData[field]) {
                errors.push(`Campo obrigatório: ${field}`);
            }
        }

        // Validate amount
        if (rules.amount && documentData.amount) {
            if (documentData.amount < rules.amount.min || documentData.amount > rules.amount.max) {
                errors.push(`Valor deve estar entre R$ ${rules.amount.min} e R$ ${rules.amount.max}`);
            }
        }

        // Validate dates
        if (rules.dueDate && documentData.dueDate) {
            const dueDate = new Date(documentData.dueDate);
            if (dueDate < rules.dueDate.minDate || dueDate > rules.dueDate.maxDate) {
                errors.push('Data de vencimento inválida');
            }
        }

        if (rules.date && documentData.date) {
            const date = new Date(documentData.date);
            if (date < rules.date.minDate || date > rules.date.maxDate) {
                errors.push('Data inválida');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    getFileTypeFromExtension(filename) {
        try {
            if (!filename || typeof filename !== 'string') {
                return 'application/octet-stream';
            }

            const extension = filename.split('.').pop().toLowerCase();
            const typeMap = {
                'pdf': 'application/pdf',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'xml': 'text/xml',
                'txt': 'text/plain'
            };
            return typeMap[extension] || 'application/octet-stream';
        } catch (error) {
            return 'application/octet-stream';
        }
    }

    async batchProcessFiles(files) {
        if (!files || !Array.isArray(files)) {
            throw new Error('Lista de arquivos inválida');
        }

        const results = [];
        const errors = [];

        for (const file of files) {
            try {
                const result = await this.processFile(file);
                results.push({
                    file: file.name,
                    success: true,
                    data: result
                });
            } catch (error) {
                errors.push({
                    file: file.name,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: results,
            errors: errors,
            total: files.length,
            processed: results.length
        };
    }
}