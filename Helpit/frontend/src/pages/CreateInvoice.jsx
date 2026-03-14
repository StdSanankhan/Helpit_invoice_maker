import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Download, Send, AlertCircle, Save, CheckCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const TEMPLATES = ['modern', 'corporate', 'minimal', 'creative'];

const CreateInvoice = () => {
    const [settings, setSettings] = useState(null);
    const [clients, setClients] = useState([]);
    const [invoice, setInvoice] = useState({
        client_id: '',
        client_name: '',
        client_email: '',
        invoice_number: '',
        due_date: '',
        notes: '',
        items: [{ description: '', quantity: 1, price: 0, tax_rate: 0 }],
        discount: 0,
        status: 'Draft',
        template_style: 'modern'
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [isEmailing, setIsEmailing] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        // Fetch Settings
        fetch('http://localhost:8000/api/settings/')
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setInvoice(prev => ({ ...prev, notes: data.default_terms || '' }));
            })
            .catch(console.error);
            
        // Fetch Clients
        fetch('http://localhost:8000/api/clients/')
            .then(res => res.json())
            .then(data => setClients(data))
            .catch(console.error);
    }, []);

    const handleClientChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            setInvoice(prev => ({ ...prev, client_id: '', client_name: '', client_email: '' }));
            return;
        }
        const client = clients.find(c => c.id === selectedId);
        if (client) {
            setInvoice({
                ...invoice,
                client_id: client.id,
                client_name: client.name,
                client_email: client.email
            });
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...invoice.items];
        if (field === 'description') {
            newItems[index][field] = value;
        } else {
            newItems[index][field] = value === '' ? '' : (parseFloat(value) || 0);
        }
        setInvoice({ ...invoice, items: newItems });
    };

    const addItem = () => setInvoice({ ...invoice, items: [...invoice.items, { description: '', quantity: 1, price: 0, tax_rate: 0 }] });
    const removeItem = (index) => setInvoice({ ...invoice, items: invoice.items.filter((_, i) => i !== index) });

    const calculateTotal = () => {
        let subtotal = 0;
        let taxTotal = 0;
        invoice.items.forEach(item => {
            const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            subtotal += itemTotal;
            taxTotal += itemTotal * ((parseFloat(item.tax_rate) || 0) / 100);
        });
        const discountVal = parseFloat(invoice.discount) || 0;
        return { 
            subtotal, 
            taxTotal, 
            grandTotal: Math.max(0, subtotal + taxTotal - discountVal)
        };
    };

    const { subtotal, taxTotal, grandTotal } = calculateTotal();

    const handleSave = async () => {
        if (!invoice.client_id) {
            setMessage({ type: 'error', text: 'Please select a client before saving.' });
            return;
        }
        setIsSaving(true);
        setMessage(null);
        try {
            const payload = { ...invoice, total: grandTotal };
            const res = await fetch('http://localhost:8000/api/invoices/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                setInvoice(prev => ({ ...prev, invoice_number: data.invoice_number, id: data.id }));
                setMessage({ type: 'success', text: 'Invoice saved successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to save invoice.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error.' });
        } finally {
            setIsSaving(false);
        }
    };

    const getPDFOptions = () => ({
        margin: 0,
        filename: `${invoice.invoice_number || 'Draft'}_${invoice.client_name || 'Invoice'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    });

    const generatePDF = async (shouldSave = true) => {
        const element = document.getElementById('invoice-preview');
        const clone = element.cloneNode(true);
        clone.id = 'invoice-pdf-clone';
        clone.style.transform = 'none';
        clone.style.position = 'relative';
        clone.style.scale = '1';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.margin = '0';
        clone.classList.remove('absolute', 'transform', 'scale-[0.6]', '2xl:scale-75');
        
        // Hide the dummy overlay if present
        const hideMe = clone.querySelector('.hide-in-pdf');
        if (hideMe) hideMe.style.display = 'none';

        document.body.appendChild(clone);

        try {
            const pb = html2pdf().set(getPDFOptions()).from(clone);
            if (shouldSave) {
                await pb.save();
                return null;
            } else {
                // Return base64 URI string for email attachment
                const pdfDataUrl = await pb.outputPdf('datauristring');
                return pdfDataUrl;
            }
        } finally {
            document.body.removeChild(clone);
        }
    };

    const handleSendEmail = async () => {
        if (!invoice.client_email || !invoice.id) {
            setMessage({ type: 'error', text: 'Please save the invoice and ensure the client has an email address first.' });
            return;
        }

        setIsEmailing(true);
        setMessage({ type: 'info', text: 'Generating PDF attachment...' });

        try {
            // Generate PDF as base64
            const base64PdfUrl = await generatePDF(false);

            if (!base64PdfUrl) {
                throw new Error("Failed to generate PDF locally");
            }

            setMessage({ type: 'info', text: 'Sending email...' });

            const payload = {
                to_email: invoice.client_email,
                subject: `Invoice ${invoice.invoice_number} from ${settings?.business_name || 'Helpit'}`,
                message: `Hello ${invoice.client_name || 'there'},\n\nPlease find your invoice (${invoice.invoice_number}) for $${grandTotal.toFixed(2)} attached.\n\nNotes: ${invoice.notes}\n\nBest regards,\n${settings?.business_name || 'Helpit'}`,
                invoice_id: invoice.id,
                pdf_base64: base64PdfUrl
            };

            const res = await fetch('http://localhost:8000/api/invoices/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Invoice email with PDF sent successfully!' });
                setInvoice(prev => ({ ...prev, status: 'Sent' })); // Auto update status visually
            } else {
                const errData = await res.json();
                setMessage({ type: 'error', text: errData.detail || 'Failed to send email.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error while generating/sending PDF via email.' });
        } finally {
            setIsEmailing(false);
        }
    };

    // Template rendering engine logic
    const renderTemplate = () => {
        const s = invoice.template_style;
        const b = settings || {};
        
        if (s === 'corporate') {
            return (
                <div id="invoice-preview" className="bg-white text-gray-900 w-[210mm] min-h-[297mm] shadow-2xl origin-top transform scale-[0.6] 2xl:scale-75 absolute top-4 p-12 transition-all font-serif">
                    <div className="flex border-b-[6px] border-[#0f172a] pb-8 mb-8 relative">
                        {b.business_logo && <img src={b.business_logo} crossOrigin="anonymous" alt="Logo" className="max-h-20 absolute top-0 left-0" onError={(e) => e.target.style.display = 'none'} />}
                        <div className="w-full text-right ml-[100px]">
                            <h2 className="text-4xl font-extrabold text-[#0f172a] uppercase tracking-wider mb-1">INVOICE</h2>
                            <p className="text-xl font-bold text-gray-700">{invoice.invoice_number}</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-between mb-12 text-sm leading-relaxed">
                        <div className="w-1/2 pr-4">
                            <h4 className="font-bold text-[#0f172a] uppercase border-b border-gray-300 pb-1 mb-2">From</h4>
                            <p className="font-bold">{b.business_name || 'Your Company'}</p>
                            <p>{b.business_address}</p>
                            <p>{b.business_email}</p>
                            <p>{b.business_phone}</p>
                            {b.business_tax_number && <p>Tax ID: {b.business_tax_number}</p>}
                        </div>
                        <div className="w-1/2 pl-4">
                            <h4 className="font-bold text-[#0f172a] uppercase border-b border-gray-300 pb-1 mb-2">Bill To</h4>
                            <p className="font-bold">{invoice.client_name || 'Client Name'}</p>
                            <p>{invoice.client_email}</p>
                            <div className="mt-4 grid grid-cols-2 gap-x-4">
                                <p className="font-bold text-gray-500">Invoice Date:</p>
                                <p className="text-right">{new Date().toLocaleDateString()}</p>
                                <p className="font-bold text-gray-500">Due Date:</p>
                                <p className="text-right">{invoice.due_date || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <table className="w-full mb-12 border-collapse">
                        <thead>
                            <tr className="bg-[#0f172a] text-white">
                                <th className="py-3 px-4 text-left text-sm font-bold uppercase">Description</th>
                                <th className="py-3 px-4 text-center text-sm font-bold uppercase">Qty</th>
                                <th className="py-3 px-4 text-right text-sm font-bold uppercase">Price</th>
                                <th className="py-3 px-4 text-right text-sm font-bold uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, i) => (
                                <tr key={i} className="border-b border-gray-200">
                                    <td className="py-4 px-4 text-gray-800">{item.description}</td>
                                    <td className="py-4 px-4 text-center">{item.quantity}</td>
                                    <td className="py-4 px-4 text-right">${Number(item.price).toFixed(2)}</td>
                                    <td className="py-4 px-4 font-bold text-right">${(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end mb-16">
                        <div className="w-72 bg-gray-50 p-6 rounded border border-gray-200">
                            <div className="flex justify-between text-gray-600 mb-2"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between text-gray-600 mb-2"><span>Tax</span><span>${taxTotal.toFixed(2)}</span></div>
                            {parseFloat(invoice.discount) > 0 && (
                                <div className="flex justify-between text-red-600 mb-2"><span>Discount</span><span>-${parseFloat(invoice.discount).toFixed(2)}</span></div>
                            )}
                            <div className="flex justify-between text-2xl font-black text-[#0f172a] border-t-2 border-[#0f172a] pt-4 mt-2">
                                <span>TOTAL</span><span>${grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        
        if (s === 'minimal') {
            return (
                <div id="invoice-preview" className="bg-white text-gray-800 w-[210mm] min-h-[297mm] shadow-2xl origin-top transform scale-[0.6] 2xl:scale-75 absolute top-4 p-16 transition-all font-sans tracking-tight">
                    <div className="flex justify-between items-end mb-24">
                        <h1 className="text-6xl font-light tracking-tighter text-gray-900 border-l-[12px] border-gray-900 pl-4">INVOICE</h1>
                        <p className="text-2xl font-light text-gray-400">{invoice.invoice_number}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-16 mb-24">
                        <div>
                            {b.business_logo && <img src={b.business_logo} crossOrigin="anonymous" alt="Logo" className="max-h-12 mb-6" onError={(e) => e.target.style.display = 'none'} />}
                            <h3 className="font-semibold text-lg">{b.business_name}</h3>
                            <p className="text-gray-500 whitespace-pre-wrap">{[b.business_address, b.business_email, b.business_phone].filter(Boolean).join('\n')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Billed To</p>
                            <h3 className="font-semibold text-lg">{invoice.client_name}</h3>
                            <p className="text-gray-500">{invoice.client_email}</p>
                            <div className="mt-8 space-y-1 text-sm">
                                <p><span className="text-gray-400">Date:</span> {new Date().toLocaleDateString()}</p>
                                <p><span className="text-gray-400">Due:</span> {invoice.due_date}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 mb-24">
                        {invoice.items.map((item, i) => (
                            <div key={i} className="flex justify-between py-4 border-b border-gray-100">
                                <div className="w-1/2">
                                    <p className="font-medium">{item.description}</p>
                                </div>
                                <div className="w-1/4 text-center text-gray-500">{item.quantity} × ${Number(item.price).toFixed(2)}</div>
                                <div className="w-1/4 text-right font-medium">${(item.quantity * item.price).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between border-t border-gray-900 pt-8 mt-auto">
                        <div className="w-1/2 text-sm text-gray-400 whitespace-pre-wrap">{invoice.notes}</div>
                        <div className="w-1/3 space-y-2 text-right">
                            <p className="text-gray-500">Subtotal: ${subtotal.toFixed(2)}</p>
                            <p className="text-gray-500">Tax: ${taxTotal.toFixed(2)}</p>
                            {parseFloat(invoice.discount) > 0 && <p className="text-gray-500">Discount: -${parseFloat(invoice.discount).toFixed(2)}</p>}
                            <p className="text-3xl font-light text-gray-900 mt-4">${grandTotal.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            );
        }

        // Default 'modern'
        return (
            <div id="invoice-preview" className="bg-white text-gray-900 w-[210mm] min-h-[297mm] shadow-2xl origin-top transform scale-[0.6] 2xl:scale-75 absolute top-4 p-12 transition-all">
                <div className="flex justify-between items-start mb-12 border-b-2 border-gray-100 pb-8">
                    <div>
                        {b.business_logo ? (
                            <img src={b.business_logo} crossOrigin="anonymous" alt="Logo" className="max-h-16 mb-4" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">{b.business_name || 'Your Company'}</h2>
                        )}
                        <p className="text-gray-500 text-sm">{b.business_email}</p>
                        <p className="text-gray-500 text-sm">{b.business_phone}</p>
                        <p className="text-gray-500 text-sm">{b.business_address}</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-4xl font-light text-blue-500 tracking-wider mb-2 uppercase">Invoice</h1>
                        <p className="text-xl font-medium text-gray-700 mb-4">{invoice.invoice_number}</p>
                        <p className="font-semibold text-gray-800">Date: <span className="font-normal text-gray-600">{new Date().toLocaleDateString()}</span></p>
                        <p className="font-semibold text-gray-800">Due: <span className="font-normal text-gray-600">{invoice.due_date || 'N/A'}</span></p>
                    </div>
                </div>

                <div className="mb-12 bg-blue-50/50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                    <p className="text-sm font-semibold tracking-widest text-blue-400 uppercase mb-2">Bill To</p>
                    <h3 className="text-xl font-bold text-gray-800">{invoice.client_name || 'Client Name'}</h3>
                    <p className="text-gray-600">{invoice.client_email || 'client@email.com'}</p>
                </div>

                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b-2 border-gray-800 text-left bg-gray-50">
                            <th className="py-3 px-4 text-sm font-semibold text-gray-800 uppercase tracking-widest rounded-tl-lg">Description</th>
                            <th className="py-3 text-sm font-semibold text-gray-800 uppercase tracking-widest text-center">Qty</th>
                            <th className="py-3 text-sm font-semibold text-gray-800 uppercase tracking-widest text-right">Price</th>
                            <th className="py-3 px-4 text-sm font-semibold text-gray-800 uppercase tracking-widest text-right rounded-tr-lg">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, i) => (
                            <tr key={i} className="border-b border-gray-100">
                                <td className="py-4 px-4 text-gray-800">{item.description || 'Item description'}</td>
                                <td className="py-4 text-gray-600 text-center">{item.quantity}</td>
                                <td className="py-4 text-gray-600 text-right">${Number(item.price).toFixed(2)}</td>
                                <td className="py-4 px-4 text-gray-800 font-medium text-right">${(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-16">
                    <div className="w-72 space-y-3">
                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-gray-600"><span>Estimated Tax</span><span>${taxTotal.toFixed(2)}</span></div>
                        {parseFloat(invoice.discount) > 0 && (
                            <div className="flex justify-between text-blue-500 font-medium"><span>Discount</span><span>-${parseFloat(invoice.discount).toFixed(2)}</span></div>
                        )}
                        <div className="flex justify-between text-2xl font-bold text-gray-800 border-t-2 border-gray-800 pt-3 mt-3">
                            <span>Total</span><span>${grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {invoice.notes && (
                    <div className="border-t border-gray-200 pt-8 mt-auto">
                        <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase mb-2">Terms & Notes</p>
                        <p className="text-gray-600 text-sm whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold heading-gradient mb-2">Create Invoice</h1>
                    <p className="text-gray-400">Generate a professional invoice, pick templates, and email to client.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleSendEmail} disabled={isEmailing} className="glass-button-secondary flex items-center gap-2 text-sm text-neon border-neon/30 hover:bg-neon/10">
                        <Send className="w-4 h-4" /> {isEmailing ? 'Sending Email...' : 'Email to Client'}
                    </button>
                    <button onClick={() => generatePDF(true)} className="glass-button-secondary flex items-center gap-2 text-sm text-blue-400 border-blue-400/30 hover:bg-blue-400/10">
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="glass-button flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Invoice'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'info' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <AlertCircle className="w-5 h-5" />
                    <p>{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Editor Form */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-2xl space-y-6 relative overflow-hidden group">
                        <div className="flex flex-wrap gap-4 items-center justify-between border-b border-white/10 pb-4">
                            <h3 className="text-lg font-semibold text-white">Invoice Settings</h3>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">Status:</span>
                                <select 
                                    className="glass-input py-1 px-3 appearance-none min-w-[120px] font-medium" 
                                    value={invoice.status} 
                                    onChange={e => setInvoice({ ...invoice, status: e.target.value })}
                                >
                                    <option className="text-black" value="Draft">Draft</option>
                                    <option className="text-black" value="Sent">Sent</option>
                                    <option className="text-black" value="Paid">Paid</option>
                                    <option className="text-black" value="Overdue">Overdue</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 uppercase tracking-wider">Select Client</label>
                                <select 
                                    className="glass-input w-full appearance-none" 
                                    value={invoice.client_id}
                                    onChange={handleClientChange}
                                >
                                    <option className="text-gray-500 bg-black" value="">-- Select Client --</option>
                                    {clients.map(c => <option key={c.id} value={c.id} className="text-black">{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 uppercase tracking-wider">Invoice / Due Date</label>
                                <input type="date" className="glass-input w-full" value={invoice.due_date} onChange={e => setInvoice({ ...invoice, due_date: e.target.value })} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs text-neon uppercase tracking-wider flex items-center gap-2">Design Template</label>
                                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
                                    {TEMPLATES.map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => setInvoice({ ...invoice, template_style: t })}
                                            className={`max-w-[120px] w-full py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all ${invoice.template_style === t ? 'bg-primary text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-6 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                            <h3 className="text-lg font-semibold text-white">Line Items</h3>
                            <button onClick={addItem} className="text-neon hover:text-white hover:bg-neon/20 transition-colors flex items-center gap-1 text-sm bg-neon/10 px-3 py-1.5 rounded-full border border-neon/20 font-medium">
                                <Plus className="w-3.5 h-3.5" /> Add Service
                            </button>
                        </div>

                        <div className="space-y-4">
                            {invoice.items.map((item, index) => (
                                <div key={index} className="flex gap-4 items-start bg-white/5 p-5 rounded-xl border border-transparent hover:border-white/10 transition-all">
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
                                            <input type="text" className="glass-input w-full" placeholder="Ex: Web Design Phase 1" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Qty</label>
                                                <input type="number" min="1" className="glass-input w-full text-center hover:border-primary/50" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Price ($)</label>
                                                <input type="number" min="0" step="0.01" className="glass-input w-full font-mono text-primary/80" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Tax (%)</label>
                                                <input type="number" min="0" max="100" className="glass-input w-full text-center" value={item.tax_rate} onChange={e => handleItemChange(index, 'tax_rate', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeItem(index)} className="text-gray-500 hover:text-white mt-6 transition-all p-3 bg-red-500/5 hover:bg-red-500 border border-red-500/20 rounded-xl group hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                        <Trash2 className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex justify-end pt-4">
                            <div className="w-48">
                                <label className="text-[10px] text-neon uppercase tracking-wider mb-1 block">Apply Discount ($)</label>
                                <input type="number" min="0" step="0.01" className="glass-input w-full font-mono text-neon border-neon/30 focus:border-neon" value={invoice.discount} onChange={e => setInvoice({...invoice, discount: e.target.value === '' ? '' : parseFloat(e.target.value)})} placeholder="0.00" />
                            </div>
                        </div>
                    </div>

                    <div className="glass p-6 rounded-2xl space-y-4">
                        <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Notes & Terms</h3>
                        <textarea className="glass-input w-full h-24 resize-none" value={invoice.notes} onChange={e => setInvoice({ ...invoice, notes: e.target.value })} placeholder="Thank you for your business. Payment is due within 30 days." />
                    </div>
                </div>

                {/* PDF Live Preview */}
                <div className="hidden xl:block">
                    <div className="sticky top-8 glass rounded-2xl p-2 h-[850px] overflow-hidden flex flex-col items-center custom-scrollbar">
                        <div className="bg-white/5 border-b border-white/10 p-4 rounded-t-xl w-full flex justify-between items-center mb-4 shrink-0">
                            <span className="text-sm font-medium text-gray-300 flex items-center gap-2"><svg className="w-4 h-4 text-[#00f2fe]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> Live Document Preview</span>
                            <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full uppercase tracking-wider font-bold">{invoice.template_style}</span>
                        </div>
                        <div className="flex-1 w-full overflow-y-auto pb-12 flex justify-center custom-scrollbar relative">
                            {renderTemplate()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateInvoice;
