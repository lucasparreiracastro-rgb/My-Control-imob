import { GoogleGenAI, Type } from "@google/genai";
import { Property, RentalRecord } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing. Please check your environment variables.");
    throw new Error("API Key ausente");
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePropertyDescription = async (
  features: string,
  type: string,
  location: string,
  bedrooms: number
): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      Atue como um redator especialista em marketing imobiliário de luxo.
      Crie uma descrição atraente, profissional e persuasiva para um imóvel com as seguintes características:
      - Tipo: ${type}
      - Localização: ${location}
      - Quartos: ${bedrooms}
      - Características e Diferenciais: ${features}
      
      A descrição deve ter cerca de 2 parágrafos, focando nos benefícios e estilo de vida. Use formatação Markdown se necessário, mas mantenha simples.
      Retorne APENAS a descrição, sem introduções.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a descrição.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "Erro ao conectar com a IA. Verifique sua chave API.";
  }
};

export const extractRentalDataFromPdf = async (
  base64Pdf: string, 
  mimeType: string = 'application/pdf'
): Promise<RentalRecord[]> => {
  try {
    const ai = getAiClient();
    const modelName = 'gemini-3-pro-preview';

    const prompt = `
      VOCÊ É UM AUDITOR FINANCEIRO EXPERT EM IMOBILIÁRIAS.
      Sua missão é extrair TODAS as transações financeiras deste documento PDF.

      REGRAS CRÍTICAS PARA DATAS:
      - O documento pode conter datas como "25 nov 2025", "25 de Dezembro", "Nov 25, 2025".
      - Você DEVE converter todas para o formato numérico brasileiro: DD/MM/YYYY.
      - Se encontrar "Nov" ou "Novembro", use "11". Se encontrar "Dez", use "12", e assim por diante.

      O QUE BUSCAR (RECEITAS - revenue):
      - Diárias, Reservas, Hospedagens, Repasses, Payouts, Ganhos Brutos, Créditos.
      - Identifique o nome do hóspede ou código da reserva se disponível.

      O QUE BUSCAR (DESPESAS - expense):
      - Taxas de limpeza, Taxas de serviço, Comissões, Manutenção, Contas (Luz, Água), Imposto, Estornos.

      VALORES:
      - Ignore símbolos monetários (R$, $) e capture apenas o número decimal.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Pdf } },
          { text: prompt }
        ]
      },
      config: {
        // Aumentado para o máximo permitido para garantir raciocínio profundo sobre tabelas e datas por extenso
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { 
                type: Type.STRING, 
                description: 'Data NORMALIZADA para o formato DD/MM/YYYY (ex: 25/11/2025)' 
              },
              amount: { 
                type: Type.NUMBER, 
                description: 'Valor numérico positivo' 
              },
              description: { 
                type: Type.STRING, 
                description: 'Nome do hóspede, código da reserva ou tipo de despesa' 
              },
              type: { 
                type: Type.STRING, 
                description: 'Classificação: "revenue" para ganhos ou "expense" para gastos/taxas' 
              }
            },
            required: ['date', 'amount', 'description', 'type']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      console.warn("IA não retornou texto.");
      return [];
    }
    
    try {
      const cleanedJson = text.trim()
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
        
      const records = JSON.parse(cleanedJson);
      if (!Array.isArray(records)) return [];

      return records.map(r => ({
        ...r,
        amount: Math.abs(Number(r.amount)),
        type: r.type === 'expense' ? 'expense' : 'revenue'
      }));
    } catch (parseError) {
      console.error("Erro ao processar JSON extraído:", parseError, text);
      return [];
    }

  } catch (error) {
    console.error("Erro na extração de dados do PDF via Gemini:", error);
    return [];
  }
};

export const searchImages = async (query: string): Promise<string[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const safeQuery = query.replace(/[^\w\s\u00C0-\u00FF-]/g, '').trim();
  const variations = [
    "architecture modern realistic 8k",
    "interior design luxury bright",
    "building facade wide angle daylight",
    "cozy living room apartment interior"
  ];

  return variations.map((suffix, index) => {
    const fullPrompt = `${safeQuery} ${suffix}`;
    const encoded = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 10000) + index;
    return `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&nologo=true&model=flux&seed=${seed}`;
  });
};

export const chatWithPortfolio = async (
  message: string,
  portfolio: Property[],
  history: { role: 'user' | 'model'; text: string }[] = []
): Promise<string> => {
  try {
    const ai = getAiClient();
    const portfolioContext = portfolio.map(p => 
      `- ID: ${p.id}, ${p.type} em ${p.address}, ${p.bedrooms} quartos, R$ ${p.price}, Status: ${p.status}. Detalhes: ${p.title}`
    ).join('\n');

    const systemInstruction = `
      Você é o "Corretor AI", um assistente virtual inteligente do sistema ImobControl AI.
      Seu objetivo é ajudar corretores de imóveis a gerenciar seu portfólio e responder perguntas sobre os imóveis cadastrados.
      
      DADOS DO PORTFÓLIO ATUAL:
      ${portfolioContext}
      
      DIRETRIZES:
      1. Seja profissional, prestativo e direto.
      2. Se o usuário perguntar sobre preços, calcule médias ou totais se solicitado.
      3. Se perguntarem sobre um imóvel específico, use os detalhes fornecidos.
      4. Responda sempre em Português do Brasil.
    `;
    
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: systemInstruction,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "Desculpe, não entendi.";

  } catch (error) {
    console.error("Error in AI chat:", error);
    return "Desculpe, estou com dificuldades para processar sua solicitação no momento.";
  }
};