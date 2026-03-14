import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, BarChart2, PlusCircle } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Create Invoice', path: '/invoices/new', icon: PlusCircle },
    { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 glass-sidebar h-full hidden md:flex flex-col relative z-10 transition-all duration-300">
      <div className="p-6">
        <h1 className="text-2xl font-bold heading-gradient tracking-wide mb-8">Helpit</h1>
        <nav className="space-y-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
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
      
      <div className="mt-auto p-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-sm text-gray-400">
          <p className="mb-2">Helpit SaaS Beta</p>
          <p className="text-xs opacity-60">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
