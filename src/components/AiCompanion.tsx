"use client";

import { useTutorStore } from "@/store/useTutorStore";
import { Loader2, RefreshCw, Send, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState, useEffect, useRef } from "react";

export default function AiCompanion() {
  const { currentPage, totalPages, explanations, setExplanationStatus } = useTutorStore();
  
  const currentExplanation = explanations[currentPage];
  
  const progressPercentage = totalPages 
    ? Math.round((Object.keys(explanations).length / totalPages) * 100) 
    : 0;

  const [chatMessages, setChatMessages] = useState<{role: 'user'|'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear chat and input when moving to another slide
    setChatMessages([]);
    setChatInput("");
  }, [currentPage]);

  useEffect(() => {
    // Scroll to bottom of chat
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

  const handleRegenerate = async () => {
    if (!currentExplanation?.pageText) {
      alert("❌ Este PDF antiguo no tiene el texto guardado en memoria. Para usar el Chat o Regenerar, por favor borra el PDF y vuelve a subirlo.");
      return;
    }
    
    setExplanationStatus(currentPage, "loading", undefined, currentExplanation.pageText);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: useTutorStore.getState().apiKey,
          pageText: currentExplanation.pageText, 
          pageNumber: currentPage,
          detailed: true
        }),
      });

      if (res.status === 429) throw new Error("RATE_LIMIT");
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      setExplanationStatus(currentPage, "done", data.explanation, currentExplanation.pageText);
    } catch (error: any) {
      console.error(error);
      const isRateLimit = error.message === "RATE_LIMIT";
      setExplanationStatus(currentPage, "error", isRateLimit ? "⚠️ Límite de la IA alcanzado. Por favor, espera unos instantes." : undefined, currentExplanation.pageText);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    if (!currentExplanation?.pageText) {
      alert("❌ Este PDF antiguo no tiene el texto guardado en memoria. Para usar el Chat o Regenerar, por favor borra el PDF y vuelve a subirlo.");
      return;
    }

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: useTutorStore.getState().apiKey,
          pageText: currentExplanation.pageText, 
          query: userMessage,
          history: chatMessages.slice(-4)
        }),
      });

      if (res.status === 429) throw new Error("RATE_LIMIT");
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      
      setChatMessages(prev => [...prev, { role: 'ai', content: data.answer }]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      const isRateLimit = error.message === "RATE_LIMIT";
      setChatMessages(prev => [...prev, { role: 'ai', content: isRateLimit ? "⚠️ **Límite de la IA alcanzado.** Por favor, espera unos instantes e inténtalo de nuevo." : "Lo siento, ha ocurrido un error al intentar responder." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Prevent left/right arrow keys from triggering PDF slide change when typing in chat
      e.stopPropagation();
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900">
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

      <div className="flex-1 overflow-y-auto p-10 pb-4">
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
          <>
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
            
            {/* Regenerate Button (Smaller and Functional) */}
            <div className="mt-8 flex justify-end pb-4 border-b border-neutral-800">
              <button 
                onClick={handleRegenerate}
                title="Regenerate with more detail"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Más detalle
              </button>
            </div>

            {/* Chat Area */}
            {chatMessages.length > 0 && (
              <div className="mt-6 flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">Q&A</h3>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                    <div className={`p-3 rounded-xl max-w-[85%] ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-bl-none prose prose-invert prose-sm'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm m-0">{msg.content}</p>
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-blue-900/50 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-3 justify-start items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="p-3 bg-neutral-800 border border-neutral-700 rounded-xl rounded-bl-none flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </>
        )}
      </div>

      {currentExplanation?.status === "done" && (
        <div className="p-4 bg-neutral-950 border-t border-neutral-800">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Haz una pregunta sobre esta diapositiva..."
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              disabled={isChatLoading}
            />
            <button
              type="submit"
              disabled={isChatLoading || !chatInput.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
