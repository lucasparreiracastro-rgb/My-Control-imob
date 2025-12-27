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
    // Gemini 3 Pro é excelente para OCR de tabelas complexas
    const modelName = 'gemini-3-pro-preview';

    const prompt = `
      ANALISE O RELATÓRIO DE PRESTAÇÃO DE CONTAS ANEXO.
      
      EXTRAIA:
      1. RESERVAS: Nome do hóspede e período. Valor líquido (coluna "A receber"). Use type: "revenue".
      2. DESPESAS: Energia, condomínio, taxas, impostos. Use type: "expense".
      
      REGRAS:
      - Datas em DD/MM/YYYY.
      - Para reservas, a data de referência é o Check-in.
      - Retorne EXCLUSIVAMENTE um array JSON. Sem texto explicativo.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              checkIn: { type: Type.STRING },
              checkOut: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              description: { type: Type.STRING },
              type: { type: Type.STRING }
            },
            required: ['date', 'amount', 'description', 'type']
          }
        }
      }
    });

    const rawText = response.text;
    if (!rawText) throw new Error("A IA não retornou conteúdo.");
    
    // Limpeza robusta do JSON: busca apenas o conteúdo entre colchetes
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : rawText.trim()
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const records = JSON.parse(cleanedJson);
    if (!Array.isArray(records)) throw new Error("A resposta da IA não é um array válido.");

    return records.map((r: any) => ({
      date: String(r.date || ''),
      checkIn: r.checkIn ? String(r.checkIn) : undefined,
      checkOut: r.checkOut ? String(r.checkOut) : undefined,
      amount: Math.abs(parseFloat(String(r.amount || 0))),
      description: String(r.description || 'Lançamento'),
      type: r.type === 'expense' ? 'expense' : 'revenue'
    })) as RentalRecord[];

  } catch (error: any) {
    console.error("Erro na extração PDF Gemini:", error);
    throw new Error(error.message || "Erro desconhecido ao processar o PDF.");
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