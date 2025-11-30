
import React, { useState, useRef } from 'react';
import { Property, PropertyType, PropertyStatus, RentalRecord } from '../types';
import { extractRentalDataFromPdf } from '../services/geminiService';
import { Plus, Search, MapPin, Bed, Bath, Square, X, Check, Upload, FileText, Loader2, DollarSign, Trash2, Calendar, Save, ArrowRight } from 'lucide-react';

interface PropertiesProps {
  properties: Property[];
  onAddProperty: (property: Property) => void;
  onDeleteProperty: (id: string) => void;
  onUpdateProperty: (property: Property) => void;
}

const Properties: React.FC<PropertiesProps> = ({ properties, onAddProperty, onDeleteProperty, onUpdateProperty }) => {
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  
  // Filter State
  const [filter, setFilter] = useState('');
  
  // Add Property Form State
  const [formData, setFormData] = useState<Partial<Property>>({
    title: ''
  });

  // Manual Record State
  const [manualRecord, setManualRecord] = useState({
    checkIn: '',
    checkOut: '',
    description: '',
    amount: ''
  });

  // PDF Processing State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [extractedRecords, setExtractedRecords] = useState<RentalRecord[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(filter.toLowerCase()) || 
    p.address.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProperty: Property = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title || 'Novo Imóvel',
      description: 'Descrição pendente.',
      price: 0,
      type: PropertyType.APARTMENT,
      status: PropertyStatus.AVAILABLE,
      address: 'Endereço a definir',
      bedrooms: 0,
      bathrooms: 0,
      area: 0,
      imageUrl: 'https://picsum.photos/800/600',
      features: [],
      rentalHistory: []
    };
    onAddProperty(newProperty);
    setIsModalOpen(false);
    setFormData({ title: '' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleAddManualRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingProperty || !manualRecord.checkIn || !manualRecord.checkOut || !manualRecord.amount) return;

    const formattedCheckIn = formatDate(manualRecord.checkIn);
    const formattedCheckOut = formatDate(manualRecord.checkOut);

    const newRecord: RentalRecord = {
      date: formattedCheckIn, // Usa a data de check-in como data de referência
      checkIn: formattedCheckIn,
      checkOut: formattedCheckOut,
      description: manualRecord.description || 'Lançamento Manual',
      amount: parseFloat(manualRecord.amount)
    };

    const updatedProperty = {
      ...viewingProperty,
      rentalHistory: [newRecord, ...(viewingProperty.rentalHistory || [])]
    };

    onUpdateProperty(updatedProperty);
    setViewingProperty(updatedProperty); // Update local view
    setManualRecord({ checkIn: '', checkOut: '', description: '', amount: '' }); // Reset form
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, envie um arquivo PDF.');
      return;
    }

    setIsProcessingPdf(true);
    setExtractedRecords(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64Content = base64String.split(',')[1];
        
        const records = await extractRentalDataFromPdf(base64Content);
        setExtractedRecords(records);
        setIsProcessingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsProcessingPdf(false);
      alert('Erro ao processar o arquivo.');
    }
  };

  const handleConfirmRecords = () => {
    if (!extractedRecords || !selectedPropertyId) return;

    const property = properties.find(p => p.id === selectedPropertyId);
    if (property) {
      const updatedProperty = {
        ...property,
        rentalHistory: [...(property.rentalHistory || []), ...extractedRecords]
      };
      onUpdateProperty(updatedProperty);
      alert(`${extractedRecords.length} lançamentos adicionados ao histórico do imóvel!`);
    } else {
      alert('Imóvel não encontrado.');
    }

    setIsUploadModalOpen(false);
    setExtractedRecords(null);
    setSelectedPropertyId('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Meus Imóveis</h2>
        <div className="flex gap-2 w-full sm:w-auto">
           <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Upload size={20} />
            Importar Diárias (PDF)
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            Novo Imóvel
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Buscar por título ou endereço..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map(property => (
          <div 
            key={property.id} 
            onClick={() => setViewingProperty(property)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="relative h-48 overflow-hidden">
              <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              
              {/* Delete Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProperty(property.id);
                }}
                className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-sm z-10"
                title="Excluir imóvel"
              >
                <Trash2 size={16} />
              </button>

              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-gray-700">
                {property.status}
              </div>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{property.type}</span>
                <span className="text-lg font-bold text-gray-900">R$ {property.price.toLocaleString('pt-BR')}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1 truncate" title={property.title}>{property.title}</h3>
              <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
                <MapPin size={14} />
                <span className="truncate">{property.address}</span>
              </div>
              
              <div className="flex items-center justify-between border-t pt-4 text-gray-600 text-sm">
                <div className="flex items-center gap-1">
                  <Bed size={16} />
                  <span>{property.bedrooms}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath size={16} />
                  <span>{property.bathrooms}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Square size={16} />
                  <span>{property.area} m²</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal - Property Details */}
      {viewingProperty && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
             <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-2xl">
               <div>
                <h3 className="text-xl font-bold text-gray-800">{viewingProperty.title}</h3>
                <p className="text-sm text-gray-500">Histórico de Aluguéis e Diárias</p>
               </div>
               <button onClick={() => setViewingProperty(null)} className="text-gray-500 hover:text-gray-700">
                 <X size={24} />
               </button>
             </div>
             
             <div className="p-6 overflow-y-auto">
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-blue-600 text-sm font-medium">Total Arrecadado</p>
                        <p className="text-2xl font-bold text-blue-800">
                            R$ {viewingProperty.rentalHistory?.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <p className="text-purple-600 text-sm font-medium">Total de Registros</p>
                        <p className="text-2xl font-bold text-purple-800">
                            {viewingProperty.rentalHistory?.length || 0}
                        </p>
                    </div>
                </div>

                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                        <Plus size={16} className="text-blue-600" />
                        Novo Lançamento Manual
                    </h4>
                    <form onSubmit={handleAddManualRecord} className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-3">
                          <div className="flex-1 w-full">
                              <label className="text-xs text-gray-500 font-medium mb-1 block">Check-in</label>
                              <input 
                                  type="date" 
                                  required
                                  value={manualRecord.checkIn}
                                  onChange={(e) => setManualRecord({...manualRecord, checkIn: e.target.value})}
                                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                          <div className="flex-1 w-full">
                              <label className="text-xs text-gray-500 font-medium mb-1 block">Check-out</label>
                              <input 
                                  type="date" 
                                  required
                                  value={manualRecord.checkOut}
                                  onChange={(e) => setManualRecord({...manualRecord, checkOut: e.target.value})}
                                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                            <div className="flex-[2] w-full">
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Descrição</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Diária Airbnb"
                                    value={manualRecord.description}
                                    onChange={(e) => setManualRecord({...manualRecord, description: e.target.value})}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Valor (R$)</label>
                                <input 
                                    type="number" 
                                    placeholder="0,00"
                                    required
                                    step="0.01"
                                    min="0"
                                    value={manualRecord.amount}
                                    onChange={(e) => setManualRecord({...manualRecord, amount: e.target.value})}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <button type="submit" className="w-full md:w-auto p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                                <Save size={18} />
                            </button>
                        </div>
                    </form>
                </div>

                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Calendar size={18} />
                    Extrato de Lançamentos
                </h4>
                
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-semibold text-gray-600">Período / Data</th>
                                <th className="p-3 font-semibold text-gray-600">Descrição</th>
                                <th className="p-3 font-semibold text-gray-600 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {viewingProperty.rentalHistory && viewingProperty.rentalHistory.length > 0 ? (
                                viewingProperty.rentalHistory.map((record, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-800">
                                          {record.checkIn && record.checkOut ? (
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                              <span>{record.checkIn}</span>
                                              <ArrowRight size={12} className="text-gray-400" />
                                              <span>{record.checkOut}</span>
                                            </div>
                                          ) : (
                                            record.date
                                          )}
                                        </td>
                                        <td className="p-3 text-gray-600">{record.description}</td>
                                        <td className="p-3 text-gray-800 font-medium text-right text-green-600">
                                            + R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-500">
                                        Nenhum registro de aluguel ou diária encontrado para este imóvel.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
           </div>
         </div>
      )}

      {/* Modal - Add Property */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800">Adicionar Novo Imóvel</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Imóvel</label>
                <input 
                  required 
                  type="text" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                  placeholder="Ex: Apartamento no Centro"
                  value={formData.title || ''} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 font-medium">
                  <Check size={18} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Upload PDF */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileText className="text-blue-600 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Importar Extrato</h3>
                  <p className="text-sm text-gray-500">Lance diárias automaticamente via PDF</p>
                </div>
              </div>
              <button onClick={() => { setIsUploadModalOpen(false); setExtractedRecords(null); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {!extractedRecords ? (
                <div className="space-y-6">
                   {/* Step 1: Select Property */}
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Imóvel</label>
                    <select 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Upload */}
                  <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${selectedPropertyId ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 opacity-50 cursor-not-allowed'}`}>
                    {isProcessingPdf ? (
                      <div className="py-8">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4 mx-auto" />
                        <p className="text-gray-600 font-medium">A IA está analisando seu PDF...</p>
                        <p className="text-xs text-gray-400 mt-2">Identificando datas e valores</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <h4 className="text-lg font-medium text-gray-700">Clique para enviar o PDF</h4>
                        <p className="text-gray-500 text-sm mt-1 mb-6">Suporta extratos bancários, relatórios do Airbnb/Booking, etc.</p>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          accept="application/pdf"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={!selectedPropertyId}
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!selectedPropertyId}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                        >
                          Selecionar Arquivo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-center justify-between">
                    <div>
                      <p className="text-green-800 font-medium">Análise Concluída</p>
                      <p className="text-green-600 text-sm">{extractedRecords.length} lançamentos encontrados</p>
                    </div>
                    <Check className="text-green-600" />
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-3 font-semibold text-gray-600">Data</th>
                          <th className="p-3 font-semibold text-gray-600">Descrição</th>
                          <th className="p-3 font-semibold text-gray-600 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {extractedRecords.length > 0 ? extractedRecords.map((record, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 text-gray-800">{record.date}</td>
                            <td className="p-3 text-gray-600">{record.description}</td>
                            <td className="p-3 text-gray-800 font-medium text-right text-green-600">
                              + R$ {record.amount.toFixed(2)}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-gray-500">Nenhum lançamento financeiro identificado neste PDF.</td>
                          </tr>
                        )}
                      </tbody>
                      {extractedRecords.length > 0 && (
                        <tfoot className="bg-gray-50 border-t font-semibold">
                          <tr>
                            <td colSpan={2} className="p-3 text-right text-gray-700">Total Identificado:</td>
                            <td className="p-3 text-right text-green-700">
                              R$ {extractedRecords.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
               <button 
                onClick={() => { setIsUploadModalOpen(false); setExtractedRecords(null); }} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                {extractedRecords ? 'Cancelar' : 'Fechar'}
              </button>
              {extractedRecords && extractedRecords.length > 0 && (
                <button 
                  onClick={handleConfirmRecords}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2 font-medium"
                >
                  <Check size={18} /> Confirmar Lançamento
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;