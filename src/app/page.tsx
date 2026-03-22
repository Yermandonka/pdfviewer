"use client";

import dynamic from 'next/dynamic';

// Disable SSR for PdfApp because react-pdf requires browser APIs like DOMMatrix
const PdfApp = dynamic(() => import('@/components/PdfApp'), { ssr: false });

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <PdfApp />
    </main>
  );
}
