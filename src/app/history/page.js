'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/utils/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChatThread from '@/components/ChatThread';

const MESSAGE_FIELDS = 'id, role, content, note_id, created_at';
const NOTE_FIELDS = 'id, title, bullets, source_text, task_count, created_at';

function History() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [notesById, setNotesById] = useState({});

  // Initial load from an effect: the first setState happens after the fetches
  // settle (allSettled + try/finally, so one failed fetch can't kill the
  // thread and the spinner always clears).
  const load = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const [messagesResult, notesResult] = await Promise.allSettled([
        supabase.from('messages').select(MESSAGE_FIELDS).order('created_at', { ascending: false }).limit(40),
        supabase.from('notes').select(NOTE_FIELDS).order('created_at', { ascending: false }),
      ]);
      const messageData =
        messagesResult.status === 'fulfilled' ? messagesResult.value.data || [] : [];
      const noteData = notesResult.status === 'fulfilled' ? notesResult.value.data || [] : [];

      const byId = Object.fromEntries(noteData.map((note) => [note.id, note]));
      // Newest-first window, rendered oldest → newest like a real thread.
      setMessages(messageData.slice().reverse());
      setNotesById(byId);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const noteCount = Object.keys(notesById).length;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16">
      <header className="flex items-center justify-between py-5">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Today&apos;s list
        </Link>
        <p className="font-heading text-2xl tracking-tight">riff</p>
      </header>

      <h1 className="font-heading text-3xl mb-1">Full history</h1>
      <p className="text-xs text-muted-foreground mb-6 tabular-nums">
        Last {messages.length || 40} messages · {noteCount} notes
      </p>

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-[72px] rounded-[22px] bg-card border border-border/70 paper-shadow shimmer-row ${
                i % 2 ? 'ml-auto w-[60%]' : 'w-[85%]'
              }`}
            />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-[22px] bg-card border border-border/70 paper-shadow p-6 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            No rambles yet. Say something on the home page and it will show up here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block px-4 h-9 leading-[2.25rem] rounded-full bg-primary text-primary-foreground text-sm transition-opacity duration-150 ease-out hover:opacity-90 transition-transform duration-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Start talking
          </Link>
        </div>
      ) : (
        <ChatThread messages={messages} notesById={notesById} />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <History />
    </ProtectedRoute>
  );
}
