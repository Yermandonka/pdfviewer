"use client";

import PdfViewer from "./PdfViewer";
import AiCompanion from "./AiCompanion";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { saveDocument, getDocuments, DocumentMeta, getDocumentBlob, getExplanations, deleteDocument } from "@/lib/db";
import { useTutorStore } from "@/store/useTutorStore";
import { FileText, Upload, Trash2, ArrowLeft } from "lucide-react";

export default function PdfApp() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const { activeDocumentId, setActiveDocument, loadExplanations, resetDocState } = useTutorStore();

  const refreshDocs = async () => {
    setDocs(await getDocuments());
  };

  useEffect(() => { refreshDocs(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const id = uuidv4();
      await saveDocument(id, file.name, file);
      await refreshDocs();
      await openDocument(id);
    }
  };

  const openDocument = async (id: string) => {
    const blob = await getDocumentBlob(id);
    if (!blob) return;
    const exps = await getExplanations(id);
    
    resetDocState();
    setActiveDocument(id);
    setFileUrl(URL.createObjectURL(blob));
    loadExplanations(exps as any);
  };

  const closeDocument = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(null);
    resetDocState();
  };

  const removeDoc = async (id: string, e: any) => {
    e.stopPropagation();
    await deleteDocument(id);
    refreshDocs();
  };

  if (!activeDocumentId) {
    return (
      <div className="flex flex-col h-screen w-full bg-neutral-900 overflow-hidden text-neutral-200">
        <header className="px-8 py-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
          <h1 className="text-2xl font-bold">pdfviewer Explorer</h1>
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload PDF
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
          </label>
        </header>
        <main className="flex-1 px-8 py-10 overflow-y-auto bg-neutral-900 border-t border-neutral-950">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500">
              <FileText className="w-20 h-20 mb-6 opacity-40" />
              <p className="text-xl">Your saved presentations will appear here.</p>
              <p className="text-sm mt-2">Upload a PDF to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {docs.map((doc) => (
                <div 
                  key={doc.id} 
                  onClick={() => openDocument(doc.id)}
                  className="bg-neutral-800 border border-neutral-700 rounded-xl p-5 hover:bg-neutral-700 hover:border-blue-500 cursor-pointer shadow-sm transition-all flex flex-col group transform hover:-translate-y-1"
                >
                  <div className="flex-1 flex items-center justify-center py-6 text-blue-400">
                    <FileText className="w-16 h-16" />
                  </div>
                  <div className="flex justify-between items-start mt-2 border-t border-neutral-700 pt-3">
                    <div className="overflow-hidden pr-2">
                      <h3 className="font-semibold text-neutral-200 truncate" title={doc.name}>{doc.name}</h3>
                      <p className="text-xs text-neutral-400 mt-1">{new Date(doc.timestamp).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={(e) => removeDoc(doc.id, e)} 
                      className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-neutral-900 overflow-hidden text-neutral-200 flex-col">
      <header className="px-4 h-12 border-b border-neutral-800 bg-neutral-950 flex items-center">
         <button onClick={closeDocument} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors py-1.5 px-3 rounded hover:bg-neutral-800">
            <ArrowLeft className="w-4 h-4" /> Back to Explorer
         </button>
      </header>
      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-1/2 h-full border-r border-neutral-700 overflow-hidden flex flex-col bg-neutral-900">
          <PdfViewer fileUrl={fileUrl!} />
        </div>
        <div className="w-1/2 h-full overflow-hidden flex flex-col bg-neutral-800 shadow-inner">
          <AiCompanion />
        </div>
      </div>
    </div>
  );
}
