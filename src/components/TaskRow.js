'use client';

import { useState } from 'react';

const CATEGORY_STYLES = {
  work: 'bg-blue-50 text-blue-700',
  school: 'bg-purple-50 text-purple-700',
  personal: 'bg-green-50 text-green-700',
  other: 'bg-muted text-muted-foreground',
};

const PRIORITY_OPTIONS = ['normal', 'high'];
const CATEGORY_OPTIONS = ['work', 'school', 'personal', 'other'];

// Resting pill. The select wraps a styled pill so the whole control is
// clickable without native-select borders leaking into the design.
function Pill({ value, onChange, options, className }) {
  return (
    <span className={`relative inline-block rounded-full ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="task option"
        className="appearance-none rounded-full text-[10px] font-semibold uppercase tracking-[0.12em] pl-2 pr-4 py-0.5 bg-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="w-2 h-2 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function TaskRow({ task, onToggle, onRemove, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '', priority: 'normal', category: 'other' });
  const [busy, setBusy] = useState(false);

  const startEditing = () => {
    setDraft({ title: task.title, priority: task.priority, category: task.category });
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    const title = draft.title.trim();
    if (busy || !title) return;
    setBusy(true);
    try {
      await onEdit(task.id, { title, priority: draft.priority, category: draft.category });
      setEditing(false);
    } catch {
      // onEdit reverts local state on failure; stay in edit mode with the error visible
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="py-2">
        <div className="flex items-center gap-2">
          <input
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                save();
              }
              if (event.key === 'Escape') cancel();
            }}
            autoFocus
            aria-label="Edit to-do"
            className="flex-1 min-w-0 h-9 rounded-xl bg-white border border-border/80 px-3 text-sm transition-colors duration-150 ease-out focus:outline-none focus:border-[hsl(18_54%_47%)]/60 focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Pill
            value={draft.priority}
            onChange={(value) => setDraft((prev) => ({ ...prev, priority: value }))}
            options={PRIORITY_OPTIONS}
            className={draft.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground'}
          />
          <Pill
            value={draft.category}
            onChange={(value) => setDraft((prev) => ({ ...prev, category: value }))}
            options={CATEGORY_OPTIONS}
            className={CATEGORY_STYLES[draft.category] || CATEGORY_STYLES.other}
          />
          <span className="flex-1" />
          <button
            type="button"
            onClick={cancel}
            className="text-xs text-muted-foreground px-2 py-1 transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !draft.title.trim()}
            className="px-4 h-8 rounded-full bg-primary text-primary-foreground text-xs font-medium grid place-items-center transition-opacity duration-150 ease-out hover:opacity-90 disabled:opacity-40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {busy ? (
              <span className="w-3 h-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" aria-hidden="true" />
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`${task.done ? 'Reopen' : 'Finish'}: ${task.title}`}
        onClick={() => onToggle(task.id, !task.done)}
        className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border transition-colors duration-150 ease-out grid place-items-center active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
          task.done
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border hover:border-[hsl(18_54%_47%)]'
        }`}
      >
        {task.done ? (
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>

      <button
        type="button"
        onClick={startEditing}
        title="Edit to-do"
        className="flex-1 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
      >
        <p
          className={`text-sm leading-snug transition-colors duration-150 ease-out ${
            task.done ? 'line-through text-muted-foreground' : 'text-foreground hover:text-[hsl(18_54%_47%)]'
          }`}
        >
          {task.title}
        </p>
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        {task.priority === 'high' && !task.done ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-red-50 text-red-600">
            urgent
          </span>
        ) : null}
        <span className={`text-[10px] font-medium uppercase tracking-[0.12em] px-2 py-0.5 rounded-full ${CATEGORY_STYLES[task.category] || CATEGORY_STYLES.other}`}>
          {task.category}
        </span>
        <button
          type="button"
          aria-label={`Edit to-do: ${task.title}`}
          onClick={startEditing}
          className="w-6 h-6 rounded-full grid place-items-center text-muted-foreground/70 transition-colors duration-150 ease-out hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Remove: ${task.title}`}
          onClick={() => onRemove(task.id)}
          className="w-6 h-6 rounded-full grid place-items-center text-muted-foreground/70 transition-colors duration-150 ease-out hover:text-[hsl(6_62%_48%)] hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
