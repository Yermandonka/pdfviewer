import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pageNumber, textContent } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la API Key de Gemini en el servidor (.env.local missing).' }, { status: 500 });
    }

    // Un prompt robusto y enfocado en educación universitaria técnica.
    const prompt = `Actúa como un profesor universitario experto ayudando a tu alumno. 
El alumno está leyendo la diapositiva número ${pageNumber} de su clase.
Texto extraído automáticamente de la diapositiva: "${textContent}"

Tu deber es proporcionar una explicación profunda, técnica y educativa sobre el contenido de esta diapositiva, expandiéndolo para que el alumno lo entienda a la perfección.

Reglas:
1. Responde en español de España de forma directa.
2. Utiliza un tono académico, motivador y claro.
3. Si lo crees útil según el contexto, añade ejemplos del mundo real, analogías cortas o curiosidades históricas sobre la materia de la diapositiva.
4. **IMPORTANTE**: Devuelve tu respuesta EXACTAMENTE usando formato HTML válido (sin envolver en bloques markdown como \`\`\`html). Empieza tu respuesta directamente con un <h3> descriptivo, usa <p> para párrafos, no uses estilos en línea, usa <ul> y <li> para listas estructuradas y usa la etiqueta <strong> para resaltar términos técnicos o palabras clave.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
       console.error("Gemini API error", response.status, await response.text());
       return NextResponse.json({ error: 'Error al contactar con Gemini.' }, { status: 502 });
    }

    const data = await response.json();
    let aiHtml = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiHtml) throw new Error("Respuesta de Gemini vacía o corrupta");

    // Sanitización básica en caso de que Gemini se salte la regla 4 y envuelva la respuesta en Markdown de código HTML
    aiHtml = aiHtml.replace(/```html(\n)?/ig, '').replace(/```(\n)?/ig, '').trim();

    return NextResponse.json({ explanation: aiHtml });
  } catch (error) {
    console.error("Error backend AI:", error);
    return NextResponse.json({ error: 'Error del servidor procesando la petición a Gemini.' }, { status: 500 });
  }
}
