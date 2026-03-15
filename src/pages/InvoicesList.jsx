import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, Search, Plus, Filter, Play, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const InvoicesList = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [settings, setSettings] = useState(null);
    const [downloadingInvoice, setDownloadingInvoice] = useState(null);

    useEffect(() => {
        fetch(`${API_URL}/api/settings/`)
            .then(res => res.json())
            .then(data => setSettings(data))
            .catch(console.error);
            
        fetch(`${API_URL}/api/invoices/`)
            .then(res => res.json())
            .then(data => {
                const sorted = [...data].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                setInvoices(sorted);
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = 
            (inv.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (inv.invoice_number?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'All' || (inv.status || 'Draft').toLowerCase() === filterStatus.toLowerCase();
        
        return matchesSearch && matchesStatus;
    });

    const handleStatusChange = async (invoiceId, newStatus) => {
        try {
            const res = await fetch(`${API_URL}/api/invoices/${invoiceId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setInvoices(invoices.map(inv => inv.id === invoiceId ? { ...inv, status: newStatus } : inv));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const triggerDownload = (invoice) => {
        setDownloadingInvoice(invoice);
    };

    useEffect(() => {
        if (downloadingInvoice && settings) {
            setTimeout(() => {
                const element = document.getElementById('hidden-invoice-preview');
                const opt = {
                    margin: 0,
                    filename: `${downloadingInvoice.invoice_number || 'Draft'}_${downloadingInvoice.client_name || 'Invoice'}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save().then(() => {
                    setDownloadingInvoice(null);
                });
            }, 100);
        }
    }, [downloadingInvoice, settings]);

    const calculateInvoiceTotals = (inv) => {
        let subtotal = 0;
        let taxTotal = 0;
        (inv.items || []).forEach(item => {
            const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            subtotal += itemTotal;
            taxTotal += itemTotal * ((parseFloat(item.tax_rate) || 0) / 100);
        });
        const discountVal = parseFloat(inv.discount) || 0;
        return { subtotal, taxTotal, grandTotal: Math.max(0, subtotal + taxTotal - discountVal) };
    };

    const renderTemplate = (inv) => {
        const s = inv.template_style || 'modern';
        const b = settings || {};
        const { subtotal, taxTotal, grandTotal } = calculateInvoiceTotals(inv);
        
        if (s === 'corporate') {
            return (
                <div id="hidden-invoice-preview" className="bg-white text-gray-900 w-[210mm] min-h-[297mm] shadow-2xl p-12 font-serif">
                    <div className="flex border-b-[6px] border-[#0f172a] pb-8 mb-8 relative">
                        {b.business_logo && <img src={b.business_logo} crossOrigin="anonymous" alt="Logo" className="max-h-20 absolute top-0 left-0" onError={(e) => e.target.style.display = 'none'} />}
                        <div className="w-full text-right ml-[100px]">
                            <h2 className="text-4xl font-extrabold text-[#0f172a] uppercase tracking-wider mb-1">INVOICE</h2>
                            <p className="text-xl font-bold text-gray-700">{inv.invoice_number}</p>
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
                            <p className="font-bold">{inv.client_name || 'Client Name'}</p>
                            <p>{inv.client_email}</p>
                            <div className="mt-4 grid grid-cols-2 gap-x-4">
                                <p className="font-bold text-gray-500">Invoice Date:</p>
                                <p className="text-right">{new Date(inv.created_at || Date.now()).toLocaleDateString()}</p>
                                <p className="font-bold text-gray-500">Due Date:</p>
                                <p className="text-right">{inv.due_date || 'N/A'}</p>
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
                            {(inv.items || []).map((item, i) => (
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
                            {parseFloat(inv.discount) > 0 && (
                                <div className="flex justify-between text-red-600 mb-2"><span>Discount</span><span>-${parseFloat(inv.discount).toFixed(2)}</span></div>
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
                <div id="hidden-invoice-preview" className="bg-white text-gray-800 w-[210mm] min-h-[297mm] shadow-2xl p-16 font-sans tracking-tight">
                    <div className="flex justify-between items-end mb-24">
                        <h1 className="text-6xl font-light tracking-tighter text-gray-900 border-l-[12px] border-gray-900 pl-4">INVOICE</h1>
                        <p className="text-2xl font-light text-gray-400">{inv.invoice_number}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-16 mb-24">
                        <div>
                            {b.business_logo && <img src={b.business_logo} crossOrigin="anonymous" alt="Logo" className="max-h-12 mb-6" onError={(e) => e.target.style.display = 'none'} />}
                            <h3 className="font-semibold text-lg">{b.business_name}</h3>
                            <p className="text-gray-500 whitespace-pre-wrap">{[b.business_address, b.business_email, b.business_phone].filter(Boolean).join('\n')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Billed To</p>
                            <h3 className="font-semibold text-lg">{inv.client_name}</h3>
                            <p className="text-gray-500">{inv.client_email}</p>
                            <div className="mt-8 space-y-1 text-sm">
                                <p><span className="text-gray-400">Date:</span> {new Date(inv.created_at || Date.now()).toLocaleDateString()}</p>
                                <p><span className="text-gray-400">Due:</span> {inv.due_date}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 mb-24">
                        {(inv.items || []).map((item, i) => (
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
                        <div className="w-1/2 text-sm text-gray-400 whitespace-pre-wrap">{inv.notes}</div>
                        <div className="w-1/3 space-y-2 text-right">
                            <p className="text-gray-500">Subtotal: ${subtotal.toFixed(2)}</p>
                            <p className="text-gray-500">Tax: ${taxTotal.toFixed(2)}</p>
                            {parseFloat(inv.discount) > 0 && <p className="text-gray-500">Discount: -${parseFloat(inv.discount).toFixed(2)}</p>}
                            <p className="text-3xl font-light text-gray-900 mt-4">${grandTotal.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            );
        }

        // Default 'modern'
        return (
            <div id="hidden-invoice-preview" className="bg-white text-gray-900 w-[210mm] min-h-[297mm] shadow-2xl p-12">
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
                        <p className="text-xl font-medium text-gray-700 mb-4">{inv.invoice_number}</p>
                        <p className="font-semibold text-gray-800">Date: <span className="font-normal text-gray-600">{new Date(inv.created_at || Date.now()).toLocaleDateString()}</span></p>
                        <p className="font-semibold text-gray-800">Due: <span className="font-normal text-gray-600">{inv.due_date || 'N/A'}</span></p>
                    </div>
                </div>

                <div className="mb-12 bg-blue-50/50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                    <p className="text-sm font-semibold tracking-widest text-blue-400 uppercase mb-2">Bill To</p>
                    <h3 className="text-xl font-bold text-gray-800">{inv.client_name || 'Client Name'}</h3>
                    <p className="text-gray-600">{inv.client_email || 'client@email.com'}</p>
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
                        {(inv.items || []).map((item, i) => (
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
                        {parseFloat(inv.discount) > 0 && (
                            <div className="flex justify-between text-blue-500 font-medium"><span>Discount</span><span>-${parseFloat(inv.discount).toFixed(2)}</span></div>
                        )}
                        <div className="flex justify-between text-2xl font-bold text-gray-800 border-t-2 border-gray-800 pt-3 mt-3">
                            <span>Total</span><span>${grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {inv.notes && (
                    <div className="border-t border-gray-200 pt-8 mt-auto">
                        <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase mb-2">Terms & Notes</p>
                        <p className="text-gray-600 text-sm whitespace-pre-wrap">{inv.notes}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            {downloadingInvoice && settings && (
                <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                    {renderTemplate(downloadingInvoice)}
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold heading-gradient mb-2 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" /> Invoice Manager
                    </h1>
                    <p className="text-gray-400">Search, filter, and track all your billed invoices.</p>
                </div>
                <NavLink to="/invoices/new" className="glass-button flex items-center gap-2 shrink-0">
                    <Plus className="w-4 h-4" /> Create Invoice
                </NavLink>
            </div>

            <div className="glass p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Search by client or invoice #..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="glass-input w-full pl-10"
                    />
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="glass-input py-2 text-sm w-full md:w-48 appearance-none bg-black/50"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Sent">Sent</option>
                        <option value="Overdue">Overdue</option>
                        <option value="Draft">Draft</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="glass p-8 rounded-2xl animate-pulse flex flex-col space-y-4">
                    <div className="h-10 bg-white/5 rounded"></div>
                    <div className="h-10 bg-white/5 rounded"></div>
                    <div className="h-10 bg-white/5 rounded"></div>
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-24 glass rounded-2xl">
                    <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No invoices found</h3>
                    <p className="text-gray-400">There are no invoices matching your current filters.</p>
                </div>
            ) : (
                <div className="glass rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-400 font-semibold">Invoice Details</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-400 font-semibold">Client</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-400 font-semibold">Date</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-400 font-semibold">Amount</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-400 font-semibold text-center">Status</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider text-gray-400 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="py-4 px-6">
                                            <p className="font-bold text-white text-sm">{inv.invoice_number || 'No Number'}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm text-gray-300 font-medium">{inv.client_name}</p>
                                            <p className="text-xs text-gray-500">{inv.client_email}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm text-gray-300">Created: {new Date(inv.created_at).toLocaleDateString()}</p>
                                            {inv.due_date && <p className="text-xs text-gray-500">Due: {new Date(inv.due_date).toLocaleDateString()}</p>}
                                        </td>
                                        <td className="py-4 px-6 font-bold text-neon">
                                            ${(parseFloat(inv.total) || 0).toFixed(2)}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <select 
                                                value={inv.status || 'Draft'}
                                                onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                                                className={`text-xs px-3 py-1.5 rounded-full font-medium appearance-none cursor-pointer outline-none border transition-colors ${
                                                    inv.status === 'Paid' ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:border-green-500/50' :
                                                    inv.status === 'Sent' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:border-blue-500/50' :
                                                    inv.status === 'Overdue' ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:border-red-500/50' :
                                                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:border-yellow-500/50'
                                                }`}
                                            >
                                                <option className="text-black" value="Draft">Draft</option>
                                                <option className="text-black" value="Sent">Sent</option>
                                                <option className="text-black" value="Paid">Paid</option>
                                                <option className="text-black" value="Overdue">Overdue</option>
                                            </select>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button 
                                                onClick={() => triggerDownload(inv)}
                                                className="p-2 text-primary hover:text-white bg-primary/10 hover:bg-primary border border-primary/20 rounded-lg transition-all"
                                                title="Download PDF"
                                                disabled={downloadingInvoice !== null}
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicesList;



