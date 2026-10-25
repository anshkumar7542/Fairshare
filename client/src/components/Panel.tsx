import type { ReactNode } from "react";

export function Panel({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass-panel rounded-lg p-5 transition duration-200">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
