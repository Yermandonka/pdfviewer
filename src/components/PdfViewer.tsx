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

  const ensurePageExplained = useCallback(async (pageIndex: number, doc: any = pdfDoc) => {
    if (!doc || pageIndex > doc.numPages) return;
    if (explanations[pageIndex] || prefetchingRef.current.has(pageIndex)) return;

    prefetchingRef.current.add(pageIndex);
    setExplanationStatus(pageIndex, "loading");

    try {
      const page = await doc.getPage(pageIndex);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");

      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageText, pageNumber: pageIndex }),
      });

      if (!res.ok) throw new Error("API Error");
      
      const data = await res.json();
      setExplanationStatus(pageIndex, "done", data.explanation);
      if (activeDocumentId) {
        saveExplanation(activeDocumentId, pageIndex, data.explanation).catch(console.error);
      }
    } catch (error) {
      console.error(error);
      setExplanationStatus(pageIndex, "error");
    }
  }, [explanations, pdfDoc, setExplanationStatus, activeDocumentId]);

  useEffect(() => {
    if (pdfDoc) {
      ensurePageExplained(currentPage);
      // Pre-fetch next page silently
      ensurePageExplained(currentPage + 1);
    }
    if (activeDocumentId) {
      updateDocumentPage(activeDocumentId, currentPage).catch(console.error);
    }
  }, [currentPage, pdfDoc, ensurePageExplained, activeDocumentId]);

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
