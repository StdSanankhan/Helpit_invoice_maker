import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Activity, FileText, CheckCircle, XCircle, Clock, Search, ShieldAlert, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [users, setUsers] = useState([]);
    const [payments, setPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [analyticsRes, usersRes, paymentsRes] = await Promise.all([
                fetch('http://localhost:8000/api/admin/analytics').then(r => r.json()),
                fetch('http://localhost:8000/api/admin/users').then(r => r.json()),
                fetch('http://localhost:8000/api/admin/payments/pending').then(r => r.json())
            ]);
            
            setAnalytics(analyticsRes);
            setUsers(usersRes);
            setPayments(paymentsRes);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load admin data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePaymentAction = async (paymentId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this payment?`)) return;

        const toastId = toast.loading(`Processing payment ${action}...`);
        try {
            const res = await fetch(`http://localhost:8000/api/admin/payments/${paymentId}/${action}`, {
                method: 'POST'
            });

            if (res.ok) {
                toast.success(`Payment successfully ${action}d!`, { id: toastId });
                fetchData(); // Refresh all data
            } else {
                toast.error(`Failed to ${action} payment.`, { id: toastId });
            }
        } catch (error) {
            toast.error("Network error.", { id: toastId });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-neon" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldAlert className="text-red-500 w-8 h-8" /> Admin Portal
                    </h1>
                    <p className="text-gray-400 mt-2">Manage platform analytics, users, and subscription upgrades.</p>
                </div>
                
                <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
                    <button 
                        onClick={() => setActiveTab('overview')} 
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')} 
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Users
                    </button>
                    <button 
                        onClick={() => setActiveTab('payments')} 
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'payments' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Payments {payments.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{payments.length}</span>}
                    </button>
                </div>
            </div>

            {/* TAG: OVERVIEW */}
            {activeTab === 'overview' && analytics && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="glass p-6 rounded-2xl border-t-2 border-t-primary">
                            <p className="text-gray-400 text-sm font-medium mb-1">Total Users</p>
                            <h3 className="text-3xl font-bold text-white flex items-center gap-2">
                                <Users className="w-6 h-6 text-primary" /> {analytics.total_users}
                            </h3>
                        </div>
                        <div className="glass p-6 rounded-2xl border-t-2 border-t-green-500">
                            <p className="text-gray-400 text-sm font-medium mb-1">Platform Revenue (All Time)</p>
                            <h3 className="text-3xl font-bold text-white flex items-center gap-2">
                                <DollarSign className="w-6 h-6 text-green-500" /> ${parseFloat(analytics.total_revenue).toFixed(2)}
                            </h3>
                        </div>
                        <div className="glass p-6 rounded-2xl border-t-2 border-t-yellow-500">
                            <p className="text-gray-400 text-sm font-medium mb-1">Premium Users</p>
                            <h3 className="text-3xl font-bold text-white flex items-center gap-2">
                                <ShieldAlert className="w-6 h-6 text-yellow-500" /> {analytics.premium_users ?? 0}
                            </h3>
                        </div>
                        <div className="glass p-6 rounded-2xl border-t-2 border-t-blue-500">
                            <p className="text-gray-400 text-sm font-medium mb-1">Invoices Generated Today</p>
                            <h3 className="text-3xl font-bold text-white flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-500" /> {analytics.invoices_today}
                            </h3>
                        </div>
                    </div>
                </div>
            )}

            {/* TAG: USERS */}
            {activeTab === 'users' && (
                <div className="glass rounded-3xl overflow-hidden animate-in fade-in duration-300">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h2 className="text-xl font-bold text-white">Platform Users</h2>
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type="text" placeholder="Search email..." className="glass-input pl-9 w-64 text-sm" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#0f172a]/50 text-gray-400">
                                <tr>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">ID / Email</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-center">Plan Status</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Expiry Date</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-8 text-gray-500">No users found.</td></tr>
                                ) : users.map(u => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-white">{u.email}</p>
                                            <p className="text-xs text-gray-500 font-mono mt-1">ID: {u.id}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {u.plan === 'premium' ? (
                                                <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Premium</span>
                                            ) : (
                                                <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1">Free</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {u.subscription_expiry ? new Date(u.subscription_expiry).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-gray-400 hover:text-white transition-colors text-xs border border-white/10 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10">Manage</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAG: PAYMENTS */}
            {activeTab === 'payments' && (
                <div className="glass rounded-3xl overflow-hidden animate-in fade-in duration-300">
                    <div className="p-6 border-b border-white/10 bg-white/5">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-yellow-500" /> Pending Upgrades
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Review payment proofs and activate premium access for these accounts.</p>
                    </div>
                    <div className="p-6">
                        {payments.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle className="w-12 h-12 text-green-500/50 mx-auto mb-4" />
                                <p className="text-lg text-white font-medium">All caught up!</p>
                                <p className="text-gray-500">No pending payments to review.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {payments.map(p => (
                                    <div key={p.id} className="bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between hover:border-white/20 transition-colors">
                                        
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-white text-lg">{p.email}</h3>
                                                <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-0.5 rounded uppercase font-bold tracking-widest border border-yellow-500/20">Pending Req</span>
                                            </div>
                                            <p className="text-gray-400 text-sm">Requested on {new Date(p.created_at).toLocaleString()}</p>
                                            <div className="flex gap-4 mt-2 mb-2">
                                                <p className="text-sm"><span className="text-gray-500">Method:</span> <span className="text-neon font-medium capitalize">{p.payment_method}</span></p>
                                                <p className="text-sm"><span className="text-gray-500">Amount:</span> <span className="text-white font-bold">${parseFloat(p.amount).toFixed(2)}</span></p>
                                            </div>
                                        </div>

                                        <div className="shrink-0 max-w-xs w-full bg-white/5 p-3 rounded-xl border border-white/10">
                                            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-semibold">Payment Proof</div>
                                            <a 
                                                href={`http://localhost:8000/api/admin/proof/${p.payment_proof}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block group"
                                            >
                                                <img 
                                                    src={`http://localhost:8000/api/admin/proof/${p.payment_proof}`}
                                                    alt="Payment proof"
                                                    className="w-full h-24 object-cover rounded-lg border border-white/10 group-hover:border-primary/30 transition-colors"
                                                    onError={e => { e.target.onerror=null; e.target.style.display='none'; }}
                                                />
                                                <p className="text-xs text-primary hover:text-neon mt-2 text-center transition-colors">Click to view full image ↗</p>
                                            </a>
                                        </div>

                                        <div className="flex flex-col gap-3 shrink-0">
                                            <button 
                                                onClick={() => handlePaymentAction(p.id, 'approve')}
                                                className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Approve & Upgrade
                                            </button>
                                            <button 
                                                onClick={() => handlePaymentAction(p.id, 'reject')}
                                                className="bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 text-gray-300 px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" /> Reject Payment
                                            </button>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
