import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY }); // User put NEXT_PUBLIC prefix

export async function POST(req: Request) {
  try {
    const { pageText, pageNumber, detailed } = await req.json();

    if (!pageText) {
      return NextResponse.json({ error: "Missing page text" }, { status: 400 });
    }

    let prompt = `
Eres un asistente de profesor universitario experto en Ciencias de la Computación.
Analiza el siguiente texto de la diapositiva y proporciona una explicación académica, detallada y clara de los conceptos presentados.
Responde SIEMPRE en ESPAÑOL.Además quiero que te adaptes a la cantidad de contenido de la página web, no te extiendas demasiado en 
diapositivas con poca información.
Usa formato Markdown para una mejor legibilidad. **Es obligatorio** que los conceptos, definiciones, verbos y puntos más importantes de tu texto los encierres en **negrita**, ya que el sistema los resaltará o subrayará con distintos colores pasteles para el usuario.
`;

    if (detailed) {
      prompt += `\n**EL USUARIO HA SOLICITADO UNA EXPLICACIÓN MÁS EXHAUSTIVA Y DETALLADA.** Ignora la indicación de no extenderte demasiado. Proporciona mucho más contexto, ejemplos prácticos si aplica, y desarrolla en gran profundidad los temas mencionados en la diapositiva.\n`;
    }

    prompt += `
Contenido de la Diapositiva ${pageNumber}:
---
${pageText}
---
    `.trim();

    // The user specifically requested Gemma 3 27B.
    const response = await ai.models.generateContent({
      model: "gemma-3-27b-it",
      contents: prompt,
    });

    return NextResponse.json({ explanation: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
  }
}
