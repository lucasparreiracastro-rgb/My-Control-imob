
import { GoogleGenAI } from "@google/genai";
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
      model: 'gemini-2.5-flash',
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
    
    const prompt = `
      Analise este documento financeiro/extrato. 
      Identifique todas as entradas de valores referentes a diárias, aluguéis ou pagamentos recebidos.
      
      Extraia:
      1. A data da transação (formato DD/MM/YYYY)
      2. O valor monetário (número positivo)
      3. Uma breve descrição (ex: "Diária Airbnb", "Pagamento Aluguel")

      Retorne APENAS um JSON array puro, sem markdown, no formato:
      [
        { "date": "string", "amount": number, "description": "string" }
      ]
      
      Se não encontrar nada, retorne [].
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Pdf } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const rawData = JSON.parse(text);
    
    // Add default type 'revenue' to extracted data
    return rawData.map((item: any) => ({
      ...item,
      type: 'revenue'
    })) as RentalRecord[];

  } catch (error) {
    console.error("Error extracting PDF data:", error);
    return [];
  }
};

export const searchImages = async (query: string): Promise<string[]> => {
  try {
    const ai = getAiClient();
    
    // Use Pollinations.ai for real-time image generation via URL.
    // We need Gemini to translate the user's query (usually in Portuguese) 
    // into short, effective English visual prompts.
    
    const prompt = `
      Transform the following search query: "${query}" into 4 DISTINCT, SHORT, VISUAL keywords in English.
      Keep each string under 6 words.
      Focus on architecture, interior design, and realism.
      
      Example Input: "Apartamento luxo jardins"
      Example Output: [
        "luxury modern apartment living room interior",
        "modern building facade glass architecture",
        "cozy bedroom apartment city view",
        "luxury kitchen marble countertop interior"
      ]

      Return ONLY the JSON array of strings.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned");
    
    const descriptions = JSON.parse(text) as string[];

    // Map descriptions to Pollinations.ai URLs
    // Using model=flux for better quality and adding a random seed to ensure variety
    return descriptions.map(desc => {
      const encoded = encodeURIComponent(desc);
      const randomSeed = Math.floor(Math.random() * 10000);
      return `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&nologo=true&model=flux&seed=${randomSeed}`;
    });

  } catch (error) {
    console.error("Error searching images:", error);
    
    // Fallback: Create simple URL based on original query
    // Strip special chars and keep it simple
    const cleanQuery = query.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").slice(0, 3).join(" ");
    const encoded = encodeURIComponent(cleanQuery + " real estate architecture");
    
    return [
      `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&nologo=true&model=flux&seed=101`,
      `https://image.pollinations.ai/prompt/${encoded}%20interior?width=800&height=600&nologo=true&model=flux&seed=202`,
      `https://image.pollinations.ai/prompt/${encoded}%20modern?width=800&height=600&nologo=true&model=flux&seed=303`,
      `https://image.pollinations.ai/prompt/${encoded}%20view?width=800&height=600&nologo=true&model=flux&seed=404`
    ];
  }
};

export const chatWithPortfolio = async (
  message: string,
  portfolio: Property[],
  history: { role: 'user' | 'model'; text: string }[] = []
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Convert portfolio to a simplified string representation for context
    const portfolioContext = portfolio.map(p => 
      `- ID: ${p.id}, ${p.type} em ${p.address}, ${p.bedrooms} quartos, R$ ${p.price}, Status: ${p.status}. Detalhes: ${p.title}`
    ).join('\n');

    const systemInstruction = `
      Você é o "Corretor AI", um assistente virtual inteligente do sistema ImobControl AI.
      Seu objetivo é ajudar corretores de imóveis a gerenciar seu portfólio e responder perguntas sobre os imóveis cadastrados.
      
      DADOS DO PORTFÓLIO ATUAL (Use isso para responder perguntas específicas):
      ${portfolioContext}
      
      DIRETRIZES:
      1. Seja profissional, prestativo e direto.
      2. Se o usuário perguntar sobre preços, calcule médias ou totais se solicitado.
      3. Se perguntarem sobre um imóvel específico, use os detalhes fornecidos.
      4. Se a pergunta não for sobre imóveis, tente ajudar de forma geral sobre o mercado imobiliário.
      5. Responda sempre em Português do Brasil.
    `;
    
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
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
