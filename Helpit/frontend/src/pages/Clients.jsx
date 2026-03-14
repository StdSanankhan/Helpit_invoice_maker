import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, Phone, MapPin, Building, Trash2, Edit2, AlertCircle } from 'lucide-react';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState({ name: '', company: '', email: '', phone: '', address: '' });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    const fetchClients = () => {
        setLoading(true);
        fetch('http://localhost:8000/api/clients/')
            .then(res => res.json())
            .then(data => {
                setClients(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch clients:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentClient(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage(null);
        const isEditing = !!currentClient.id;
        const url = isEditing 
            ? `http://localhost:8000/api/clients/${currentClient.id}`
            : 'http://localhost:8000/api/clients/';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentClient)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `Client successfully ${isEditing ? 'updated' : 'added'}!` });
                setIsModalOpen(false);
                fetchClients();
            } else {
                setMessage({ type: 'error', text: 'Failed to save client.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error.' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this client?")) return;
        try {
            const res = await fetch(`http://localhost:8000/api/clients/${id}`, { method: 'DELETE' });
            if (res.ok) fetchClients();
        } catch (err) {
            console.error(err);
        }
    };

    const openModal = (client = null) => {
        setCurrentClient(client || { name: '', company: '', email: '', phone: '', address: '' });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold heading-gradient mb-2 flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" /> Client Management
                    </h1>
                    <p className="text-gray-400">Manage your contacts, companies, and billing details.</p>
                </div>
                <button 
                    onClick={() => openModal()} 
                    className="glass-button flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Client
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <AlertCircle className="w-5 h-5" />
                    <p>{message.text}</p>
                </div>
            )}

            {loading ? (
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-white/10 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-white/10 rounded"></div>
                            <div className="h-4 bg-white/10 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            ) : clients.length === 0 ? (
                <div className="text-center py-20 glass rounded-2xl">
                    <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No clients found</h3>
                    <p className="text-gray-400">Add your first client to get started with billing.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clients.map(client => (
                        <div key={client.id} className="glass p-6 rounded-2xl relative group hover:border-primary/50 transition-all">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(client)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(client.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-1 pr-16 truncate">{client.name}</h3>
                            {client.company && (
                                <p className="text-sm font-medium text-neon flex items-center gap-1.5 mb-4 truncate">
                                    <Building className="w-3.5 h-3.5" /> {client.company}
                                </p>
                            )}
                            
                            <div className="space-y-2 mt-4 text-sm text-gray-400">
                                {client.email && (
                                    <p className="flex items-center gap-2 truncate">
                                        <Mail className="w-4 h-4 text-gray-500" /> {client.email}
                                    </p>
                                )}
                                {client.phone && (
                                    <p className="flex items-center gap-2 truncate">
                                        <Phone className="w-4 h-4 text-gray-500" /> {client.phone}
                                    </p>
                                )}
                                {client.address && (
                                    <p className="flex items-start gap-2 truncate">
                                        <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" /> 
                                        <span className="truncate">{client.address}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass p-8 rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {currentClient.id ? 'Edit Client' : 'Add New Client'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Full Name</label>
                                <input required type="text" name="name" value={currentClient.name} onChange={handleChange} className="glass-input w-full" placeholder="Jane Doe" />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Company (Optional)</label>
                                <input type="text" name="company" value={currentClient.company} onChange={handleChange} className="glass-input w-full" placeholder="Acme Corp" />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Email</label>
                                <input type="email" name="email" value={currentClient.email} onChange={handleChange} className="glass-input w-full" placeholder="jane@acme.com" />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Phone</label>
                                <input type="tel" name="phone" value={currentClient.phone} onChange={handleChange} className="glass-input w-full" placeholder="+1 (555) 000-0000" />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Address</label>
                                <textarea name="address" value={currentClient.address} onChange={handleChange} className="glass-input w-full h-20 resize-none" placeholder="123 Main St..." />
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="glass-button text-sm py-2">
                                    {currentClient.id ? 'Save Changes' : 'Add Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
