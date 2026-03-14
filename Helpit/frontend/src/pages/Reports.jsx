import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, FileText, CheckCircle, Clock } from 'lucide-react';

const Reports = () => {
    const [stats, setStats] = useState({ revenueData: [], statusData: [], summary: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:8000/api/invoices/')
            .then(res => res.json())
            .then(data => {
                // Process data for charts
                let totalRevenue = 0;
                let paidCount = 0;
                let pendingCount = 0;
                let overdueCount = 0;

                const monthlyRevenue = {};
                
                data.forEach(inv => {
                    const status = inv.status || 'Draft';
                    const amount = parseFloat(inv.total) || 0;
                    
                    if (status === 'Paid') {
                        paidCount++;
                        totalRevenue += amount;
                        
                        // Extract month roughly (assuming YYYY-MM-DD format in due_date or using created_at)
                        // Fallback to current month if due_date is missing
                        const dateStr = inv.due_date || new Date().toISOString();
                        try {
                            const dateObj = new Date(dateStr);
                            const month = dateObj.toLocaleString('default', { month: 'short' });
                            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amount;
                        } catch(e) {}
                    } else if (status === 'Sent' || status === 'Draft') {
                        pendingCount++;
                    } else if (status === 'Overdue') {
                        overdueCount++;
                    }
                });

                const revenueChartData = Object.keys(monthlyRevenue).map(key => ({
                    name: key,
                    total: monthlyRevenue[key]
                }));

                // Ensure at least some empty months if data is sparse
                if (revenueChartData.length === 0) {
                    revenueChartData.push({ name: 'Jan', total: 0 }, { name: 'Feb', total: 0 });
                }

                setStats({
                    revenueData: revenueChartData,
                    statusData: [
                        { name: 'Paid', value: paidCount, color: '#10b981' },
                        { name: 'Pending', value: pendingCount, color: '#f59e0b' },
                        { name: 'Overdue', value: overdueCount, color: '#ef4444' }
                    ],
                    summary: {
                        totalInvoices: data.length,
                        totalRevenue,
                        paidCount,
                        pendingCount
                    }
                });
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    if (loading) return <div className="animate-pulse flex h-64 w-full bg-white/5 rounded-2xl"></div>;

    const { summary, revenueData, statusData } = stats;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold heading-gradient mb-2">Reports & Analytics</h1>
                <p className="text-gray-400">Track your business performance and invoice statuses.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-24 h-24" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium mb-1">Total Revenue</p>
                    <h3 className="text-3xl font-bold text-white mb-2">${summary.totalRevenue.toFixed(2)}</h3>
                    <p className="text-xs text-green-400 font-medium">From paid invoices</p>
                </div>
                
                <div className="glass p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText className="w-24 h-24" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium mb-1">Total Invoices</p>
                    <h3 className="text-3xl font-bold text-white mb-2">{summary.totalInvoices}</h3>
                    <p className="text-xs text-neon font-medium">All time created</p>
                </div>

                <div className="glass p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle className="w-24 h-24" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium mb-1">Paid</p>
                    <h3 className="text-3xl font-bold text-white mb-2">{summary.paidCount}</h3>
                    <p className="text-xs text-green-400 font-medium">Successfully collected</p>
                </div>

                <div className="glass p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium mb-1">Pending/Overdue</p>
                    <h3 className="text-3xl font-bold text-white mb-2">{summary.pendingCount}</h3>
                    <p className="text-xs text-yellow-400 font-medium">Awaiting payment</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Monthly Revenue</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip 
                                    cursor={{fill: '#ffffff05'}}
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '0.5rem' }}
                                />
                                <Bar dataKey="total" fill="#00f2fe" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Invoice Status Distribution</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData.filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '0.5rem' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-3">
                        {statusData.map(item => (
                            <div key={item.name} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-gray-300">{item.name}</span>
                                </div>
                                <span className="text-white font-medium">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
