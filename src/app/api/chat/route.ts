import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY }); // Using the same API key logic as explain

export async function POST(req: Request) {
  try {
    const { pageText, query, history = [] } = await req.json();

    if (!pageText || !query) {
      return NextResponse.json({ error: "Missing page context or query" }, { status: 400 });
    }

    // Format history if available to give context
    const historyText = history.length > 0 
      ? `\nHistorial de la conversación:\n${history.map((msg: any) => `${msg.role === 'user' ? 'Estudiante' : 'Tutor'}: ${msg.content}`).join('\n')}\n`
      : "";

    const prompt = `
Eres un asistente de profesor universitario amigable y experto ayudando a un estudiante.
El usuario (estudiante) tiene una pregunta específica sobre el contenido de la diapositiva actual.

Contenido de la Diapositiva:
---
${pageText}
---
${historyText}
Pregunta del estudiante: "${query}"

Responde a la pregunta basándote en la diapositiva de forma clara y concisa en ESPAÑOL. 
Presta atención al contexto de la materia. Si aplicara, usa ejemplos sencillos para aclarar conceptos difíciles. 
Usa formato Markdown.
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemma-3-27b-it",
      contents: prompt,
    });

    return NextResponse.json({ answer: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
