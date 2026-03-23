"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTutorStore } from "@/store/useTutorStore";
import { saveExplanation, updateDocumentPage } from "@/lib/db";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const { currentPage, setCurrentPage, setTotalPages, explanations, setExplanationStatus, activeDocumentId } = useTutorStore();
  const prefetchingRef = useRef<Set<number>>(new Set());
  
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [pageAspect, setPageAspect] = useState<number>(1.5);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: Math.max(containerRef.current.clientHeight, 200) // Ensure a min height
        });
      }
    };
    
    updateSize();
    
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateSize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const onDocumentLoadSuccess = (doc: any) => {
    setNumPages(doc.numPages);
    setTotalPages(doc.numPages);
    setPdfDoc(doc);
    // Process page 1 instantly
    ensurePageExplained(1, doc);
  };

  const ensurePageExplained = useCallback(async (pageIndex: number, doc: any = pdfDoc, force = false) => {
    if (!doc || pageIndex > doc.numPages) return;
    
    if (explanations[pageIndex]?.status === "done") return;
    if (!force && (explanations[pageIndex] || prefetchingRef.current.has(pageIndex))) return;

    prefetchingRef.current.add(pageIndex);
    // Extraemos el texto antes de setearlo en loading para ya pasarlo al estado
    let pageText = "";
    try {
      const page = await doc.getPage(pageIndex);
      const textContent = await page.getTextContent();
      pageText = textContent.items.map((item: any) => item.str).join(" ");
      
      setExplanationStatus(pageIndex, "loading", undefined, pageText);

      const previousContext: string[] = [];
      const HISTORY_PAGES = 2;
      for (let i = Math.max(1, pageIndex - HISTORY_PAGES); i < pageIndex; i++) {
        const exp = useTutorStore.getState().explanations[i];
        if (exp && exp.status === "done" && exp.content) {
          // Tomamos hasta 600 caracteres del final para dar contexto sin gastar muchos tokens
          const snippet = exp.content.length > 600 ? "..." + exp.content.slice(-600) : exp.content;
          previousContext.push(`[En la diapositiva ${i} explicaste:] ${snippet}`);
        }
      }

      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: useTutorStore.getState().apiKey, 
          pageText, 
          pageNumber: pageIndex,
          previousContext
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error || "Error al conectar con la API";
        
        if (res.status === 429 || errMsg === "RATE_LIMIT") {
          setExplanationStatus(pageIndex, "error", "⚠️ Has superado el límite de peticiones de la IA (30 peticiones por minuto). Espera unos instantes.", pageText);
        } else if (res.status === 401 || errMsg?.includes("API Key")) {
          setExplanationStatus(pageIndex, "error", "⚠️ Tu Google API Key es incorrecta o inválida. Haz clic en 'Quitar API Key' arriba y pon una correcta.", pageText);
        } else {
          setExplanationStatus(pageIndex, "error", `❌ Error de Gemini: ${errMsg}`, pageText);
        }
        return;
      }
      
      const data = await res.json();
      setExplanationStatus(pageIndex, "done", data.explanation, pageText);
      if (activeDocumentId) {
        saveExplanation(activeDocumentId, pageIndex, data.explanation).catch(console.error);
      }
    } catch (error: any) {
      console.error(error);
      setExplanationStatus(pageIndex, "error", "Error interno en el navegador.", pageText || undefined);
    }
  }, [explanations, pdfDoc, setExplanationStatus, activeDocumentId]);

  const explanationQueue = useRef<number[]>([]);
  const isProcessingQueue = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current) return;
    isProcessingQueue.current = true;

    while (explanationQueue.current.length > 0) {
      const pageToProcess = explanationQueue.current[0];
      
      const status = useTutorStore.getState().explanations[pageToProcess]?.status;
      if (status !== "done") {
        await ensurePageExplained(pageToProcess, pdfDoc, true);
      }
      
      explanationQueue.current.shift();

      if (explanationQueue.current.length > 0) {
        await new Promise(res => setTimeout(res, 2500)); // Respect API limits (2.5s)
      }
    }

    isProcessingQueue.current = false;
  }, [ensurePageExplained, pdfDoc]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pdfDoc) {
      if (timerRef.current) clearTimeout(timerRef.current);

      const delay = currentPage === 1 && !useTutorStore.getState().explanations[1] ? 0 : 600;

      timerRef.current = setTimeout(() => {
        let added = false;
        
        // Enqueue missing pages strictly from 1 up to currentPage + 1
        const maxPage = Math.min(currentPage + 1, pdfDoc.numPages);
        for (let p = 1; p <= maxPage; p++) {
          const status = useTutorStore.getState().explanations[p]?.status;
          if (status !== "done" && status !== "error" && !explanationQueue.current.includes(p)) {
            // Set loading visually so user knows it's queued
            setExplanationStatus(p, "loading", undefined, undefined); 
            explanationQueue.current.push(p);
            added = true;
          }
        }

        if (added) {
          processQueue();
        }
      }, delay);
    }

    if (activeDocumentId) {
      updateDocumentPage(activeDocumentId, currentPage).catch(console.error);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentPage, pdfDoc, activeDocumentId, processQueue, setExplanationStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === "ArrowLeft") {
        setCurrentPage(Math.max(currentPage - 1, 1));
      } else if (e.key === "ArrowRight") {
        setCurrentPage(Math.min(currentPage + 1, numPages || 1));
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, numPages, setCurrentPage]);

  const PADDING = 64;
  const baseWidth = 1400; // Render at high quality
  const baseHeight = baseWidth / pageAspect;
  const availableWidth = Math.max(0, containerSize.width - PADDING);
  const availableHeight = Math.max(0, containerSize.height - PADDING);
  const scale = Math.max(0.1, Math.min(availableWidth / baseWidth, availableHeight / baseHeight));

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      <div className="flex items-center justify-between px-4 h-16 bg-neutral-800 border-b border-neutral-700 shadow-sm z-10 shrink-0">
        <h2 className="text-lg font-semibold text-neutral-200">Presentation Viewer</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded hover:bg-neutral-700 text-neutral-300 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-neutral-400">
            Page {currentPage} of {numPages || "?"}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, numPages || 1))}
            disabled={currentPage >= (numPages || 1)}
            className="p-2 rounded hover:bg-neutral-700 text-neutral-300 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex justify-center items-center" ref={containerRef}>
        <div 
          style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'center center',
            width: `${baseWidth}px`,
            height: `${baseHeight}px`,
            willChange: 'transform'
          }} 
          className="flex justify-center items-center"
        >
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center gap-2 text-neutral-400" style={{ transform: `scale(${1/scale})` }}>
                <Loader2 className="w-6 h-6 animate-spin" /> Loading PDF...
              </div>
            }
          >
            <Page 
              pageNumber={currentPage} 
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-[0_4px_30px_rgba(0,0,0,0.5)] bg-white"
              width={baseWidth}
              onLoadSuccess={(page) => {
                const viewport = page.getViewport({ scale: 1 });
                setPageAspect(viewport.width / viewport.height);
              }}
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
