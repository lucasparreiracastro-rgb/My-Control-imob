
import React, { useState, useRef, useEffect } from 'react';
import { Property, PropertyType, PropertyStatus, RentalRecord, TransactionType } from '../types';
import { extractRentalDataFromPdf, searchImages } from '../services/geminiService';
import { Plus, Search, MapPin, Bed, Bath, Square, X, Check, Upload, FileText, Loader2, DollarSign, Trash2, Calendar, Save, ArrowRight, Filter, Camera, Image as ImageIcon, ArrowDownCircle, ArrowUpCircle, Edit2, Pencil, Globe, Download, Zap } from 'lucide-react';

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
  
  // Edit Property State (for the main form)
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Description Edit State (inside details view)
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState('');

  // Filter State
  const [filter, setFilter] = useState('');
  
  // History Date Filter State
  const [historyFilterStart, setHistoryFilterStart] = useState('');
  const [historyFilterEnd, setHistoryFilterEnd] = useState('');
  
  // Add/Edit Property Form State
  const [formData, setFormData] = useState<Partial<Property>>({
    title: '',
    price: 0,
    description: '',
    imageUrl: '',
    consumerUnit: ''
  });

  // Image Search State
  const [imageTab, setImageTab] = useState<'upload' | 'search'>('upload');
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<string[]>([]);

  // Manual Record State
  const [manualRecord, setManualRecord] = useState<{
    checkIn: string;
    checkOut: string;
    description: string;
    amount: string;
    type: TransactionType;
  }>({
    checkIn: '',
    checkOut: '',
    description: '',
    amount: '',
    type: 'revenue'
  });

  // PDF Processing State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [extractedRecords, setExtractedRecords] = useState<RentalRecord[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Reset filters and edit state when opening a new property
  useEffect(() => {
    if (viewingProperty) {
      setHistoryFilterStart('');
      setHistoryFilterEnd('');
      setIsEditingDescription(false);
      setTempDescription(viewingProperty.description || '');
    }
  }, [viewingProperty?.id]);

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(filter.toLowerCase()) || 
    p.address.toLowerCase().includes(filter.toLowerCase())
  );

  // Helper to parse DD/MM/YYYY to Date object for comparison
  const parseRecordDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // Month is 0-indexed in JS Date
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return null;
  };

  // Derived state for filtered history
  const filteredHistory = viewingProperty?.rentalHistory?.filter(record => {
    if (!historyFilterStart && !historyFilterEnd) return true;

    const recordDate = parseRecordDate(record.date);
    if (!recordDate) return true;

    // Reset hours for accurate date comparison
    recordDate.setHours(0, 0, 0, 0);

    let isValid = true;

    if (historyFilterStart) {
      const startDate = new Date(historyFilterStart);
      startDate.setHours(0, 0, 0, 0);
      if (recordDate < startDate) isValid = false;
    }

    if (historyFilterEnd) {
      const endDate = new Date(historyFilterEnd);
      endDate.setHours(0, 0, 0, 0);
      if (recordDate > endDate) isValid = false;
    }

    return isValid;
  }) || [];

  const totalRevenue = filteredHistory.filter(r => r.type === 'revenue' || !r.type).reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = filteredHistory.filter(r => r.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalRevenue - totalExpense;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSearch = async () => {
    if (!imageSearchQuery.trim()) return;
    setIsSearchingImages(true);
    const results = await searchImages(imageSearchQuery);
    setImageSearchResults(results);
    setIsSearchingImages(false);
  };

  const selectSearchedImage = (url: string) => {
    setFormData(prev => ({ ...prev, imageUrl: url }));
  };

  const handleEditProperty = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation(); // Prevent opening details modal
    setFormData({
        title: property.title,
        price: property.price,
        description: property.description,
        imageUrl: property.imageUrl,
        consumerUnit: property.consumerUnit || ''
    });
    setImageSearchQuery(property.title); // Set initial search query to title
    setEditingId(property.id);
    setIsModalOpen(true);
    setImageTab('upload');
    setImageSearchResults([]);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', price: 0, description: '', imageUrl: '', consumerUnit: '' });
    setImageSearchResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
        // Update existing property
        const existingProperty = properties.find(p => p.id === editingId);
        if (existingProperty) {
            const updatedProperty: Property = {
                ...existingProperty,
                title: formData.title || existingProperty.title,
                price: Number(formData.price) || existingProperty.price,
                description: formData.description || existingProperty.description,
                imageUrl: formData.imageUrl || existingProperty.imageUrl,
                consumerUnit: formData.consumerUnit || existingProperty.consumerUnit
            };
            onUpdateProperty(updatedProperty);
        }
    } else {
        // Create new property
        const newProperty: Property = {
            id: Math.random().toString(36).substr(2, 9),
            title: formData.title || 'Novo Imóvel',
            description: formData.description || 'Sem observações.',
            price: Number(formData.price) || 0,
            type: PropertyType.APARTMENT,
            status: PropertyStatus.AVAILABLE,
            address: 'Endereço a definir',
            consumerUnit: formData.consumerUnit || '',
            bedrooms: 0,
            bathrooms: 0,
            area: 0,
            imageUrl: formData.imageUrl || 'https://picsum.photos/800/600',
            features: [],
            rentalHistory: []
        };
        onAddProperty(newProperty);
    }
    
    handleCloseModal();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleSaveDescription = () => {
    if (!viewingProperty) return;
    
    const updatedProperty = {
      ...viewingProperty,
      description: tempDescription
    };

    onUpdateProperty(updatedProperty);
    setViewingProperty(updatedProperty);
    setIsEditingDescription(false);
  };

  const handleAddManualRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingProperty || !manualRecord.amount) return;

    // Se for despesa, só precisa de uma data (usa checkIn como data de referência)
    // Se for receita e tiver checkIn/checkOut, usa as datas formatadas.

    let recordDate = '';
    let formattedCheckIn = undefined;
    let formattedCheckOut = undefined;

    if (manualRecord.checkIn) {
      recordDate = formatDate(manualRecord.checkIn);
      formattedCheckIn = recordDate;
    }
    
    if (manualRecord.checkOut) {
       formattedCheckOut = formatDate(manualRecord.checkOut);
    }

    const newRecord: RentalRecord = {
      date: recordDate || new Date().toLocaleDateString('pt-BR'),
      checkIn: formattedCheckIn,
      checkOut: formattedCheckOut,
      description: manualRecord.description || (manualRecord.type === 'expense' ? 'Despesa' : 'Receita'),
      amount: parseFloat(manualRecord.amount),
      type: manualRecord.type
    };

    const updatedProperty = {
      ...viewingProperty,
      rentalHistory: [newRecord, ...(viewingProperty.rentalHistory || [])]
    };

    onUpdateProperty(updatedProperty);
    setViewingProperty(updatedProperty);
    setManualRecord({ checkIn: '', checkOut: '', description: '', amount: '', type: 'revenue' });
  };

  const handleDeleteRecord = (recordToDelete: RentalRecord) => {
    if (!viewingProperty) return;

    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      const updatedHistory = viewingProperty.rentalHistory.filter(r => r !== recordToDelete);
      
      const updatedProperty = {
        ...viewingProperty,
        rentalHistory: updatedHistory
      };

      onUpdateProperty(updatedProperty);
      setViewingProperty(updatedProperty);
    }
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
            onClick={() => { 
                setIsModalOpen(true); 
                setEditingId(null); 
                setFormData({ title: '', price: 0, description: '', imageUrl: '', consumerUnit: '' }); 
                setImageTab('upload');
            }}
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
              
              {/* Actions Buttons */}
              <div className="absolute top-3 left-3 flex gap-2 z-10">
                <button 
                    onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProperty(property.id);
                    }}
                    className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                    title="Excluir imóvel"
                >
                    <Trash2 size={16} />
                </button>
                <button 
                    onClick={(e) => handleEditProperty(e, property)}
                    className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                    title="Editar cadastro"
                >
                    <Pencil size={16} />
                </button>
              </div>

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
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><MapPin size={14} /> {viewingProperty.address}</span>
                    {viewingProperty.consumerUnit && (
                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium border border-yellow-200" title="Unidade Consumidora">
                            <Zap size={12} fill="currentColor" /> UC: {viewingProperty.consumerUnit}
                        </span>
                    )}
                </div>
               </div>
               <button onClick={() => setViewingProperty(null)} className="text-gray-500 hover:text-gray-700">
                 <X size={24} />
               </button>
             </div>
             
             <div className="p-6 overflow-y-auto">
                <div className="mb-6 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                  <div className="flex justify-between items-start mb-2">
                     <h4 className="font-semibold text-yellow-800 text-sm">Observações / Descrição</h4>
                     {!isEditingDescription && (
                        <button 
                           onClick={() => { setIsEditingDescription(true); setTempDescription(viewingProperty.description); }}
                           className="text-yellow-600 hover:text-yellow-800 p-1 bg-yellow-100 rounded hover:bg-yellow-200 transition-colors"
                           title="Editar descrição"
                        >
                           <Edit2 size={16} />
                        </button>
                     )}
                  </div>
                  
                  {isEditingDescription ? (
                    <div className="space-y-3">
                       <textarea 
                          value={tempDescription}
                          onChange={(e) => setTempDescription(e.target.value)}
                          className="w-full p-3 text-sm border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white"
                          rows={4}
                          placeholder="Digite as observações..."
                       />
                       <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setIsEditingDescription(false)}
                            className="px-3 py-1.5 text-yellow-700 text-xs font-medium hover:bg-yellow-100 rounded"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={handleSaveDescription}
                            className="px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 flex items-center gap-1"
                          >
                            <Save size={14} /> Salvar
                          </button>
                       </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {viewingProperty.description || "Nenhuma observação registrada."}
                    </p>
                  )}
                </div>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <p className="text-green-600 text-sm font-medium">Receita Total</p>
                        <p className="text-2xl font-bold text-green-800">
                            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="text-red-600 text-sm font-medium">Despesa Total</p>
                        <p className="text-2xl font-bold text-red-800">
                            R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className={`${netBalance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'} p-4 rounded-xl border`}>
                        <p className={`${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} text-sm font-medium`}>Saldo Líquido</p>
                        <p className={`${netBalance >= 0 ? 'text-blue-800' : 'text-orange-800'} text-2xl font-bold`}>
                            R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                        <Plus size={16} className="text-blue-600" />
                        Lançamento Manual
                    </h4>
                    <form onSubmit={handleAddManualRecord} className="flex flex-col gap-3">
                        <div className="flex gap-4 mb-2">
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="type" 
                                checked={manualRecord.type === 'revenue'}
                                onChange={() => setManualRecord({...manualRecord, type: 'revenue'})}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 font-medium">Receita</span>
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="type" 
                                checked={manualRecord.type === 'expense'}
                                onChange={() => setManualRecord({...manualRecord, type: 'expense'})}
                                className="text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm text-gray-700 font-medium">Despesa</span>
                           </label>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3">
                          <div className="flex-1 w-full">
                              <label className="text-xs text-gray-500 font-medium mb-1 block">Data / Check-in</label>
                              <input 
                                  type="date" 
                                  required
                                  value={manualRecord.checkIn}
                                  onChange={(e) => setManualRecord({...manualRecord, checkIn: e.target.value})}
                                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                          {manualRecord.type === 'revenue' && (
                            <div className="flex-1 w-full">
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Check-out (Opcional)</label>
                                <input 
                                    type="date" 
                                    value={manualRecord.checkOut}
                                    onChange={(e) => setManualRecord({...manualRecord, checkOut: e.target.value})}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                            <div className="flex-[2] w-full">
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Descrição</label>
                                <input 
                                    type="text" 
                                    placeholder={manualRecord.type === 'expense' ? "Ex: Conta de Luz, Manutenção" : "Ex: Diária Airbnb"}
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
                            <button type="submit" className={`w-full md:w-auto p-2 text-white rounded-lg transition-colors flex items-center justify-center ${manualRecord.type === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                <Save size={18} />
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-4 gap-4">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar size={18} />
                      Extrato Financeiro
                  </h4>
                  <div className="flex items-center gap-2 w-full sm:w-auto bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <Filter size={16} className="text-gray-400" />
                    <div className="flex items-center gap-2">
                       <input 
                         type="date" 
                         value={historyFilterStart}
                         onChange={(e) => setHistoryFilterStart(e.target.value)}
                         className="bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                         placeholder="De"
                       />
                       <span className="text-gray-400 text-xs">até</span>
                       <input 
                         type="date" 
                         value={historyFilterEnd}
                         onChange={(e) => setHistoryFilterEnd(e.target.value)}
                         className="bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                         placeholder="Até"
                       />
                    </div>
                    {(historyFilterStart || historyFilterEnd) && (
                      <button 
                        onClick={() => { setHistoryFilterStart(''); setHistoryFilterEnd(''); }}
                        className="text-xs text-red-500 hover:text-red-700 px-2"
                        title="Limpar filtros"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-semibold text-gray-600">Data / Período</th>
                                <th className="p-3 font-semibold text-gray-600">Tipo</th>
                                <th className="p-3 font-semibold text-gray-600">Descrição</th>
                                <th className="p-3 font-semibold text-gray-600 text-right">Valor</th>
                                <th className="p-3 font-semibold text-gray-600 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredHistory.length > 0 ? (
                                filteredHistory.map((record, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-800">
                                          {record.checkIn && record.checkOut ? (
                                            <div className="flex flex-col gap-1">
                                              <span className="flex items-center gap-1 text-xs text-gray-500"><ArrowRight size={10} /> {record.checkIn}</span>
                                              <span className="flex items-center gap-1 text-xs text-gray-500"><ArrowRight size={10} /> {record.checkOut}</span>
                                            </div>
                                          ) : (
                                            record.date
                                          )}
                                        </td>
                                        <td className="p-3">
                                            {record.type === 'expense' ? (
                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">Despesa</span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Receita</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-gray-600">{record.description}</td>
                                        <td className={`p-3 font-medium text-right ${record.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                                            {record.type === 'expense' ? '-' : '+'} R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button 
                                              onClick={() => handleDeleteRecord(record)} 
                                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                              title="Excluir lançamento"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        {viewingProperty.rentalHistory && viewingProperty.rentalHistory.length > 0 
                                          ? "Nenhum registro encontrado para o período selecionado."
                                          : "Nenhum registro financeiro encontrado."}
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

      {/* Modal - Add/Edit Property */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Editar Imóvel' : 'Adicionar Novo Imóvel'}</h3>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              
              {/* Image Selection Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Foto do Imóvel</label>
                
                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-lg">
                    <button 
                        type="button"
                        onClick={() => setImageTab('upload')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${imageTab === 'upload' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Upload Local
                    </button>
                    <button 
                        type="button"
                        onClick={() => setImageTab('search')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${imageTab === 'search' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Buscar na Web (IA)
                    </button>
                </div>

                {imageTab === 'upload' ? (
                    <div 
                        className="w-full h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-blue-500 transition-colors"
                        onClick={() => imageInputRef.current?.click()}
                    >
                        {formData.imageUrl ? (
                        <>
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Camera size={16} /> Alterar Foto
                            </div>
                            </div>
                        </>
                        ) : (
                        <div className="flex flex-col items-center text-gray-400">
                            <ImageIcon size={32} className="mb-2" />
                            <span className="text-sm font-medium">Clique para selecionar</span>
                        </div>
                        )}
                        <input 
                        type="file" 
                        ref={imageInputRef} 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageSelect}
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Ex: Apartamento luxo sala ampla"
                                value={imageSearchQuery}
                                onChange={(e) => setImageSearchQuery(e.target.value)}
                                className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button 
                                type="button" 
                                onClick={handleImageSearch}
                                disabled={isSearchingImages}
                                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSearchingImages ? <Loader2 className="animate-spin w-5 h-5" /> : <Search size={20} />}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {imageSearchResults.length > 0 ? (
                                imageSearchResults.map((url, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => selectSearchedImage(url)}
                                        className={`h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${formData.imageUrl === url ? 'border-blue-600 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}
                                    >
                                        <img src={url} alt={`Resultado ${idx}`} className="w-full h-full object-cover" />
                                    </div>
                                ))
                            ) : (
                                !isSearchingImages && (
                                    <div className="col-span-2 text-center py-6 text-gray-400 text-xs">
                                        Digite e busque para ver sugestões de imagens.
                                    </div>
                                )
                            )}
                        </div>
                         {formData.imageUrl && imageSearchResults.includes(formData.imageUrl) && (
                             <p className="text-xs text-green-600 flex items-center gap-1"><Check size={12}/> Imagem selecionada</p>
                         )}
                    </div>
                )}
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade Consumidora (UC)</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                  placeholder="Ex: 8439201"
                  value={formData.consumerUnit || ''} 
                  onChange={e => setFormData({...formData, consumerUnit: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Imóvel (R$)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                  placeholder="0,00"
                  value={formData.price || ''} 
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" 
                  placeholder="Detalhes sobre localização, estado do imóvel, etc..."
                  rows={3}
                  value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium">Cancelar</button>
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