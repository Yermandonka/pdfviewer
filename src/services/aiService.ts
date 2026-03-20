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
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error en el servidor: ${res.statusText}`);
    }

    const data = await res.json();
    
    if (data.error) throw new Error(data.error);
    
    const finalHtml = data.explanation;
    return finalHtml;
  } catch (error: any) {
    console.error("Error obteniendo explicación de AI real:", error);
    
    if (error.message.includes("Límite") || error.message.includes("429")) {
        return `<div class="p-4 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg">
          <h3 class="font-bold mb-2 text-orange-900 flex items-center gap-2">⚠️ Límite de API Alcanzado</h3>
          <p>${error.message}</p>
          <p class="text-xs mt-3 text-orange-600 italic">Tip del Tutor: Google AI Studio permite ~15 consultas gratuitas por minuto. Como esta aplicación lee las hojas por adelantado (Pre-fetching) automáticamente para darte cero letargo, es normal agotar este límite si avanzas 10 páginas de golpe. Simplemente espera 60 segundos.</p>
        </div>`;
    }

    return `<div class="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
      <h3 class="font-bold mb-2 text-red-800">Análisis Fallido</h3>
      <p>${error.message || "Ha ocurrido un error inesperado al conectar con Gemini."}</p>
    </div>`;
  }
}
