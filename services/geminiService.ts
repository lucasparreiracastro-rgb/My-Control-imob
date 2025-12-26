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
    
    // Usamos o modelo PRO para tarefas ultra complexas de visão documental
    const modelName = 'gemini-3-pro-preview';

    const prompt = `
      VOCÊ É UM AUDITOR FINANCEIRO IMOBILIÁRIO.
      Analise este documento (PDF) e extraia TODAS as transações financeiras, com foco total em diárias de aluguel e despesas.

      INSTRUÇÕES DE BUSCA:
      1. LOCALIZAR DIÁRIAS: Procure por termos como "Hospedagem", "Diária", "Pernoite", "Reserva", "Stay", "Nightly Rate", "Repasse", "Payout", "Ganhos".
      2. LOCALIZAR VALORES: Procure por qualquer valor numérico precedido por "R$", "$" ou em colunas chamadas "Valor", "Preço", "Total", "Crédito", "Líquido".
      3. LOCALIZAR DATAS: Identifique a data associada ao valor. Se houver período (ex: 01/01 a 05/01), use a data de início. Formato: DD/MM/YYYY.
      4. CLASSIFICAÇÃO: 
         - "revenue": Se for entrada de dinheiro, aluguel, bônus.
         - "expense": Se for taxa de serviço, limpeza, comissão, luz, água, imposto, manutenção (valores negativos ou em colunas de débito).

      IMPORTANTE: Mesmo que o documento seja confuso, tente extrair o máximo de linhas possível. Se encontrar um valor de diária, a descrição deve conter o nome do hóspede ou código da reserva se disponível.
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
        // Aumentamos o orçamento de pensamento para que a IA possa "olhar" o PDF com mais calma
        thinkingConfig: { thinkingBudget: 16000 }, 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { 
                type: Type.STRING, 
                description: 'Data da transação (DD/MM/YYYY)' 
              },
              amount: { 
                type: Type.NUMBER, 
                description: 'Valor numérico (ex: 1500.50)' 
              },
              description: { 
                type: Type.STRING, 
                description: 'O que é (ex: Reserva João Silva, Taxa Airbnb, Diária #982)' 
              },
              type: { 
                type: Type.STRING, 
                description: 'Deve ser "revenue" ou "expense"' 
              }
            },
            required: ['date', 'amount', 'description', 'type']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      console.warn("A IA não conseguiu encontrar dados no PDF.");
      return [];
    }
    
    try {
      // Limpeza de segurança para garantir que o JSON seja interpretado corretamente
      const cleanedJson = text.trim()
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
        
      const records = JSON.parse(cleanedJson);
      
      if (!Array.isArray(records)) return [];

      // Sanitização adicional dos dados extraídos
      return records.map(r => ({
        ...r,
        amount: Math.abs(Number(r.amount)), // Garante que o valor seja número positivo no histórico (o tipo define se soma ou subtrai)
        type: r.type === 'expense' ? 'expense' : 'revenue'
      }));
    } catch (parseError) {
      console.error("Erro crítico ao parsear resposta da IA:", parseError, text);
      return [];
    }

  } catch (error) {
    console.error("Erro na comunicação com a IA durante extração de PDF:", error);
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