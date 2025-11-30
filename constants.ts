import { Property, PropertyType, PropertyStatus, Lead } from './types';

export const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    title: 'Cobertura Duplex no Jardins',
    description: 'Espetacular cobertura com vista panorâmica, piscina privativa e acabamento de alto padrão. Localização privilegiada próxima aos melhores restaurantes.',
    price: 4500000,
    type: PropertyType.APARTMENT,
    status: PropertyStatus.AVAILABLE,
    address: 'Rua Oscar Freire, São Paulo, SP',
    bedrooms: 4,
    bathrooms: 5,
    area: 320,
    imageUrl: 'https://picsum.photos/800/600?random=1',
    features: ['Piscina', 'Varanda Gourmet', 'Portaria 24h', 'Academia']
  },
  {
    id: '2',
    title: 'Casa Modernista no Morumbi',
    description: 'Residência com arquitetura premiada, amplos vãos livres, jardim integrado e muita iluminação natural.',
    price: 3200000,
    type: PropertyType.HOUSE,
    status: PropertyStatus.PENDING,
    address: 'Rua dosolinea, São Paulo, SP',
    bedrooms: 5,
    bathrooms: 6,
    area: 550,
    imageUrl: 'https://picsum.photos/800/600?random=2',
    features: ['Jardim', 'Lareira', 'Escritório', 'Garagem Subterrânea']
  },
  {
    id: '3',
    title: 'Studio Compacto Centro',
    description: 'Ideal para investimento. Studio mobiliado, próximo ao metrô e universidades. Alta rentabilidade.',
    price: 450000,
    type: PropertyType.APARTMENT,
    status: PropertyStatus.RENTED,
    address: 'Av. Ipiranga, São Paulo, SP',
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    imageUrl: 'https://picsum.photos/800/600?random=3',
    features: ['Mobiliado', 'Lavanderia Coletiva', 'Coworking']
  },
  {
    id: '4',
    title: 'Sala Comercial Faria Lima',
    description: 'Laje corporativa em edifício triple A. Infraestrutura completa para empresas de tecnologia.',
    price: 1200000,
    type: PropertyType.COMMERCIAL,
    status: PropertyStatus.AVAILABLE,
    address: 'Av. Faria Lima, São Paulo, SP',
    bedrooms: 0,
    bathrooms: 2,
    area: 120,
    imageUrl: 'https://picsum.photos/800/600?random=4',
    features: ['Ar Central', 'Heliponto', 'Segurança Armada']
  }
];

export const MOCK_LEADS: Lead[] = [
  { id: '1', name: 'Roberto Silva', email: 'roberto@email.com', phone: '(11) 99999-1234', interest: 'Compra - Apto Jardins', status: 'Novo', date: '2024-05-10' },
  { id: '2', name: 'Ana Oliveira', email: 'ana@email.com', phone: '(11) 98888-5678', interest: 'Aluguel - Studio', status: 'Visita Agendada', date: '2024-05-09' },
  { id: '3', name: 'Carlos Santos', email: 'carlos@email.com', phone: '(11) 97777-4321', interest: 'Compra - Casa', status: 'Contatado', date: '2024-05-08' },
  { id: '4', name: 'Fernanda Lima', email: 'fernanda@email.com', phone: '(11) 96666-8765', interest: 'Investimento', status: 'Fechado', date: '2024-05-01' },
];