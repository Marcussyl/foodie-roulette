
import { GoogleGenAI, Type } from "@google/genai";

// Use process.env.API_KEY exclusively for model initialization as per guidelines
export const getFoodSuggestions = async (theme: string = "台灣在地美食"): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("未偵測到 API Key，將使用備份推薦清單。");
    return ["便當", "雞排", "牛肉麵", "水餃", "咖哩飯", "炒飯"];
  }

  try {
    // Initialize GoogleGenAI with the API key from environment variables using a named parameter
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `請根據主題「${theme}」推薦 6 個適合當晚餐的食物品項。請直接返回食物名稱列表，不要有額外描述。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["suggestions"]
        }
      }
    });

    // Access the .text property directly (do not call as a method)
    const data = JSON.parse(response.text || '{"suggestions": []}');
    return data.suggestions || [];
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["便當", "雞排", "牛肉麵", "水餃", "咖哩飯", "炒飯"]; // Fallback
  }
};
