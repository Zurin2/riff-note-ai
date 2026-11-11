'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/utils/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Composer from '@/components/Composer';
import TaskPanel from '@/components/TaskPanel';
import NotesRail from '@/components/NotesRail';
import NoteDialog from '@/components/NoteDialog';

const NOTE_FIELDS = 'id, title, bullets, source_text, task_count, created_at';
const TASK_FIELDS = 'id, note_id, title, done, priority, category, due_hint, created_at';
const SAVED_LINE = 'Saved';
const ERROR_LINE =
  'That one slipped away. Your words are back in the box — try sending again.';

function LoadError({ onRetry }) {
  return (
    <div className="rise rounded-[22px] bg-card border border-border/70 paper-shadow p-6 text-center">
      <h2 className="font-heading text-lg">Couldn&apos;t load your list</h2>
      <p className="mt-1 text-sm text-muted-foreground">The connection dropped on the way here.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 px-4 h-9 rounded-full bg-primary text-primary-foreground text-sm transition-opacity duration-150 ease-out hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        Try again
      </button>
    </div>
  );
}

function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState(null); // { kind: 'saved'|'error', note, taskCount }
  const [dialogNote, setDialogNote] = useState(null);
  const lastSubjectRef = useRef('');
  const tasksRef = useRef([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Initial load from an effect: NO synchronous setState on the entry path —
  // the first state write happens only once the fetches have settled.
  // (Load resilience: Promise.allSettled, never Promise.all — one failing
  // fetch must not break the whole page. Vault guide §8.)
  const load = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const [notesResult, tasksResult] = await Promise.allSettled([
        supabase.from('notes').select(NOTE_FIELDS).order('created_at', { ascending: false }).limit(20),
        supabase.from('tasks').select(TASK_FIELDS).order('created_at', { ascending: false }).limit(100),
      ]);
      const notesData = notesResult.status === 'fulfilled' ? notesResult.value.data : null;
      const tasksData = tasksResult.status === 'fulfilled' ? tasksResult.value.data : null;
      setNotes(notesData || []);
      setTasks(tasksData || []);
      // Show the retry card only when *both* windows failed.
      if (!notesData && !tasksData) setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = useCallback(async (text, putBack) => {
    const subject = text.trim();
    if (!subject || lastSubjectRef.current === subject) return;
    lastSubjectRef.current = subject;
    setThinking(true);

    try {
      const supabase = getSupabase();

      // 1. Persist the raw transcript FIRST — nothing is lost if AI work fails.
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({ role: 'user', content: subject });
      if (userMsgError) throw userMsgError;

      // 2. Organize: one stateless LLM call per ramble (no chat memory).
      const response = await fetch('/api/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: subject }),
      });
      if (!response.ok) {
        // Surface a friendly line for 5xx while still preserving the words.
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error || 'Organizing failed');
      }
      const organized = await response.json();
      const newTasks = organized.tasks || [];

      // 3. Note. `select().single()` returns the row so tasks can attach note_id.
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          title: organized.title,
          bullets: organized.bullets,
          source_text: organized.source_text || subject,
          task_count: newTasks.length,
        })
        .select(NOTE_FIELDS)
        .single();
      if (noteError) throw noteError;

      // 4. To-dos, carrying note_id. `select()` returns the inserted rows with
      // real ids so optimistic toggles/deletes hit the DB immediately.
      const rows = newTasks.map((task) => ({
        title: task.title,
        done: false,
        priority: task.priority,
        category: task.category,
        due_hint: task.due_hint || '',
        note_id: note.id,
      }));
      let insertedIds = null;
      if (rows.length > 0) {
        const { data: insertedTasks, error: tasksError } = await supabase
          .from('tasks')
          .insert(rows)
          .select(TASK_FIELDS);
        if (tasksError) throw tasksError;
        insertedIds = insertedTasks;
      }

      // 5. Bookkeeping: the assistant's reply points at the note.
      const { error: replyMsgError } = await supabase
        .from('messages')
        .insert({ role: 'assistant', content: note.title, note_id: note.id });
      if (replyMsgError) throw replyMsgError;

      // 6. Local state gets the new note + tasks prepended.
      setNotes((prev) => [note, ...prev]);
      const localTasks = newTasks.map((task, i) => ({
        ...(insertedIds?.[i] || { id: `local-${i}` }),
        ...task,
        done: false,
      }));
      setTasks((prev) => [...localTasks, ...prev]);
      setStatus({ kind: 'saved', note, taskCount: newTasks.length });
      setDialogNote(note);
    } catch (error) {
      setStatus({ kind: 'error', detail: error?.message || 'unknown failure' });
      if (typeof putBack === 'function') putBack(subject); // a spoken thought is never lost
    } finally {
      lastSubjectRef.current = '';
      setThinking(false);
    }
  }, []);

  const handleToggle = useCallback(async (id, done) => {
    const previous = tasksRef.current;
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done } : task)));
    if (String(id).startsWith('local-')) return;
    const { error } = await getSupabase().from('tasks').update({ done }).eq('id', id);
    if (error) setTasks(previous); // optimistic flip reverted
  }, []);

  const handleRemove = useCallback(async (id) => {
    const previous = tasksRef.current;
    setTasks((prev) => prev.filter((task) => task.id !== id));
    if (String(id).startsWith('local-')) return;
    const { error } = await getSupabase().from('tasks').delete().eq('id', id);
    if (error) setTasks(previous);
  }, []);

  const handleDeleteNote = useCallback(async (note) => {
    setDialogNote(null);
    setNotes((prev) => prev.filter((item) => item.id !== note.id));
    setTasks((prev) => prev.filter((task) => task.note_id !== note.id)); // DB cascades, too
    setStatus(null);
    const { error } = await getSupabase().from('notes').delete().eq('id', note.id);
    if (error) load();
  }, [load]);

  const handleSaveNote = useCallback(async (noteId, { title, bullets }) => {
    const { data, error } = await getSupabase()
      .from('notes')
      .update({ title, bullets })
      .eq('id', noteId)
      .select(NOTE_FIELDS)
      .single();
    if (error) throw error;

    // Single source of truth stays the fetched row; every local view of this
    // note updates together (rail, dialog, saved-status line).
    setNotes((prev) => prev.map((item) => (item.id === noteId ? data : item)));
    setDialogNote((prev) => (prev && prev.id === noteId ? data : prev));
    setStatus((prev) =>
      prev?.kind === 'saved' && prev.note?.id === noteId ? { ...prev, note: data } : prev
    );
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    router.replace('/login');
  }, [router]);

  const doneCount = tasks.filter((task) => task.done).length;
  const openCount = tasks.length - doneCount;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28">
      {/* slim header */}
      <header className="flex items-center justify-between py-5">
        <p className="font-heading text-2xl tracking-tight">riff</p>
        <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground tabular-nums">
            {openCount} to do{openCount === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
          >
            sign out
          </button>
        </div>
      </header>

      {/* date kicker + headline + counter */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <div className="flex items-end justify-between mt-1 mb-5">
        <h1 className="font-heading text-3xl leading-tight">Today&apos;s list</h1>
        <span className="text-xs text-muted-foreground tabular-nums pb-1.5">{doneCount}/{tasks.length} done</span>
      </div>
      <div className="h-px bg-border relative mb-6" role="presentation">
        <div
          className="absolute left-0 -top-[0.5px] h-[2px] bg-[hsl(18_54%_47%)] transition-all duration-300"
          style={{ width: tasks.length ? `${(doneCount / tasks.length) * 100}%` : '0%' }}
        />
      </div>

      {failed && !loading ? (
        <LoadError
          onRetry={() => {
            // Event handler: safe to setState synchronously here.
            setFailed(false);
            setLoading(true);
            load();
          }}
        />
      ) : null}

      <TaskPanel tasks={tasks} loading={loading} onToggle={handleToggle} onRemove={handleRemove} />

      {/* composer */}
      <div className="mt-6">
        <Composer onSend={handleSubmit} thinking={thinking} />
      </div>

      {/* inline status line — keeps the to-do list in focus */}
      <p
        className="mt-4 text-xs text-muted-foreground px-1"
        aria-live="polite"
        role="status"
      >
        {status?.kind === 'saved' ? (
          <>
            {SAVED_LINE} “{status.note.title}” · {status.taskCount} to-dos added —{' '}
            <button
              type="button"
              onClick={() => setDialogNote(status.note)}
              className="underline underline-offset-2 transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none"
              style={{ color: 'hsl(18 54% 47%)' }}
            >
              read the note
            </button>
          </>
        ) : status?.kind === 'error' ? (
          <span>
            {ERROR_LINE}
            <br />
            <span className="text-[11px] opacity-70 font-mono">reason: {status.detail}</span>
          </span>
        ) : (
          ''
        )}
      </p>

      {/* recent notes rail + full history link */}
      {notes.length > 0 && !loading ? (
        <div className="mt-6">
          <NotesRail notes={notes} activeId={dialogNote?.id} onSelect={setDialogNote} />
          <div className="text-center mt-4">
            <Link
              href="/history"
              className="text-xs text-muted-foreground underline underline-offset-4 decoration-border transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none"
            >
              Full history
            </Link>
          </div>
        </div>
      ) : null}

      {/* privacy line */}
      <p className="mt-10 text-center text-[11px] text-muted-foreground">
        Only you can open your notes. Everything here is private to your account.
      </p>

      <NoteDialog
        note={dialogNote}
        open={Boolean(dialogNote)}
        onClose={() => setDialogNote(null)}
        onDelete={handleDeleteNote}
        onSave={handleSaveNote}
      />
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Home />
    </ProtectedRoute>
  );
}
