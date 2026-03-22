"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTutorStore } from "@/store/useTutorStore";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const { currentPage, setCurrentPage, setTotalPages, explanations, setExplanationStatus } = useTutorStore();
  const prefetchingRef = useRef<Set<number>>(new Set());
  
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Leave some margin (64px total padding)
        setContainerWidth(containerRef.current.clientWidth - 64);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
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
    } catch (error) {
      console.error(error);
      setExplanationStatus(pageIndex, "error");
    }
  }, [explanations, pdfDoc, setExplanationStatus]);

  useEffect(() => {
    if (pdfDoc) {
      ensurePageExplained(currentPage);
      // Pre-fetch next page silently
      ensurePageExplained(currentPage + 1);
    }
  }, [currentPage, pdfDoc, ensurePageExplained]);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-10">
        <h2 className="text-lg font-semibold text-gray-800">Presentation Viewer</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-gray-600">
            Page {currentPage} of {numPages || "?"}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, numPages || 1))}
            disabled={currentPage >= (numPages || 1)}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex justify-center p-8" ref={containerRef}>
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center gap-2 text-gray-500 mt-20">
              <Loader2 className="w-6 h-6 animate-spin" /> Loading PDF...
            </div>
          }
        >
          <Page 
            pageNumber={currentPage} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-xl"
            width={containerWidth}
          />
        </Document>
      </div>
    </div>
  );
}
