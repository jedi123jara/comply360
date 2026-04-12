'use client';

import { useState, useCallback } from 'react';
import Sidebar from './_components/sidebar';
import Topbar from './_components/topbar';
import { FloatingWhatsApp } from '@/components/dashboard/floating-wa';
import FloatingAiChat from '@/components/dashboard/floating-ai-chat';
import { CommandPalette } from '@/components/ui/command-palette';
import { ErrorBoundary } from '@/components/ui/error-boundary';

/* -------------------------------------------------- */
/*  Dashboard Shell                                   */
/* -------------------------------------------------- */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggle = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const handleClose = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-white/[0.02] bg-slate-900 transition-colors">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={handleClose} />

      {/* Main area – offset by sidebar width on desktop */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <Topbar onMenuToggle={handleToggle} />

        {/* Page content */}
        <main className="p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Floating WhatsApp */}
      <FloatingWhatsApp />

      {/* Floating AI Chat — Asistente Legal */}
      <FloatingAiChat />

      {/* Global Command Palette — Ctrl+K */}
      <CommandPalette />
    </div>
  );
}
