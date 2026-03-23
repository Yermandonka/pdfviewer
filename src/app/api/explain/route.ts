import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, pageText, pageNumber, detailed, previousContext } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 401 });
    }

    if (!pageText) {
      return NextResponse.json({ error: "Missing page text" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    let prompt = `
Eres un asistente de profesor universitario experto en Ciencias de la Computación.
Analiza el siguiente texto de la diapositiva y proporciona una explicación académica, detallada y clara de los conceptos presentados.
Responde SIEMPRE en ESPAÑOL. Además quiero que te adaptes a la cantidad de contenido de la página web, no te extiendas demasiado en diapositivas con poca información.
Usa formato Markdown para una mejor legibilidad. **Es obligatorio** que los conceptos, definiciones, verbos y puntos más importantes de tu texto los encierres en **negrita**, ya que el sistema los resaltará o subrayará con distintos colores pasteles para el usuario.
Si vas a utilizar fórmulas matemáticas, escríbelas en formato LaTeX usando \`$\` para fórmulas en línea y \`$$\` para bloques matemáticos separados. **PROHIBIDO** usar etiquetas HTML como <sub> o <sup> para índices o exponentes, usa SIEMPRE LaTeX (ej. $\\beta_0$). Incluso dentro de negritas, usa LaTeX (ej. **$\\beta_0$**).
`;

    if (detailed) {
      prompt += `\n**EL USUARIO HA SOLICITADO UNA EXPLICACIÓN MÁS EXHAUSTIVA Y DETALLADA.** Ignora la indicación de no extenderte demasiado. Proporciona mucho más contexto, ejemplos prácticos si aplica, y desarrolla en gran profundidad los temas mencionados en la diapositiva.\n`;
    }

    if (previousContext && Array.isArray(previousContext) && previousContext.length > 0) {
      prompt += `
### CONTEXTO DE DIAPOSITIVAS ANTERIORES ###
Para darte hilo conductor, esto fue lo último que explicaste (resumido). **Utilízalo para NO repetir introducciones ni volver a explicar a fondo conceptos que ya acabas de explicar ahí**. Sé directo y continúa con la lección:
${previousContext.join('\n')}
------------------------------------------
`;
    }

    prompt += `
Contenido de la Diapositiva actual (${pageNumber}):
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
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.status === 429) {
      return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
    }
    return NextResponse.json({ error: error.message || "Failed to generate explanation" }, { status: 500 });
  }
}
