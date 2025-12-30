
import { GoogleGenAI, Type } from "@google/genai";
import { CabinetSpecs, DesignResult } from "./types";

export const generateCabinetDesign = async (
  imageUri: string,
  specs: CabinetSpecs
): Promise<DesignResult> => {
  // دریافت کلید از محیط اجرا
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY یافت نشد. لطفاً در تنظیمات محیطی آن را تعریف کنید.");

  const ai = new GoogleGenAI({ apiKey });

  const promptText = `
    سبک: ${specs.style}
    رنگ: ${specs.color}
    متریال: ${specs.material}
    توضیحات: ${specs.extraNotes}
  `;

  // ۱. تولید تصویر بازطراحی شده
  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: imageUri.split(',')[1], mimeType: 'image/jpeg' } },
        { text: `Redesign these kitchen cabinets. Style: ${specs.style}. Maintain exact wall and floor structure. High-end realistic photo.` }
      ]
    }
  });

  let redesignedImageUrl = '';
  const parts = imageResponse.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      redesignedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  // ۲. تولید نقشه و لیست برش
  const planResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: imageUri.split(',')[1], mimeType: 'image/jpeg' } },
        { text: `ارائه لیست برش و نقشه فنی برای: ${promptText}` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          technicalDescription: { type: Type.STRING },
          cutList: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                row: { type: Type.INTEGER },
                partName: { type: Type.STRING },
                length: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                count: { type: Type.INTEGER },
                pvc: { type: Type.STRING }
              },
              required: ["row", "partName", "length", "width", "count", "pvc"]
            }
          }
        },
        required: ["technicalDescription", "cutList"]
      }
    }
  });

  const data = JSON.parse(planResponse.text || '{}');
  return {
    imageUrl: redesignedImageUrl,
    technicalDescription: data.technicalDescription || '',
    cutList: data.cutList || []
  };
};
