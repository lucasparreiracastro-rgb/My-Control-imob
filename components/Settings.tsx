import React, { useRef, useState } from 'react';
import { Property } from '../types';
import { Download, Upload, Database, AlertCircle, Check, Settings as SettingsIcon, Save } from 'lucide-react';

interface SettingsProps {
  properties: Property[];
  onRestoreData: (data: { properties: Property[] }) => void;
}

const Settings: React.FC<SettingsProps> = ({ properties, onRestoreData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gray-800 p-2 rounded-lg">
            <SettingsIcon className="text-white w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Download className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Fazer Backup</h3>
              <p className="text-sm text-gray-500 mt-1">
                Salve todos os seus dados (imóveis e histórico financeiro) em um arquivo seguro no seu computador.
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
            Baixar Backup dos Dados
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
                Recupere seus dados a partir de um arquivo de backup (.json). 
                <br/>
                <span className="text-red-500 font-medium text-xs">Atenção: Isso substituirá os dados atuais.</span>
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