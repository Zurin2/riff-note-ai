'use client';

import TaskRow from './TaskRow';

const CATEGORY_ORDER = ['work', 'school', 'personal', 'other'];
const CATEGORY_LABELS = { work: 'Work', school: 'School', personal: 'Personal', other: 'Other' };

export default function TaskPanel({ tasks, loading, onToggle, onRemove, onEdit }) {
  const openCount = tasks.filter((task) => !task.done).length;

  const groups = CATEGORY_ORDER.map((category) => {
    const items = tasks.filter((task) => task.category === category);
    return { category, items, open: items.filter((task) => !task.done).length };
  }).filter((group) => group.items.length > 0);

  return (
    <section className="rise rounded-[22px] bg-card border border-border/70 paper-shadow">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="font-heading text-lg">To-dos</h2>
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
          {loading ? '· · ·' : `${openCount} open`}
        </span>
      </header>

      {loading ? (
        <div className="px-5 pb-5 space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-muted shimmer-row" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="px-5 pb-5 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nothing on the list yet. Talk it out below — riff will pull the to-dos out for you.
          </p>
        </div>
      ) : (
        <div className="px-5 pb-4">
          {groups.map((group, index) => (
            <div key={group.category} className={index > 0 ? 'border-t border-border/60 mt-3 pt-3' : ''}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {CATEGORY_LABELS[group.category]}
                </h3>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {group.open}/{group.items.length}
                </span>
              </div>
              <div className="divide-y divide-border/50">
                {group.items.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={onToggle} onRemove={onRemove} onEdit={onEdit} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
