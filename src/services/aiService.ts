export async function generateExplanation(pageNumber: number, textContent: string = ""): Promise<string> {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pageNumber, textContent })
    });

    if (!res.ok) {
      throw new Error(`Error en el servidor: ${res.statusText}`);
    }

    const data = await res.json();
    
    if (data.error) throw new Error(data.error);
    
    const finalHtml = data.explanation;
    return finalHtml;
  } catch (error) {
    console.error("Error obteniendo explicación de AI real:", error);
    return `<div class="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
      <h3 class="font-bold mb-2 text-red-800">Análisis Fallido</h3>
      <p>Lo siento, ha ocurrido un error al conectar con Gemini 1.5. Asegúrate de haber reiniciado el servidor <code>npm run dev</code> después de configurar tu API Key.</p>
    </div>`;
  }
}
