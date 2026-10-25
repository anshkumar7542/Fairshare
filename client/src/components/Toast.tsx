import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "./Button";

type ToastTone = "success" | "error" | "info";
type Toast = {
  id: string;
  title: string;
  body?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="pointer-events-auto rounded-lg border border-line bg-surface/95 p-4 shadow-2xl backdrop-blur-xl"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${toneClass(toast.tone)}`}>
                  {toast.tone === "success" ? <CheckCircle2 size={17} /> : toast.tone === "error" ? <AlertTriangle size={17} /> : <Info size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{toast.title}</p>
                  {toast.body ? <p className="mt-1 text-sm leading-5 text-muted">{toast.body}</p> : null}
                </div>
                <Button type="button" variant="ghost" className="min-h-8 px-2" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                  <X size={15} />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

function toneClass(tone: ToastTone) {
  if (tone === "success") return "bg-mint/10 text-mint";
  if (tone === "error") return "bg-coral/10 text-coral";
  return "bg-elevated text-muted";
}
