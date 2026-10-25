import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="focus-ring min-h-10 rounded-md border border-line bg-surface/80 px-3 py-2 text-sm text-ink shadow-sm transition placeholder:text-muted/70"
      {...props}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="focus-ring min-h-24 rounded-md border border-line bg-surface/80 px-3 py-2 text-sm text-ink shadow-sm transition placeholder:text-muted/70"
      {...props}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="focus-ring min-h-10 rounded-md border border-line bg-surface/80 px-3 py-2 text-sm text-ink shadow-sm transition"
      {...props}
    />
  );
}
