import React, { useState } from 'react';
import { LayoutDashboard, Building2, MessageSquareText, Users, LogOut, Menu, X } from 'lucide-react';
import { ViewState, Property } from './types';
import { MOCK_PROPERTIES, MOCK_LEADS } from './constants';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import ChatAssistant from './components/ChatAssistant';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sidebar Menu Items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Imóveis', icon: Building2 },
    { id: 'ai-chat', label: 'Corretor AI', icon: MessageSquareText },
    { id: 'leads', label: 'Clientes', icon: Users },
  ];

  const handleAddProperty = (newProperty: Property) => {
    setProperties(prev => [newProperty, ...prev]);
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm">IC</span>
          ImobControl
        </h1>
        <p className="text-xs text-gray-500 mt-1 pl-10">Inteligência Imobiliária</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as ViewState);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors">
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#f3f4f6]">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#111827] transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Mobile */}
        <header className="bg-white p-4 border-b flex items-center justify-between lg:hidden shadow-sm z-30">
          <h1 className="font-bold text-gray-800">ImobControl AI</h1>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* View Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && <Dashboard properties={properties} leads={MOCK_LEADS} />}
            {currentView === 'properties' && <Properties properties={properties} onAddProperty={handleAddProperty} />}
            {currentView === 'ai-chat' && <ChatAssistant properties={properties} />}
            {currentView === 'leads' && (
              <div className="space-y-6">
                 <h2 className="text-2xl font-bold text-gray-800">Clientes (Leads)</h2>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-4 text-sm font-semibold text-gray-600">Nome</th>
                          <th className="p-4 text-sm font-semibold text-gray-600 hidden md:table-cell">Contato</th>
                          <th className="p-4 text-sm font-semibold text-gray-600">Interesse</th>
                          <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_LEADS.map(lead => (
                          <tr key={lead.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="p-4">
                              <p className="font-medium text-gray-800">{lead.name}</p>
                              <p className="text-xs text-gray-500 md:hidden">{lead.email}</p>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                              <p className="text-sm text-gray-800">{lead.email}</p>
                              <p className="text-xs text-gray-500">{lead.phone}</p>
                            </td>
                            <td className="p-4 text-sm text-gray-600">{lead.interest}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                ${lead.status === 'Novo' ? 'bg-blue-100 text-blue-700' : 
                                  lead.status === 'Fechado' ? 'bg-green-100 text-green-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                {lead.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;