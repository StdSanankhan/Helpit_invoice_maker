import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, BarChart2, PlusCircle, X, Zap, ShieldAlert } from 'lucide-react';

const Sidebar = ({ closeSidebar }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Create Invoice', path: '/create-invoice', icon: PlusCircle },
    { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 glass-sidebar h-full flex flex-col relative z-30 transition-all duration-300">
      <div className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold heading-gradient tracking-wide">Helpit</h1>
        <button className="text-gray-400 hover:text-white" onClick={closeSidebar}>
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="px-6 flex-1">
        <nav className="space-y-4 pt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/20 text-neon border border-primary/30 shadow-[0_0_15px_rgba(0,242,254,0.1)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="mt-auto p-6 space-y-4">
        <NavLink 
          to="/upgrade" 
          onClick={closeSidebar}
          className={({ isActive }) => `flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold transition-all ${isActive ? 'bg-gradient-to-r from-primary to-neon text-black shadow-[0_0_20px_rgba(0,242,254,0.4)]' : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'}`}
        >
          <Zap className="w-4 h-4 fill-current" /> Upgrade to Pro
        </NavLink>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-sm text-gray-400 text-center">
          <p className="mb-1 font-medium text-white">Helpit SaaS Beta</p>
          <p className="text-xs opacity-60">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
