import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
    const [settings, setSettings] = useState({
        business_name: '',
        business_email: '',
        business_logo: '',
        business_phone: '',
        business_address: '',
        business_tax_number: '',
        default_terms: '',
        payment_methods_enabled: { bank_transfer: false, paypal: false, crypto: false },
        payment_instructions: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/api/settings/`)
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch settings:", err);
                toast.error("Failed to load settings from server.");
                setIsLoading(false);
            });
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.startsWith('pm_')) {
            const method = name.replace('pm_', '');
            setSettings(prev => ({
                ...prev,
                payment_methods_enabled: {
                    ...(prev.payment_methods_enabled || {}),
                    [method]: checked
                }
            }));
        } else {
            setSettings(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({ ...prev, business_logo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const toastId = toast.loading('Saving settings...');
        try {
            const res = await fetch(`${API_URL}/api/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                toast.success('Settings saved successfully.', { id: toastId });
            } else {
                toast.error('Failed to save settings.', { id: toastId });
            }
        } catch (err) {
            toast.error('Network error.', { id: toastId });
        } finally {
            setIsSaving(false);
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
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold heading-gradient mb-2">Business Settings</h1>
                <p className="text-gray-400">Configure your business profile to be used across invoices and contracts.</p>
            </div>

            <form onSubmit={handleSubmit} className="glass p-8 rounded-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Business Name</label>
                        <input
                            type="text"
                            name="business_name"
                            value={settings.business_name}
                            onChange={handleChange}
                            className="glass-input w-full"
                            placeholder="e.g. Acme Corp"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Business Email</label>
                        <input
                            type="email"
                            name="business_email"
                            value={settings.business_email}
                            onChange={handleChange}
                            className="glass-input w-full"
                            placeholder="e.g. contact@acme.com"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Business Phone</label>
                        <input
                            type="tel"
                            name="business_phone"
                            value={settings.business_phone || ''}
                            onChange={handleChange}
                            className="glass-input w-full"
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Tax Number / VAT</label>
                        <input
                            type="text"
                            name="business_tax_number"
                            value={settings.business_tax_number || ''}
                            onChange={handleChange}
                            className="glass-input w-full"
                            placeholder="XX-XXXXXXX"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Business Address</label>
                    <textarea
                        name="business_address"
                        value={settings.business_address || ''}
                        onChange={handleChange}
                        className="glass-input w-full h-20 resize-none"
                        placeholder="123 Corporate Blvd&#10;Suite 100&#10;City, State 12345"
                    />
                </div>

                <div className="space-y-4 bg-white/5 p-5 rounded-xl border border-white/5">
                    <label className="text-sm font-medium text-gray-300 block mb-2">Business Logo</label>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="w-24 h-24 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                            {settings.business_logo ? (
                                <img src={settings.business_logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="text-gray-500 text-xs text-center p-2 font-medium">No Logo</div>
                            )}
                        </div>

                        <div className="space-y-4 flex-1 w-full">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-semibold">Upload Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="block w-full text-sm text-gray-300
                                        file:mr-4 file:py-2.5 file:px-4
                                        file:rounded-lg file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-white/10 file:text-white
                                        hover:file:bg-white/20 hover:file:shadow-lg
                                        transition-all cursor-pointer ring-1 ring-white/10 rounded-lg bg-black/20"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-transparent px-2 text-xs text-gray-500 uppercase font-semibold bg-[#111] backdrop-blur-md">Or use URL</span>
                                </div>
                            </div>

                            <div>
                                <input
                                    type="url"
                                    name="business_logo"
                                    value={settings.business_logo}
                                    onChange={handleChange}
                                    className="glass-input w-full text-sm"
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Default Terms & Conditions</label>
                    <textarea
                        name="default_terms"
                        value={settings.default_terms}
                        onChange={handleChange}
                        className="glass-input w-full h-32 resize-none"
                        placeholder="These terms will automatically appear on your invoices and contracts..."
                    />
                </div>


                <div className="pt-6 border-t border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Email (SMTP) Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">SMTP Host</label>
                            <input
                                type="text"
                                name="smtp_host"
                                value={settings.smtp_host || ''}
                                onChange={handleChange}
                                className="glass-input w-full"
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">SMTP Port</label>
                            <input
                                type="number"
                                name="smtp_port"
                                value={settings.smtp_port || 587}
                                onChange={handleChange}
                                className="glass-input w-full"
                                placeholder="587"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">SMTP User</label>
                            <input
                                type="text"
                                name="smtp_user"
                                value={settings.smtp_user || ''}
                                onChange={handleChange}
                                className="glass-input w-full"
                                placeholder="user@gmail.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">SMTP Password</label>
                            <input
                                type="password"
                                name="smtp_password"
                                value={settings.smtp_password || ''}
                                onChange={handleChange}
                                className="glass-input w-full"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/10">
                    <button type="submit" disabled={isSaving} className="glass-button flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;



