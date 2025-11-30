
import React, { useState } from 'react';
import { Property, PropertyStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Building2, DollarSign, TrendingUp, TrendingDown, Wallet, Calendar, Filter, X } from 'lucide-react';

interface DashboardProps {
  properties: Property[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const FINANCIAL_COLORS = ['#10b981', '#ef4444']; // Green for Income, Red for Expense

const Dashboard: React.FC<DashboardProps> = ({ properties }) => {
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Handle Multi-select
  const togglePropertySelect = (id: string) => {
    if (selectedPropertyIds.includes(id)) {
      setSelectedPropertyIds(selectedPropertyIds.filter(pid => pid !== id));
    } else {
      setSelectedPropertyIds([...selectedPropertyIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedPropertyIds.length === properties.length) {
      setSelectedPropertyIds([]);
    } else {
      setSelectedPropertyIds(properties.map(p => p.id));
    }
  };

  // Filter properties based on selection
  const activeProperties = properties.filter(p => 
    selectedPropertyIds.length === 0 || selectedPropertyIds.includes(p.id)
  );

  // Helper to parse DD/MM/YYYY to Date object for comparison
  const parseRecordDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return null;
  };

  // Calculate Aggregated Financials
  let totalRevenue = 0;
  let totalExpense = 0;
  let chartData: any[] = [];

  activeProperties.forEach(property => {
    property.rentalHistory?.forEach(record => {
      const recordDate = parseRecordDate(record.date);
      if (!recordDate) return;
      
      // Date Filter
      let isInRange = true;
      if (dateStart) {
        const start = new Date(dateStart);
        start.setHours(0,0,0,0);
        if (recordDate < start) isInRange = false;
      }
      if (dateEnd) {
        const end = new Date(dateEnd);
        end.setHours(0,0,0,0);
        if (recordDate > end) isInRange = false;
      }

      if (isInRange) {
        const isExpense = record.type === 'expense';
        if (isExpense) {
            totalExpense += record.amount;
        } else {
            totalRevenue += record.amount;
        }

        // Prepare chart data (Monthly aggregation)
        const monthKey = `${recordDate.getMonth() + 1}/${recordDate.getFullYear()}`;
        const existingMonth = chartData.find(d => d.name === monthKey);
        
        if (existingMonth) {
            if (isExpense) existingMonth.Despesa += record.amount;
            else existingMonth.Receita += record.amount;
        } else {
            chartData.push({
                name: monthKey,
                Receita: isExpense ? 0 : record.amount,
                Despesa: isExpense ? record.amount : 0,
                sortDate: recordDate
            });
        }
      }
    });
  });

  // Sort chart data chronologically
  chartData.sort((a, b) => a.sortDate - b.sortDate);

  const netProfit = totalRevenue - totalExpense;

  // General Status Distribution (filtered by property selection only, not date)
  const statusData = [
    { name: 'Disponível', value: activeProperties.filter(p => p.status === PropertyStatus.AVAILABLE).length },
    { name: 'Vendido', value: activeProperties.filter(p => p.status === PropertyStatus.SOLD).length },
    { name: 'Alugado', value: activeProperties.filter(p => p.status === PropertyStatus.RENTED).length },
    { name: 'Negociação', value: activeProperties.filter(p => p.status === PropertyStatus.PENDING).length },
  ].filter(d => d.value > 0);

  const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className={`text-2xl font-bold mt-1 ${color.replace('bg-', 'text-')}`}>{value}</h3>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Control Panel: Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Filter size={20} className="text-blue-600" />
                Filtros de Análise
            </h2>
            {(selectedPropertyIds.length > 0 || dateStart || dateEnd) && (
                <button 
                    onClick={() => {setSelectedPropertyIds([]); setDateStart(''); setDateEnd('');}}
                    className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                    <X size={14} /> Limpar Filtros
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Property Selector */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Imóveis ({selectedPropertyIds.length || 'Todos'})</label>
                <div className="border border-gray-200 rounded-lg p-2 max-h-40 overflow-y-auto bg-gray-50">
                    <div className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer" onClick={selectAll}>
                         <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedPropertyIds.length === properties.length ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                            {selectedPropertyIds.length === properties.length && <div className="w-2 h-2 bg-white rounded-sm" />}
                         </div>
                         <span className="text-sm font-medium text-gray-800">Selecionar Todos</span>
                    </div>
                    <div className="h-px bg-gray-200 my-1" />
                    {properties.map(property => (
                        <div 
                            key={property.id} 
                            onClick={() => togglePropertySelect(property.id)}
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                        >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${selectedPropertyIds.includes(property.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                                {selectedPropertyIds.includes(property.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                            </div>
                            <span className="text-sm text-gray-600 truncate">{property.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Date Filters */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Data Inicial</label>
                <input 
                    type="date" 
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Data Final</label>
                <input 
                    type="date" 
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mt-8">Resultados Financeiros</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Receita Total" 
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={TrendingUp} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Despesas Totais" 
          value={`R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={TrendingDown} 
          color="bg-red-500" 
        />
        <StatCard 
          title="Resultado Líquido" 
          value={`R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={Wallet} 
          color={netProfit >= 0 ? "bg-blue-500" : "bg-orange-500"}
          subValue={activeProperties.length > 0 ? `${activeProperties.length} imóveis considerados` : 'Nenhum imóvel'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Financial Evolution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Fluxo de Caixa Mensal</h3>
          {chartData.length > 0 ? (
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                        cursor={{ fill: '#f3f4f6' }} 
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} name="Receita" />
                    <Bar dataKey="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesa" />
                </BarChart>
                </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 w-full flex flex-col items-center justify-center text-gray-400">
                <Calendar size={32} className="mb-2 opacity-50" />
                <p>Sem dados financeiros para o período.</p>
            </div>
          )}
        </div>

        {/* Status Chart (Only filtered by properties, not date) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Status dos Imóveis Selecionados</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
