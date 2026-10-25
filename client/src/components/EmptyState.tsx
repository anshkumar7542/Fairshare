import type { ReactNode } from "react";
import { SearchCheck } from "lucide-react";

export function EmptyState({
  title,
  body,
  icon,
  compact = false
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`grid place-items-center rounded-lg border border-dashed border-line bg-elevated/35 text-center ${compact ? "p-5" : "p-8"}`}>
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-surface shadow-inner">
        <div className="relative grid size-10 place-items-center rounded-lg border border-line bg-elevated text-mint">
          {icon || <SearchCheck size={20} />}
          <span className="absolute -right-2 -top-2 size-4 rounded-full bg-mint/70" />
          <span className="absolute bottom-1 left-1 h-1.5 w-6 rounded-full bg-coral/60" />
        </div>
      </div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
