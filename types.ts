
export enum PropertyType {
  APARTMENT = 'Apartamento',
  HOUSE = 'Casa',
  COMMERCIAL = 'Comercial',
  LAND = 'Terreno'
}

export enum PropertyStatus {
  AVAILABLE = 'Disponível',
  SOLD = 'Vendido',
  RENTED = 'Alugado',
  PENDING = 'Em Negociação'
}

export type TransactionType = 'revenue' | 'expense';

export interface RentalRecord {
  date: string; // Data de referência ou data do pagamento
  checkIn?: string; // Data de entrada (opcional)
  checkOut?: string; // Data de saída (opcional)
  amount: number;
  description: string;
  type: TransactionType; // Novo campo: receita ou despesa
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  type: PropertyType;
  status: PropertyStatus;
  address: string;
  bedrooms: number;
  bathrooms: number;
  area: number; // m²
  imageUrl: string;
  features: string[];
  rentalHistory: RentalRecord[];
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  status: 'Novo' | 'Contatado' | 'Visita Agendada' | 'Fechado';
  date: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type ViewState = 'dashboard' | 'properties' | 'ai-chat' | 'settings';
