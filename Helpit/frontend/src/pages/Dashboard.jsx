import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, TrendingUp, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({
        invoicesCreated: 0,
        totalRevenue: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        recentInvoices: [],
        uniqueClients: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const invRes = await fetch('http://localhost:8000/api/invoices/').then(r => r.json());
                
                const sortedInvoices = [...invRes].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                
                let revenue = 0;
                let paid = 0;
                let pending = 0;
                const clients = new Set();

                invRes.forEach(inv => {
                    if (inv.client_id || inv.client_name) clients.add(inv.client_id || inv.client_name);
                    const status = inv.status || 'Draft';
                    if (status === 'Paid') {
                        paid++;
                        revenue += parseFloat(inv.total) || 0;
                    } else if (status === 'Sent' || status === 'Draft') {
                        pending++;
                    }
                });

                setStats({
                    invoicesCreated: invRes.length,
                    totalRevenue: revenue,
                    paidInvoices: paid,
                    pendingInvoices: pending,
                    recentInvoices: sortedInvoices.slice(0, 5),
                    uniqueClients: clients.size
                });
            } catch (err) {
                console.error("Failed to load dashboard data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
        <div className="glass p-6 rounded-2xl flex items-center justify-between hover:scale-[1.02] transition-transform duration-300">
            <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-white">{value}</h3>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-4 rounded-xl bg-white/5 ${colorClass}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );

    const getStatusBadge = (status) => {
        const s = status?.toLowerCase() || 'draft';
        if (s === 'paid') return <span className="text-[10px] px-2 py-1 bg-green-500/20 text-green-500 rounded-full">PAID</span>;
        if (s === 'sent') return <span className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-500 rounded-full">SENT</span>;
        if (s === 'overdue') return <span className="text-[10px] px-2 py-1 bg-red-500/20 text-red-500 rounded-full">OVERDUE</span>;
        return <span className="text-[10px] px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded-full">DRAFT</span>;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold heading-gradient mb-2">Dashboard Overview</h1>
                    <p className="text-gray-400">Welcome back. Here's your business at a glance.</p>
                </div>
                <div className="flex gap-4">
                    <NavLink to="/invoices/new" className="glass-button flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4" /> Create Invoice
                    </NavLink>
                </div>
            </div>

            {isLoading ? (
                 <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-white/10 rounded w-3/4"></div></div></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Monthly Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon={TrendingUp} colorClass="text-neon" subtitle="Collected from paid invoices" />
                        <StatCard title="Total Invoices" value={stats.invoicesCreated} icon={FileText} colorClass="text-blue-400" subtitle="Generated all time" />
                        <StatCard title="Paid Invoices" value={stats.paidInvoices} icon={CheckCircle} colorClass="text-green-400" subtitle="Successfully completed" />
                        <StatCard title="Pending Invoices" value={stats.pendingInvoices} icon={Clock} colorClass="text-yellow-400" subtitle="Drafts and sent invoices" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 glass p-6 rounded-2xl flex flex-col h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-400"/> Recent Invoices
                                </h3>
                            </div>
                            <div className="space-y-4 flex-1">
                                {stats.recentInvoices.length === 0 ? (
                                    <p className="text-gray-500 text-sm text-center py-8">No invoices created yet.</p>
                                ) : (
                                    stats.recentInvoices.map(inv => (
                                        <div key={inv.id} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <div>
                                                <p className="font-medium text-white">{inv.invoice_number || 'Draft'} - {inv.client_name}</p>
                                                <p className="text-xs text-gray-400">Created: {new Date(inv.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <p className="font-bold text-white">${(parseFloat(inv.total) || 0).toFixed(2)}</p>
                                                {getStatusBadge(inv.status)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <NavLink to="/invoices" className="mt-6 text-center text-sm text-primary hover:text-neon transition-colors">View all invoices &rarr;</NavLink>
                        </div>

                        <div className="glass p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-2">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">{stats.uniqueClients}</h3>
                            <p className="text-gray-400 text-sm mb-6">Active Clients</p>
                            <NavLink to="/clients" className="glass-button-secondary text-sm w-full">Manage Clients</NavLink>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
