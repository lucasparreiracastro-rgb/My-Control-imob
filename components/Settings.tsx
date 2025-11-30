
import React, { useRef, useState, useEffect } from 'react';
import { Property } from '../types';
import { Download, Upload, Database, AlertCircle, Check, Settings as SettingsIcon, Save, Cloud, RefreshCw, LogOut, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

interface SettingsProps {
  properties: Property[];
  onRestoreData: (data: { properties: Property[] }) => void;
}

const Settings: React.FC<SettingsProps> = ({ properties, onRestoreData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Google Drive States
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastCloudBackup, setLastCloudBackup] = useState<string | null>(null);

  // Simulates automatic backup when properties change (if enabled)
  useEffect(() => {
    if (isDriveConnected && autoBackupEnabled && properties.length > 0) {
      // Debounce simulation
      const timer = setTimeout(() => {
        handleCloudBackup(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [properties, isDriveConnected, autoBackupEnabled]);

  const handleBackup = () => {
    const data = {
      properties,
      backupDate: new Date().toISOString(),
      version: '1.0'
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `imobcontrol_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const data = JSON.parse(jsonContent);

        if (data.properties && Array.isArray(data.properties)) {
          onRestoreData({
            properties: data.properties
          });
          setRestoreStatus('success');
          setTimeout(() => setRestoreStatus('idle'), 3000);
        } else {
          throw new Error('Formato de arquivo inválido');
        }
      } catch (error) {
        console.error("Erro ao restaurar backup:", error);
        setRestoreStatus('error');
        setTimeout(() => setRestoreStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConnectDrive = () => {
    setIsSyncing(true);
    // Simulate OAuth delay
    setTimeout(() => {
        setIsDriveConnected(true);
        setIsSyncing(false);
    }, 1500);
  };

  const handleDisconnectDrive = () => {
    setIsDriveConnected(false);
    setAutoBackupEnabled(false);
    setLastCloudBackup(null);
  };

  const handleCloudBackup = (silent = false) => {
    if (!isDriveConnected) return;
    
    if (!silent) setIsSyncing(true);
    
    // Simulate upload delay
    setTimeout(() => {
        setLastCloudBackup(new Date().toLocaleString('pt-BR'));
        if (!silent) setIsSyncing(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gray-800 p-2 rounded-lg">
            <SettingsIcon className="text-white w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Google Drive Integration (Full Width on Mobile, First on Desktop) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
           <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className="bg-green-100 p-3 rounded-full">
                        <Cloud className="text-green-600 w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            Backup em Nuvem
                            <span className="text-xs font-normal px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">Google Drive</span>
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Mantenha seus dados seguros sincronizando automaticamente com sua conta Google.
                        </p>
                    </div>
                </div>
                {isDriveConnected && (
                    <button 
                        onClick={handleDisconnectDrive}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Desconectar conta"
                    >
                        <LogOut size={20} />
                    </button>
                )}
           </div>

           <div className="mt-6 border-t pt-6">
                {!isDriveConnected ? (
                    <div className="flex flex-col items-center justify-center py-4">
                        <button 
                            onClick={handleConnectDrive}
                            disabled={isSyncing}
                            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-6 rounded-lg shadow-sm flex items-center gap-3 transition-all"
                        >
                            {isSyncing ? <Loader2 className="animate-spin w-5 h-5 text-gray-500" /> : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.6l3.89 3.01c2.28-2.09 3.61-5.18 3.61-8.85z"></path>
                                    <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.07 7.96-2.93l-3.89-3.01c-1.07.72-2.43 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"></path>
                                    <path fill="#FBBC05" d="M5.525 14.25c-.25-.72-.38-1.49-.38-2.25s.14-1.53.38-2.25v-3.09h-3.98C.435 8.66 0 10.28 0 12c0 1.72.435 3.34 1.545 5.34l3.98-3.09z"></path>
                                    <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.545 6.66l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"></path>
                                </svg>
                            )}
                            Conectar Google Drive
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-sm text-green-800 font-medium">Conta Conectada: usuario@gmail.com</span>
                             </div>
                             {lastCloudBackup && (
                                <span className="text-xs text-green-600">Último backup: {lastCloudBackup}</span>
                             )}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                                    className={`transition-colors ${autoBackupEnabled ? 'text-blue-600' : 'text-gray-400'}`}
                                >
                                    {autoBackupEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                                </button>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">Backup Automático</p>
                                    <p className="text-xs text-gray-500">Salvar alterações automaticamente</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleCloudBackup()}
                                disabled={isSyncing}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                            >
                                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                            </button>
                        </div>
                    </div>
                )}
           </div>
        </div>

        {/* Local Backup Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Download className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Backup Local</h3>
              <p className="text-sm text-gray-500 mt-1">
                Salve um arquivo .JSON no seu dispositivo.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Imóveis Cadastrados:</span>
              <span className="font-bold">{properties.length}</span>
            </div>
          </div>

          <button 
            onClick={handleBackup}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Save size={18} />
            Baixar Backup Local
          </button>
        </div>

        {/* Restore Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <Upload className="text-purple-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Restaurar Dados</h3>
              <p className="text-sm text-gray-500 mt-1">
                Recupere dados de um arquivo local.
                <br/>
                <span className="text-red-500 font-medium text-xs">Substitui os dados atuais.</span>
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <Database className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Clique para selecionar o arquivo</p>
            <p className="text-xs text-gray-400 mt-1">Formato .JSON</p>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
            />
          </div>

          {restoreStatus === 'success' && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm border border-green-100">
              <Check size={16} />
              Backup restaurado com sucesso!
            </div>
          )}

          {restoreStatus === 'error' && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={16} />
              Erro ao ler arquivo. Verifique o formato.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
