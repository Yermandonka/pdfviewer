"use client";

import { useTutorStore } from "@/store/useTutorStore";
import { Loader2, RefreshCw } from "lucide-react";
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
      <div className="px-4 h-16 bg-neutral-800 border-b border-neutral-700 shadow-sm z-10 flex items-center justify-end shrink-0">
        {totalPages && (
          <div className="flex items-center gap-3 text-sm text-neutral-400">
            <span>{progressPercentage}% Analyzed</span>
            <div className="w-32 bg-neutral-700 rounded-full h-2.5">
              <div 
                className="bg-purple-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }} 
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-10">
        {!currentExplanation || currentExplanation.status === "loading" ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
            <div className="h-4 bg-neutral-700 rounded"></div>
            <div className="h-4 bg-neutral-700 rounded"></div>
            <div className="h-4 bg-neutral-700 rounded w-5/6"></div>
            <div className="pt-4 flex items-center gap-2 text-purple-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Generating academic explanation...</span>
            </div>
          </div>
        ) : currentExplanation.status === "error" ? (
          <div className="text-red-400 p-4 bg-red-900/20 rounded-lg border border-red-900/50">
            Failed to generate explanation for this slide.
          </div>
        ) : (
          <div className="prose prose-invert max-w-none text-justify">
            <ReactMarkdown
              components={{
                strong: ({ node, ...props }) => {
                  const contentString = String(props.children);
                  const colors = [
                    "bg-blue-200 text-blue-950",
                    "bg-yellow-200 text-yellow-950",
                    "bg-red-200 text-red-950",
                    "bg-green-200 text-green-950",
                    "bg-pink-200 text-pink-950",
                  ];
                  // Deterministic color assignment based on content
                  const hash = contentString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const colorClass = colors[hash % colors.length];
                  
                  return (
                    <mark className={`${colorClass} px-1.5 py-0.5 mx-0.5 rounded font-bold`}>
                      {props.children}
                    </mark>
                  );
                }
              }}
            >
              {currentExplanation.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {currentExplanation?.status === "done" && (
        <div className="p-4 bg-neutral-800 border-t border-neutral-700">
          <button 
            onClick={handleRegenerate}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg border border-neutral-600 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate with more detail
          </button>
        </div>
      )}
    </div>
  );
}
