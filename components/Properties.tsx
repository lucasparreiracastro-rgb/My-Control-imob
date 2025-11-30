import React, { useState } from 'react';
import { Property, PropertyType, PropertyStatus } from '../types';
import { generatePropertyDescription } from '../services/geminiService';
import { Plus, Search, MapPin, Bed, Bath, Square, Sparkles, X, Check } from 'lucide-react';

interface PropertiesProps {
  properties: Property[];
  onAddProperty: (property: Property) => void;
}

const Properties: React.FC<PropertiesProps> = ({ properties, onAddProperty }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  
  // New Property Form State
  const [formData, setFormData] = useState<Partial<Property>>({
    type: PropertyType.APARTMENT,
    status: PropertyStatus.AVAILABLE,
    features: [],
    imageUrl: 'https://picsum.photos/800/600',
    description: ''
  });
  const [featureInput, setFeatureInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(filter.toLowerCase()) || 
    p.address.toLowerCase().includes(filter.toLowerCase())
  );

  const handleGenerateDescription = async () => {
    if (!formData.features || formData.features.length === 0 || !formData.type) {
      alert("Adicione algumas características e o tipo do imóvel primeiro.");
      return;
    }

    setIsGenerating(true);
    const desc = await generatePropertyDescription(
      formData.features.join(', '),
      formData.type,
      formData.address || 'Localização não especificada',
      formData.bedrooms || 0
    );
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProperty: Property = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title || 'Novo Imóvel',
      description: formData.description || '',
      price: formData.price || 0,
      type: formData.type as PropertyType,
      status: formData.status as PropertyStatus,
      address: formData.address || '',
      bedrooms: formData.bedrooms || 0,
      bathrooms: formData.bathrooms || 0,
      area: formData.area || 0,
      imageUrl: formData.imageUrl || 'https://picsum.photos/800/600',
      features: formData.features || []
    };
    onAddProperty(newProperty);
    setIsModalOpen(false);
    setFormData({ type: PropertyType.APARTMENT, status: PropertyStatus.AVAILABLE, features: [], description: '' });
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), featureInput.trim()]
      }));
      setFeatureInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Meus Imóveis</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          Novo Imóvel
        </button>
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
          <div key={property.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="relative h-48 overflow-hidden">
              <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

      {/* Modal - Add Property */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">Adicionar Novo Imóvel</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input required type="text" className="w-full p-2 border rounded-lg" 
                    value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input required type="number" className="w-full p-2 border rounded-lg" 
                    value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select className="w-full p-2 border rounded-lg"
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PropertyType})}>
                    {Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full p-2 border rounded-lg"
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as PropertyStatus})}>
                    {Object.values(PropertyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input required type="text" className="w-full p-2 border rounded-lg" 
                    value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-2 md:col-span-2">
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quartos</label>
                    <input type="number" className="w-full p-2 border rounded-lg" 
                      value={formData.bedrooms || ''} onChange={e => setFormData({...formData, bedrooms: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banheiros</label>
                    <input type="number" className="w-full p-2 border rounded-lg" 
                      value={formData.bathrooms || ''} onChange={e => setFormData({...formData, bathrooms: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Área (m²)</label>
                    <input type="number" className="w-full p-2 border rounded-lg" 
                      value={formData.area || ''} onChange={e => setFormData({...formData, area: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Características (ex: Piscina, Lareira)</label>
                   <div className="flex gap-2 mb-2">
                     <input type="text" className="flex-1 p-2 border rounded-lg" placeholder="Adicionar característica"
                      value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                     />
                     <button type="button" onClick={addFeature} className="bg-gray-100 hover:bg-gray-200 px-4 rounded-lg">
                       <Plus size={20} />
                     </button>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {formData.features?.map((f, i) => (
                       <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm flex items-center gap-1">
                         {f} <button type="button" onClick={() => setFormData(p => ({...p, features: p.features?.filter((_, idx) => idx !== i)}))}><X size={12}/></button>
                       </span>
                     ))}
                   </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Descrição</label>
                    <button 
                      type="button" 
                      onClick={handleGenerateDescription}
                      disabled={isGenerating}
                      className="text-xs flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors disabled:opacity-50"
                    >
                      <Sparkles size={12} />
                      {isGenerating ? 'Gerando...' : 'Gerar com IA'}
                    </button>
                  </div>
                  <textarea 
                    className="w-full p-2 border rounded-lg h-32 text-sm" 
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Digite a descrição ou use a IA para gerar baseada nas características..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2">
                  <Check size={18} /> Salvar Imóvel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;