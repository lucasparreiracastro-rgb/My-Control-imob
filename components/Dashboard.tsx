import React from 'react';
import { Property, Lead, PropertyStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, Users, DollarSign, TrendingUp } from 'lucide-react';

interface DashboardProps {
  properties: Property[];
  leads: Lead[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard: React.FC<DashboardProps> = ({ properties, leads }) => {
  
  // Calculate stats
  const totalValue = properties.reduce((acc, curr) => acc + curr.price, 0);
  const activeProperties = properties.filter(p => p.status === PropertyStatus.AVAILABLE).length;
  const totalLeads = leads.length;
  const recentSales = properties.filter(p => p.status === PropertyStatus.SOLD).length;

  // Prepare chart data
  const statusData = [
    { name: 'Disponível', value: properties.filter(p => p.status === PropertyStatus.AVAILABLE).length },
    { name: 'Vendido', value: properties.filter(p => p.status === PropertyStatus.SOLD).length },
    { name: 'Alugado', value: properties.filter(p => p.status === PropertyStatus.RENTED).length },
    { name: 'Negociação', value: properties.filter(p => p.status === PropertyStatus.PENDING).length },
  ].filter(d => d.value > 0);

  const priceRangeData = [
    { name: 'Até 500k', value: properties.filter(p => p.price <= 500000).length },
    { name: '500k-1M', value: properties.filter(p => p.price > 500000 && p.price <= 1000000).length },
    { name: '1M-2.5M', value: properties.filter(p => p.price > 1000000 && p.price <= 2500000).length },
    { name: 'Acima 2.5M', value: properties.filter(p => p.price > 2500000).length },
  ];

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Valor em Carteira" 
          value={`R$ ${(totalValue / 1000000).toFixed(1)}M`} 
          icon={DollarSign} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Imóveis Ativos" 
          value={activeProperties} 
          icon={Building2} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Leads Totais" 
          value={totalLeads} 
          icon={Users} 
          color="bg-purple-500" 
        />
        <StatCard 
          title="Vendas Recentes" 
          value={recentSales} 
          icon={TrendingUp} 
          color="bg-orange-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Status</h3>
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
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {statusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>

        {/* Price Range Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Faixa de Preço</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceRangeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;