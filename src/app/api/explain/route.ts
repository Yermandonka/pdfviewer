import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY }); // User put NEXT_PUBLIC prefix

export async function POST(req: Request) {
  try {
    const { pageText, pageNumber } = await req.json();

    if (!pageText) {
      return NextResponse.json({ error: "Missing page text" }, { status: 400 });
    }

    const prompt = `
Eres un asistente de profesor universitario experto en Ciencias de la Computación.
Analiza el siguiente texto de la diapositiva y proporciona una explicación académica, detallada y clara de los conceptos presentados.
Responde SIEMPRE en ESPAÑOL.Además quiero que te adaptes a la cantidad de contenido de la página web, no te extiendas demasiado en 
diapositivas con poca información.
Usa formato Markdown para una mejor legibilidad (listas, negritas, etc.).

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
