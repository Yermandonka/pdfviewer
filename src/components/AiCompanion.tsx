"use client";

import { useTutorStore } from "@/store/useTutorStore";
import { BrainCircuit, Loader2, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AiCompanion() {
  const { currentPage, totalPages, explanations, setExplanationStatus } = useTutorStore();
  
  const currentExplanation = explanations[currentPage];
  
  const progressPercentage = totalPages 
    ? Math.round((Object.keys(explanations).length / totalPages) * 100) 
    : 0;

  const handleRegenerate = async () => {
    // Basic regenerate mock - in a real app, this might force standard cache override
    // For now we'll just clear the status if needed, but since we rely on PdfViewer to fetch,
    // we might need a more complex signal. We'll simply alert for now.
    alert("Regeneration triggered - would re-fetch API here.");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-800">AI Tutor Companion</h2>
        </div>
        
        {totalPages && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{progressPercentage}% Analyzed</span>
            <div className="w-32 bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-purple-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }} 
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!currentExplanation || currentExplanation.status === "loading" ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="pt-4 flex items-center gap-2 text-purple-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Generating academic explanation...</span>
            </div>
          </div>
        ) : currentExplanation.status === "error" ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-100">
            Failed to generate explanation for this slide.
          </div>
        ) : (
          <div className="prose max-w-none prose-p:text-black prose-headings:text-black prose-strong:text-black prose-li:text-black text-black">
            <ReactMarkdown>{currentExplanation.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {currentExplanation?.status === "done" && (
        <div className="p-4 bg-white border-t border-gray-200">
          <button 
            onClick={handleRegenerate}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate with more detail
          </button>
        </div>
      )}
    </div>
  );
}
