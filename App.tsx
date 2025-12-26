import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Building2, MessageSquareText, LogOut, Menu, X, Settings as SettingsIcon, Lock, User, Key, ChevronRight } from 'lucide-react';
import { ViewState, Property } from './types';
import { MOCK_PROPERTIES } from './constants';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import ChatAssistant from './components/ChatAssistant';
import Settings from './components/Settings';

const App: React.FC = () => {
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // App State
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // Initialize properties from LocalStorage if available, otherwise use Mock data
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const savedData = localStorage.getItem('imobcontrol_data');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Failed to load data from storage:', error);
    }
    return MOCK_PROPERTIES;
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Save to LocalStorage whenever properties change
  useEffect(() => {
    localStorage.setItem('imobcontrol_data', JSON.stringify(properties));
  }, [properties]);

  // Sidebar Menu Items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Imóveis', icon: Building2 },
    { id: 'ai-chat', label: 'Corretor AI', icon: MessageSquareText },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Lista de usuários permitidos
    const validUsers = [
      { user: 'Parreira', pass: '1234' },
      { user: 'Lucas', pass: '12345' },
      { user: 'Vitor', pass: '12345' }
    ];

    const matchedUser = validUsers.find(
      u => u.user.toLowerCase() === loginUser.toLowerCase() && u.pass === loginPass
    );

    if (matchedUser) {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginUser('');
    setLoginPass('');
    setCurrentView('dashboard');
  };

  const handleAddProperty = (newProperty: Property) => {
    setProperties(prev => [newProperty, ...prev]);
  };

  const handleUpdateProperty = (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
  };

  const handleDeleteProperty = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este imóvel permanentemente?')) {
      setProperties(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleRestoreData = (data: { properties: Property[] }) => {
    if (window.confirm('Tem certeza? Isso substituirá todos os dados atuais pelos dados do backup.')) {
        setProperties(data.properties);
        alert('Dados restaurados com sucesso!');
    }
  };

  // Login Screen Component
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
          <div className="bg-blue-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
               <Building2 className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white">ImobControl AI</h1>
            <p className="text-blue-100 text-sm mt-2">Sistema de Gestão Imobiliária Inteligente</p>
          </div>
          
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Acesso Restrito</h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                  {loginError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 ml-1">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Digite seu usuário"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 ml-1">Senha</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="password" 
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Digite sua senha"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 mt-2"
              >
                Entrar no Sistema
                <ChevronRight size={18} />
              </button>
            </form>
          </div>
          <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
            &copy; 2024 ImobControl AI. Todos os direitos reservados.
          </div>
        </div>
      </div>
    );
  }

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
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
        >
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#111827] transform transition-transform duration-300 ease-in-out print:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* Top Header Mobile */}
        <header className="bg-white p-4 border-b flex items-center justify-between lg:hidden shadow-sm z-30 print:hidden">
          <h1 className="font-bold text-gray-800">ImobControl AI</h1>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* View Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 print:overflow-visible print:p-0">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full">
            {currentView === 'dashboard' && <Dashboard properties={properties} />}
            {currentView === 'properties' && (
              <Properties 
                properties={properties} 
                onAddProperty={handleAddProperty} 
                onUpdateProperty={handleUpdateProperty}
                onDeleteProperty={handleDeleteProperty}
              />
            )}
            {currentView === 'ai-chat' && <ChatAssistant properties={properties} />}
            {currentView === 'settings' && (
              <Settings 
                properties={properties} 
                onRestoreData={handleRestoreData}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;