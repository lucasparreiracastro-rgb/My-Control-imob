import { GoogleGenAI } from "@google/genai";
import { Property } from '../types';

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

    // Format history for the API correctly if using chat mode, 
    // but for simple single-turn with context, generateContent with system instruction is robust.
    // Ideally we use chats.create but for stateless simplicity here we can pass history in prompt or use proper chat structure if we maintain state object.
    // Let's use ai.chats.create for better multi-turn handling if we were persisting the chat object properly.
    // Given the constraints and the stateless nature of this function call wrapper, we will construct the prompt with history or use chat object if we kept it alive.
    // Let's instantiate a fresh chat with history for this turn.
    
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