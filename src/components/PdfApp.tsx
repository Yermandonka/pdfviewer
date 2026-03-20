"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ChevronLeft, ChevronRight, RefreshCw, FileText, Loader2 } from "lucide-react";
import { useExplanationStore } from "@/store/useExplanationStore";
import { generateExplanation } from "@/services/aiService";

// Configurar Worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

export default function PdfApp() {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { explanations, activeFetches, setExplanation, startFetch, finishFetch, clearExplanations } = useExplanationStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Renderizar la página actual en el canvas
  const renderPage = useCallback((doc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    if (doc && canvasRef.current) {
      doc.getPage(pageNum).then((page) => {
        // Usar una escala interna amplia (1.5) y dejar que CSS object-fit/width re-escale para Responsividad.
        // Esto previene que el canvas se encoga progresivamente al re-leer anchuras previas.
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;
        
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        
        // CSS properties to ensure it scales strictly to fit the parent container
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.objectFit = "contain";

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          transform: transform ?? undefined,
          viewport: viewport
        };
        page.render(renderContext);
      });
    }
  }, []);

  // Función asíncrona para desencadenar la generación y actualización del estado
  const fetchExplanationData = useCallback(async (targetPageNum: number, doc: pdfjsLib.PDFDocumentProxy, forceRegenerate = false) => {
    // Si ya existe (o se está buscando) y no forzamos, retorna
    if (!forceRegenerate && (explanations[targetPageNum] || activeFetches.has(targetPageNum))) {
       return; 
    }
    
    startFetch(targetPageNum);

    try {
        let detectedText = "";
        if (doc) {
            const pageData = await doc.getPage(targetPageNum);
            const textContent = await pageData.getTextContent();
            detectedText = textContent.items.map((s: any) => s.str).join(" ");
        }
        
        const resultHtml = await generateExplanation(targetPageNum, detectedText);
        setExplanation(targetPageNum, { status: "done", html: resultHtml });
    } catch (e) {
        setExplanation(targetPageNum, { status: "error", html: "<p class='text-red-500'>Error al conectar con la IA.</p>" });
    } finally {
        finishFetch(targetPageNum);
    }
  }, [explanations, activeFetches, setExplanation, startFetch, finishFetch]);

  const loadPdf = useCallback(async (fileUrlOrData: string) => {
    try {
      setLoadingPdf(true);
      setPdfError(null);
      
      const loadingTask = pdfjsLib.getDocument(fileUrlOrData);
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setPageNumber(1);
      setLoadingPdf(false);
      
      clearExplanations();
      
      renderPage(doc, 1);
      fetchExplanationData(1, doc);
      
      if (doc.numPages > 1) {
          fetchExplanationData(2, doc);
      }
    } catch (err) {
      console.error(err);
      setPdfError("Error crítico al cargar el PDF. Verifica que el archivo sea válido.");
      setLoadingPdf(false);
    }
  }, [renderPage, clearExplanations, fetchExplanationData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      const fileUrl = URL.createObjectURL(file);
      loadPdf(fileUrl);
    } else {
      setPdfError("Por favor selecciona un archivo PDF válido.");
    }
  };

  const changePage = (delta: number) => {
    const newPage = Math.min(Math.max(1, pageNumber + delta), numPages);
    if (newPage !== pageNumber && pdfDoc) {
        setPageNumber(newPage);
        renderPage(pdfDoc, newPage);
    }
  };

  // Pre-fetching de proximidad (useEffect)
  useEffect(() => {
    if (pdfDoc && pageNumber <= numPages) {
        for (let offset = 1; offset <= 2; offset++) {
            const lookaheadPage = pageNumber + offset;
            if (lookaheadPage <= numPages) {
                fetchExplanationData(lookaheadPage, pdfDoc, false);
            }
        }
    }
  }, [pageNumber, numPages, pdfDoc, fetchExplanationData]);

  // UI calculations
  const progressPercentage = numPages > 0 ? (Object.values(explanations).filter(e => e.status === 'done').length / numPages) * 100 : 0;
  const currentExplanation = explanations[pageNumber];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 relative overflow-hidden text-slate-800">
      {/* GLOBAL PROGRESS BAR */}
      <div className="absolute top-0 w-full h-1 bg-slate-200 z-50">
        <div className="h-full bg-indigo-500 transition-all duration-700 ease-out" style={{ width: `${progressPercentage}%` }}></div>
      </div>
      
      {/* PANEL IZQUIERDO: RENDERIZADOR PDF */}
      <div className="flex-1 flex flex-col bg-slate-100/50 relative border-r border-slate-200 z-10 w-full h-1/2 md:h-full">
        
        <header className="px-5 py-4 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50/80 rounded-xl text-indigo-600 border border-indigo-100 shadow-sm"><FileText size={20} /></div>
            <div>
                <h1 className="font-bold text-base text-slate-900 leading-none tracking-tight">Material Didáctico</h1>
                <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">AI-Powered Slide Tutor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
              {!pdfDoc && (
                 <label className="cursor-pointer px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:shadow-md transition-all text-white text-sm font-semibold rounded-lg shadow-sm">
                    Cargar Diapositivas
                    <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                 </label>
              )}

              {pdfDoc && (
                <div className="flex items-center gap-4">
                  <div className="px-3.5 py-1 bg-slate-100/80 text-slate-600 rounded-lg text-sm font-semibold border border-slate-200 tabular-nums">
                     Pág. {pageNumber} / {numPages}
                  </div>
                  <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <button 
                      onClick={() => changePage(-1)} 
                      disabled={pageNumber <= 1}
                      className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="w-[1px] bg-slate-200"></div>
                    <button 
                      onClick={() => changePage(1)} 
                      disabled={pageNumber >= numPages}
                      className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center relative custom-scrollbar">
          {!pdfDoc && !loadingPdf && (
            <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed max-w-sm transform hover:-translate-y-1 transition-transform duration-300">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5"><FileText className="h-8 w-8 text-slate-400" /></div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Ningún documento cargado</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">Selecciona tus diapositivas académicas. La IA las procesará en segundo plano asegurando 0-latencia de lectura.</p>
              <label className="cursor-pointer inline-flex items-center px-6 py-3 border-2 border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                 Cargar Archivo PDF
                 <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
              </label>
            </div>
          )}
          {loadingPdf && (
              <div className="flex flex-col items-center p-8 bg-white/50 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100">
                  <Loader2 className="h-10 w-10 text-indigo-500 mb-4 animate-spin" />
                  <span className="text-sm font-semibold text-slate-700 tracking-wide animate-pulse">Analizando documento matriz...</span>
              </div>
          )}
          {pdfError && <div className="text-red-600 font-medium px-5 py-4 bg-red-50 border border-red-200 rounded-xl shadow-sm max-w-md text-center">{pdfError}</div>}
          
          <div className={`relative transition-all duration-500 ease-out origin-top shadow-2xl ring-1 ring-slate-900/5 rounded-md ${pdfDoc ? 'opacity-100 scale-100' : 'opacity-0 scale-95 hidden'}`}>
             <canvas ref={canvasRef} className="rounded-md w-full h-auto bg-white" style={{ minHeight: '300px' }}></canvas>
             
             {explanations[pageNumber + 1]?.status === 'loading' && (
               <div className="absolute -bottom-10 right-0 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 shadow-sm animate-pulse">
                  <Loader2 className="h-3 w-3 text-indigo-500 animate-spin" /> Pre-fetching página {pageNumber + 1}...
               </div>
             )}
          </div>
        </main>
      </div>

      {/* PANEL DERECHO: AI COMPANION */}
      <div className="w-full md:w-[460px] lg:w-[500px] bg-white flex flex-col relative shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] border-l border-slate-200 h-1/2 md:h-full custom-scrollbar">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-transparent pointer-events-none"></div>
        
        <header className="px-6 py-5 border-b border-slate-100 relative bg-white/80 backdrop-blur-md z-10 flex justify-between items-center sticky top-0">
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2 tracking-tight">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Tutor AI Asistente
            </h2>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wide">Contexto Dinámico</p>
          </div>
          {currentExplanation?.status === 'done' && (
            <button 
                onClick={() => { if(pdfDoc) fetchExplanationData(pageNumber, pdfDoc, true); }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                title="Regenerar con más detalle"
            >
                <RefreshCw size={14} />
                Regenerar detalle
            </button>
          )}
        </header>
        
        <div className="flex-1 overflow-auto p-6 md:p-8 relative z-10 custom-scrollbar">
          
          {!pdfDoc && (
             <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-lg shadow-indigo-200 mb-6">
                    <div className="w-full h-full bg-white rounded-[23px] flex items-center justify-center">
                       <FileText size={32} className="text-indigo-500" />
                    </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Motor de Análisis Inactivo</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[260px]">Una vez importes un archivo, procesaré las páginas en segundo plano para servirte resúmenes académicos inteligentes.</p>
             </div>
          )}
        
          {pdfDoc && currentExplanation?.status === 'loading' && (
            <div className="animate-pulse flex flex-col gap-6 w-full">
              <div className="flex gap-4 items-center mb-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-full shrink-0 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-indigo-300"></div>
                </div>
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              </div>
              <div className="space-y-4">
                  <div className="h-3 bg-slate-100 rounded w-full"></div>
                  <div className="h-3 bg-slate-100 rounded w-11/12"></div>
                  <div className="h-3 bg-slate-100 rounded w-4/5"></div>
              </div>
              <div className="space-y-4 mt-4">
                  <div className="h-3 bg-slate-100 rounded w-full"></div>
                  <div className="h-3 bg-slate-100 rounded w-3/4"></div>
              </div>
              
              <div className="relative p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-100 mt-6 h-36 w-full flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-2 bg-indigo-200"></div>
                <Loader2 className="h-6 w-6 text-indigo-400 mb-3 animate-spin" />
                <span className="text-xs font-semibold text-indigo-800">Sintetizando conocimientos...</span>
              </div>
            </div>
          )}

          {pdfDoc && currentExplanation?.status === 'done' && (
            <div className="prose prose-sm prose-slate max-w-none 
                prose-headings:font-bold prose-headings:text-slate-800 prose-headings:mb-4 prose-headings:-mt-2
                prose-h3:text-lg prose-h3:tracking-tight prose-h3:text-indigo-950
                prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-5 prose-p:text-[14px]
                prose-ul:text-slate-600 prose-ul:my-5 
                prose-li:my-2 prose-li:leading-relaxed marker:text-indigo-400
                prose-strong:text-slate-900 prose-strong:font-semibold
                prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
                prose-em:text-emerald-800 prose-em:not-italic prose-em:bg-emerald-50 prose-em:px-2 prose-em:py-1 prose-em:rounded-md prose-em:font-medium inline-block
                ">
              <div 
                  dangerouslySetInnerHTML={{ __html: currentExplanation.html }} 
                  className="animate-in fade-in duration-500 ease-out origin-top border-l-2 border-indigo-200 pl-4" 
              />
            </div>
          )}
        </div>
        
        <footer className="px-6 py-4 bg-slate-50/80 backdrop-blur border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center shrink-0 z-20 font-medium">
            <span>Cache hit instantáneo.</span>
            <span className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div> 
                Memoria Activa
            </span>
        </footer>
      </div>
    </div>
  );
}
