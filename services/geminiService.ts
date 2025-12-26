import { GoogleGenAI, Type } from "@google/genai";
import { Property, RentalRecord } from '../types';

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    // Usamos o modelo Pro para melhor precisão em OCR de tabelas financeiras
    const modelName = 'gemini-3-pro-preview';

    const prompt = `
      VOCÊ É UM AUDITOR FINANCEIRO EXPERT EM GESTÃO DE ALUGUEL DE TEMPORADA.
      Analise este relatório de "Prestação de Contas ao Proprietário".

      INSTRUÇÕES DE EXTRAÇÃO:
      1. RESERVAS: Localize os blocos de reservas. Cada reserva tem um código (ex: CN03J), um nome de hóspede e um período.
         - Descrição: Use "Código - Nome" (ex: "CN03J - ENDRIUS SCHEEREN").
         - Período: Extraia check-in e check-out (ex: "02 nov 2025" até "06 nov 2025"). Converta os meses para número (jan=01, nov=11, etc) no formato DD/MM/YYYY.
         - Valor (amount): Use EXCLUSIVAMENTE o valor indicado como "A receber". Ignore o valor "Total" ou "C/Adm".
         - Tipo: Classifique como "revenue".

      2. DESPESAS: Procure pela seção ou tabela de "Despesas".
         - Descrição: Use o nome da despesa (ex: "Fatura de Energia").
         - Data: Data de vencimento ou competência no formato DD/MM/YYYY.
         - Valor (amount): Valor da despesa.
         - Tipo: Classifique como "expense".

      RETORNE APENAS UM ARRAY JSON VÁLIDO.
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
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: 'Data de referência (DD/MM/YYYY)' },
              checkIn: { type: Type.STRING, description: 'Check-in (DD/MM/YYYY)' },
              checkOut: { type: Type.STRING, description: 'Check-out (DD/MM/YYYY)' },
              amount: { type: Type.NUMBER },
              description: { type: Type.STRING },
              type: { type: Type.STRING, description: 'revenue ou expense' }
            },
            required: ['date', 'amount', 'description', 'type']
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    try {
      const cleanedJson = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      return JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("Erro no parse do JSON da IA:", parseError, text);
      return [];
    }
  } catch (error) {
    console.error("Erro Gemini PDF Extraction:", error);
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