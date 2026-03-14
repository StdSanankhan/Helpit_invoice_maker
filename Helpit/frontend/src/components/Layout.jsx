import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} transition duration-300 ease-in-out z-30 flex`}>
         <Sidebar closeSidebar={closeSidebar} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative flex flex-col">
        {/* Header Menu */}
        <div className="flex items-center gap-4 p-4 border-b border-white/10 bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <button 
            onClick={toggleSidebar} 
            className="p-2 rounded-md hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-neon shrink-0"
          >
            {isSidebarOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
          <h1 className="text-xl font-bold heading-gradient">Helpit</h1>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
