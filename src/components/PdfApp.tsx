"use client";

import PdfViewer from "./PdfViewer";
import AiCompanion from "./AiCompanion";
import { useState } from "react";

export default function PdfApp() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {!fileUrl ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">AI-Powered PDF Tutor</h1>
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md transition-all">
            Upload PDF Slide
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      ) : (
        <>
          <div className="w-1/2 h-full border-r border-gray-200 overflow-hidden flex flex-col bg-white">
            <PdfViewer fileUrl={fileUrl} />
          </div>
          <div className="w-1/2 h-full overflow-hidden flex flex-col bg-gray-50">
            <AiCompanion />
          </div>
        </>
      )}
    </div>
  );
}
