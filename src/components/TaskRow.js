'use client';

const CATEGORY_STYLES = {
  work: 'bg-blue-50 text-blue-700',
  school: 'bg-purple-50 text-purple-700',
  personal: 'bg-green-50 text-green-700',
  other: 'bg-muted text-muted-foreground',
};

export default function TaskRow({ task, onToggle, onRemove }) {
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

      <p
        className={`flex-1 text-sm leading-snug ${
          task.done ? 'line-through text-muted-foreground' : 'text-foreground'
        }`}
      >
        {task.title}
      </p>

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
          aria-label={`Remove: ${task.title}`}
          onClick={() => onRemove(task.id)}
          className="w-6 h-6 rounded-full grid place-items-center text-muted-foreground/70 transition-colors duration-150 ease-out hover:text-[hsl(6_62%_48%)] hover:bg-red-50"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
