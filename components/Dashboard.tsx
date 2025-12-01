
import React, { useState } from 'react';
import { Property, PropertyStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building2, DollarSign, TrendingUp, TrendingDown, Wallet, Calendar, Filter, X, FileText, Printer, Users, Key, Clock } from 'lucide-react';

interface DashboardProps {
  properties: Property[];
}

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

  const isDateInRange = (dateStr: string) => {
    const recordDate = parseRecordDate(dateStr);
    if (!recordDate) return false;
    
    if (dateStart) {
      const start = new Date(dateStart);
      start.setHours(0,0,0,0);
      if (recordDate < start) return false;
    }
    if (dateEnd) {
      const end = new Date(dateEnd);
      end.setHours(0,0,0,0);
      if (recordDate > end) return false;
    }
    return true;
  };

  // --- Date Range Calculation for Occupancy ---
  // If filters are set, use them. If not, use current month.
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const calcStart = dateStart ? new Date(dateStart) : currentMonthStart;
  const calcEnd = dateEnd ? new Date(dateEnd) : currentMonthEnd;
  
  // Normalize times to start/end of day
  calcStart.setHours(0,0,0,0);
  calcEnd.setHours(23,59,59,999);

  const oneDayMs = 1000 * 60 * 60 * 24;
  const daysInPeriod = Math.max(1, Math.round((calcEnd.getTime() - calcStart.getTime()) / oneDayMs));

  // --- Calculate Aggregated Financials & Occupancy ---
  let totalRevenue = 0;
  let totalExpense = 0;
  let chartData: any[] = [];
  let totalOccupiedDays = 0;
  
  // Flatten all records for the detailed table
  const allRecords: any[] = [];

  activeProperties.forEach(property => {
    
    // 1. Calculate Occupancy based on CheckIn/CheckOut overlap with Calc Period
    if (property.rentalHistory) {
        property.rentalHistory.forEach(record => {
            // Only consider revenue/occupancy records that have a check-in date
            // or rely on single 'date' if no check-in provided (count as 1 day)
            if (record.checkIn) {
                const rStart = parseRecordDate(record.checkIn);
                const rEnd = record.checkOut ? parseRecordDate(record.checkOut) : rStart; // If no checkout, assume 1 day

                if (rStart && rEnd) {
                    // Normalize
                    rStart.setHours(0,0,0,0);
                    rEnd.setHours(23,59,59,999);

                    // Calculate Overlap
                    const overlapStart = rStart < calcStart ? calcStart : rStart;
                    const overlapEnd = rEnd > calcEnd ? calcEnd : rEnd;

                    if (overlapStart <= overlapEnd) {
                        const overlapDays = Math.max(0, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / oneDayMs));
                        // Add 1 because if start==end it's 1 day of occupancy (e.g., overnight)
                        // Adjust logic: usually hotel nights = diff. 
                        // Let's assume inclusive dates for occupancy calculation.
                        totalOccupiedDays += Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / oneDayMs);
                    }
                }
            }
        });
    }

    // 2. Process Financials
    property.rentalHistory?.forEach(record => {
      // Use the generic date filter logic for the financial list/chart
      // Note: Financials follow the cash flow date (payment date), 
      // while occupancy follows the stay duration. 
      // Here we filter financials by payment date (record.date).
      if (isDateInRange(record.date)) {
        const isExpense = record.type === 'expense';
        if (isExpense) {
            totalExpense += record.amount;
        } else {
            totalRevenue += record.amount;
        }

        const recordDate = parseRecordDate(record.date);
        
        // Add to detailed list
        allRecords.push({
            propertyTitle: property.title,
            ...record,
            sortDate: recordDate
        });

        // Prepare chart data (Monthly aggregation)
        if (recordDate) {
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
      }
    });
  });

  // Sort chart data chronologically
  chartData.sort((a, b) => a.sortDate - b.sortDate);
  
  // Sort detailed records
  allRecords.sort((a, b) => (b.sortDate?.getTime() || 0) - (a.sortDate?.getTime() || 0));

  const netProfit = totalRevenue - totalExpense;

  // Occupancy Calculation Finalization
  const totalPossibleDays = activeProperties.length * daysInPeriod;
  // Cap at 100% in case of data overlap errors in entry
  const occupancyRate = totalPossibleDays > 0 ? Math.min(100, (totalOccupiedDays / totalPossibleDays) * 100) : 0;
  const vacantDays = Math.max(0, totalPossibleDays - totalOccupiedDays);

  const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between break-inside-avoid">
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
         <h1 className="text-2xl font-bold text-gray-800">Dashboard Geral</h1>
         <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
         >
            <FileText size={18} />
            Exportar Relatório (PDF)
         </button>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatório Financeiro Imobiliário</h1>
        <div className="flex justify-between items-end">
            <div className="text-sm text-gray-600">
                <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                <p>Período: {dateStart ? new Date(dateStart).toLocaleDateString('pt-BR') : 'Início'} até {dateEnd ? new Date(dateEnd).toLocaleDateString('pt-BR') : 'Hoje'}</p>
                <p>Imóveis: {selectedPropertyIds.length > 0 ? `${selectedPropertyIds.length} selecionados` : 'Todos os imóveis'}</p>
            </div>
            <div className="text-right">
                 <p className="font-bold text-xl text-blue-800">ImobControl AI</p>
            </div>
        </div>
      </div>
      
      {/* Control Panel: Filters (Hidden on Print) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:hidden">
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

      <h2 className="text-2xl font-bold text-gray-800 mt-8 print:mt-0 mb-4">Resultados Financeiros</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print:grid-cols-2 print:break-inside-avoid">
        
        {/* Financial Evolution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border">
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

        {/* Occupancy Rate Card (Time Based) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <Clock className="text-blue-600" size={20} />
                Taxa de Ocupação (Temporal)
            </h3>
            <p className="text-xs text-gray-500 mb-6">
                Baseado em check-in/check-out entre {calcStart.toLocaleDateString('pt-BR')} e {calcEnd.toLocaleDateString('pt-BR')}
            </p>
            
            <div className="flex items-center justify-between mb-2">
                <span className="text-4xl font-bold text-gray-900">{occupancyRate.toFixed(1)}%</span>
                <span className="text-sm font-medium text-gray-500">{totalOccupiedDays} de {totalPossibleDays} dias possíveis</span>
            </div>

            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-8">
                <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${occupancyRate}%` }}
                >
                    <div className="absolute top-0 right-0 bottom-0 w-full bg-gradient-to-l from-white/20 to-transparent"></div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-600 text-sm font-medium flex items-center gap-2">
                        <Key size={16} /> Dias Ocupados
                    </p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{totalOccupiedDays}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                        <Building2 size={16} /> Dias Vagos
                    </p>
                    <p className="text-2xl font-bold text-gray-700 mt-1">{vacantDays}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Detailed Report Table (Visible on Screen AND Print) */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border print:mt-8 print:break-before-auto">
         <div className="p-6 border-b bg-gray-50 flex justify-between items-center print:bg-transparent print:border-b-2 print:px-0">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-gray-500" />
                Detalhamento Financeiro
            </h3>
            <span className="text-xs text-gray-500 print:hidden">
                {allRecords.length} lançamentos encontrados
            </span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b print:bg-gray-100">
                    <tr>
                        <th className="p-3 font-semibold text-gray-600">Data</th>
                        <th className="p-3 font-semibold text-gray-600">Imóvel</th>
                        <th className="p-3 font-semibold text-gray-600">Descrição</th>
                        <th className="p-3 font-semibold text-gray-600">Tipo</th>
                        <th className="p-3 font-semibold text-gray-600 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {allRecords.length > 0 ? (
                        allRecords.map((record, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 print:hover:bg-transparent">
                                <td className="p-3 text-gray-800 whitespace-nowrap">{record.date}</td>
                                <td className="p-3 text-gray-600 font-medium">{record.propertyTitle}</td>
                                <td className="p-3 text-gray-600">{record.description}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                        record.type === 'expense' 
                                        ? 'bg-red-50 text-red-700 border-red-100' 
                                        : 'bg-green-50 text-green-700 border-green-100'
                                    }`}>
                                        {record.type === 'expense' ? 'Despesa' : 'Receita'}
                                    </span>
                                </td>
                                <td className={`p-3 font-bold text-right ${record.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                                    {record.type === 'expense' ? '-' : '+'} R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-500">
                                Nenhum registro financeiro encontrado para os filtros selecionados.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
