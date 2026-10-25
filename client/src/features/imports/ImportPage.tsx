import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  FileUp,
  Info,
  Loader2,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Wand2,
  XCircle
} from "lucide-react";
import { Button } from "../../components/Button";
import { Field, Select } from "../../components/Field";
import { useToast } from "../../components/Toast";
import { api, postJson } from "../../lib/api";
import type { CsvImportBatch, CsvRawRow, Group, ImportAnomaly } from "../../types/domain";
import { useDemoMode } from "../demo/demoMode";

type DecisionAction = "APPROVE_IMPORT" | "IGNORE_ROW" | "FIXED_EXTERNALLY" | "NEEDS_REVIEW";
type ImportStep = "upload" | "parsing" | "preview" | "anomalies" | "decisions" | "summary";

const steps: Array<{ id: ImportStep; label: string; description: string }> = [
  { id: "upload", label: "Upload CSV", description: "Drop the exact export" },
  { id: "parsing", label: "Parse", description: "Read raw rows" },
  { id: "preview", label: "Preview", description: "Check file shape" },
  { id: "anomalies", label: "Anomalies", description: "Inspect issues" },
  { id: "decisions", label: "Decisions", description: "Approve or block" },
  { id: "summary", label: "Summary", description: "Finalize report" }
];

const decisionLabels: Record<DecisionAction, string> = {
  APPROVE_IMPORT: "Approve",
  IGNORE_ROW: "Ignore row",
  FIXED_EXTERNALLY: "Mark fixed",
  NEEDS_REVIEW: "Needs review"
};

function severityStyles(severity: ImportAnomaly["severity"]) {
  if (severity === "ERROR") {
    return {
      badge: "bg-coral/10 text-coral",
      border: "border-coral/30",
      icon: <XCircle size={14} />,
      label: "Error"
    };
  }
  if (severity === "WARNING") {
    return {
      badge: "bg-amber-500/10 text-amber-600",
      border: "border-amber-500/30",
      icon: <AlertTriangle size={14} />,
      label: "Warning"
    };
  }
  return {
    badge: "bg-mint/10 text-mint",
    border: "border-mint/30",
    icon: <Info size={14} />,
    label: "Info"
  };
}

export function ImportPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const demoMode = useDemoMode();
  const [groupId, setGroupId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [activeImportId, setActiveImportId] = useState("");
  const [step, setStep] = useState<ImportStep>("upload");
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: () => api<{ groups: Group[] }>("/api/groups") });
  const importQuery = useQuery({
    queryKey: ["import", activeImportId],
    queryFn: () => api<{ import: CsvImportBatch }>(`/api/imports/${activeImportId}`),
    enabled: Boolean(activeImportId)
  });

  const currentImport = importQuery.data?.import;
  const severityCounts = useMemo(() => summarizeAnomalies(currentImport), [currentImport]);
  const unresolvedErrors = currentImport?.anomalies.filter((anomaly) => anomaly.severity === "ERROR" && !anomaly.finalActionTaken).length || 0;
  const decidedCount = currentImport?.anomalies.filter((anomaly) => anomaly.finalActionTaken).length || 0;

  useEffect(() => {
    if (!demoMode.enabled) return;
    const demoTarget = searchParams.get("demo");
    if (!demoTarget) return;
    setGroupId("demo-flat");
    setActiveImportId("demo-import");
    setStep(demoTarget === "report" ? "summary" : "anomalies");
  }, [demoMode.enabled, searchParams]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a CSV file first");
      setStep("parsing");
      const csvText = await file.text();
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      return postJson<{ import: CsvImportBatch }>("/api/imports/preview", {
        groupId,
        fileName: file.name,
        csvText
      });
    },
    onSuccess: (data) => {
      setActiveImportId(data.import.id);
      queryClient.setQueryData(["import", data.import.id], data);
      setStep(data.import.anomalies.length ? "anomalies" : "preview");
      showToast({
        tone: data.import.anomalies.length ? "info" : "success",
        title: data.import.anomalies.length ? "Anomalies detected" : "CSV preview ready",
        body: data.import.anomalies.length ? `${data.import.anomalies.length} issues are ready for review.` : "No blocking issues found in the preview."
      });
    },
    onError: () => setStep("upload")
  });

  const actionMutation = useMutation({
    mutationFn: ({ anomalyId, finalActionTaken }: { anomalyId: string; finalActionTaken: DecisionAction }) =>
      api(`/api/imports/${activeImportId}/anomalies/${anomalyId}`, {
        method: "PATCH",
        body: JSON.stringify({ finalActionTaken })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["import", activeImportId] });
      showToast({ tone: "success", title: "Decision saved", body: "The anomaly action was recorded for the import report." });
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: () => postJson<{ import: CsvImportBatch }>(`/api/imports/${activeImportId}/finalize`, {}),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["import", activeImportId] });
      await queryClient.invalidateQueries({ queryKey: ["group", data.import.groupId] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "group", data.import.groupId] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "overall"] });
      setStep("summary");
      showToast({ tone: "success", title: "Import report generated", body: "Balances and the group view are refreshed." });
    }
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    previewMutation.mutate();
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  function handleDecision(anomalyId: string, finalActionTaken: DecisionAction) {
    actionMutation.mutate({ anomalyId, finalActionTaken });
    setStep("decisions");
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel relative overflow-hidden rounded-lg p-6">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-mint/20 via-transparent to-coral/20" />
        <div className="relative grid gap-6 xl:grid-cols-[1fr_440px] xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-semibold text-muted">
              <ShieldCheck size={14} /> Signature anomaly review
            </div>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-ink md:text-5xl">
              Turn a messy CSV into an auditable import story.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Drop the exact export, preview every row, resolve anomalies, and generate an import report without silently guessing.
            </p>
          </div>
          <StepRail active={step} currentImport={currentImport} />
        </div>
      </section>

      {step === "parsing" ? (
        <ParsingState fileName={file?.name || "expenses_export.csv"} />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-panel rounded-lg p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Step 1 - Upload</h2>
              {file && <span className="rounded-full bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">{file.name}</span>}
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <Field label="Group">
                <Select value={groupId} onChange={(event) => setGroupId(event.target.value)} required>
                  <option value="">Choose group</option>
                  {groupsQuery.data?.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`grid min-h-56 cursor-pointer place-items-center rounded-lg border border-dashed p-6 text-center transition ${
                  dragging ? "border-mint bg-mint/10" : "border-line bg-elevated/40 hover:border-mint/60 hover:bg-surface/70"
                }`}
              >
                <input
                  className="sr-only"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                <span>
                  <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-ink text-cloud shadow-xl">
                    <FileUp size={24} />
                  </span>
                  <span className="block text-lg font-bold text-ink">Drop expenses_export.csv here</span>
                  <span className="mt-1 block text-sm text-muted">or click to browse. The raw file is preserved exactly.</span>
                </span>
              </label>
              <Button type="submit" disabled={previewMutation.isPending || !groupId || !file}>
                <Wand2 size={16} /> Start premium import
              </Button>
              {previewMutation.error && <p className="text-sm text-coral">{previewMutation.error.message}</p>}
            </form>
          </div>

          <ImportPreviewPanel currentImport={currentImport} severityCounts={severityCounts} />
        </section>
      )}

      {currentImport && (
        <>
          <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <ImportStats batch={currentImport} severityCounts={severityCounts} unresolvedErrors={unresolvedErrors} decidedCount={decidedCount} />
            <ImportSummaryCard batch={currentImport} onFinalize={() => finalizeMutation.mutate()} finalizing={finalizeMutation.isPending} error={finalizeMutation.error?.message} />
          </section>

          <AnomalyCenter batch={currentImport} onDecision={handleDecision} pending={actionMutation.isPending} />
        </>
      )}
    </div>
  );
}

function StepRail({ active, currentImport }: { active: ImportStep; currentImport?: CsvImportBatch }) {
  const activeIndex = steps.findIndex((item) => item.id === active);
  return (
    <div className="grid gap-2 rounded-lg border border-line bg-surface/75 p-3">
      {steps.map((item, index) => {
        const done = index < activeIndex || (item.id === "summary" && currentImport?.report);
        const current = item.id === active;
        return (
          <div key={item.id} className={`flex items-center gap-3 rounded-md p-3 transition ${current ? "bg-mint/10" : "bg-elevated/40"}`}>
            <span className={`grid size-8 place-items-center rounded-full text-xs font-black ${done ? "bg-mint text-white" : current ? "bg-ink text-cloud" : "bg-surface text-muted"}`}>
              {done ? <Check size={15} /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{item.label}</span>
              <span className="block truncate text-xs text-muted">{item.description}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ParsingState({ fileName }: { fileName: string }) {
  return (
    <section className="glass-panel grid min-h-72 place-items-center rounded-lg p-8 text-center">
      <div>
        <div className="relative mx-auto mb-6 grid size-20 place-items-center rounded-full bg-mint/10 text-mint">
          <Loader2 className="animate-spin" size={34} />
          <span className="absolute -right-1 top-2 grid size-7 place-items-center rounded-full bg-ink text-cloud">
            <FileSpreadsheet size={14} />
          </span>
        </div>
        <h2 className="text-2xl font-bold text-ink">Parsing {fileName}</h2>
        <p className="mt-2 text-sm text-muted">Reading raw rows, checking dates, currencies, splits, duplicates, and membership periods.</p>
        <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-line">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-mint" />
        </div>
      </div>
    </section>
  );
}

function ImportPreviewPanel({ currentImport, severityCounts }: { currentImport?: CsvImportBatch; severityCounts: ReturnType<typeof summarizeAnomalies> }) {
  if (!currentImport) {
    return (
      <div className="glass-panel rounded-lg p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Step 3 - Preview</h2>
        <EmptyIllustration title="Preview appears here" body="Upload a CSV to see row count, detected anomalies, and import readiness." />
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Step 3 - Import Preview</h2>
        <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-muted">{currentImport.status}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PreviewMetric label="Rows" value={currentImport.totalRows} />
        <PreviewMetric label="Anomalies" value={currentImport.anomalies.length} />
        <PreviewMetric label="Errors" value={severityCounts.ERROR} tone="coral" />
        <PreviewMetric label="Warnings" value={severityCounts.WARNING} tone="amber" />
      </div>
      <div className="mt-4 max-h-72 overflow-auto rounded-md border border-line bg-slate-950 p-3">
        {currentImport.rows.slice(0, 5).map((row) => (
          <pre key={row.id} className="mb-3 whitespace-pre-wrap rounded-md bg-white/5 p-3 text-xs text-white">
            Row {row.rowNumber}: {JSON.stringify(row.rawData, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  );
}

function ImportStats({
  batch,
  severityCounts,
  unresolvedErrors,
  decidedCount
}: {
  batch: CsvImportBatch;
  severityCounts: ReturnType<typeof summarizeAnomalies>;
  unresolvedErrors: number;
  decidedCount: number;
}) {
  return (
    <div className="glass-panel rounded-lg p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted">Step 4 - Detection Center</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <PreviewMetric label="Errors" value={severityCounts.ERROR} tone="coral" />
        <PreviewMetric label="Warnings" value={severityCounts.WARNING} tone="amber" />
        <PreviewMetric label="Info" value={severityCounts.INFO} tone="mint" />
        <PreviewMetric label="Decisions" value={`${decidedCount}/${batch.anomalies.length}`} />
      </div>
      <div className="mt-4 rounded-md border border-line bg-elevated/50 p-4">
        <p className="text-sm font-semibold text-ink">{unresolvedErrors ? `${unresolvedErrors} blocking errors remain` : "No unresolved blocking errors"}</p>
        <p className="mt-1 text-sm text-muted">Errors need approval, ignore, fix, or review before final import decisions are complete.</p>
      </div>
    </div>
  );
}

function ImportSummaryCard({
  batch,
  onFinalize,
  finalizing,
  error
}: {
  batch: CsvImportBatch;
  onFinalize: () => void;
  finalizing: boolean;
  error?: string;
}) {
  return (
    <div className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Step 6 - Import Summary</h2>
        <SearchCheck className="text-mint" size={20} />
      </div>
      {batch.report ? (
        <div className="rounded-md border border-mint/30 bg-mint/10 p-4 text-sm text-mint">
          <p className="font-bold">Import report generated</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify(batch.report, null, 2)}</pre>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-muted">Finalize only after review decisions are recorded. Blocked rows stay out of balances.</p>
          <Button onClick={onFinalize} disabled={finalizing}>
            <CheckCircle2 size={16} /> {finalizing ? "Finalizing..." : "Generate import report"}
          </Button>
          {error && <p className="text-sm text-coral">{error}</p>}
        </div>
      )}
    </div>
  );
}

function AnomalyCenter({
  batch,
  onDecision,
  pending
}: {
  batch: CsvImportBatch;
  onDecision: (anomalyId: string, finalActionTaken: DecisionAction) => void;
  pending: boolean;
}) {
  const rowsWithAnomalies = batch.rows.filter((row) => row.anomalies.length > 0);
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Step 5 - User Decisions</h2>
          <p className="mt-2 text-2xl font-bold text-ink">Anomaly Detection Center</p>
          <p className="mt-1 text-sm text-muted">Review raw values beside parser output, then choose an explicit action.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Legend severity="ERROR" />
          <Legend severity="WARNING" />
          <Legend severity="INFO" />
        </div>
      </div>

      {rowsWithAnomalies.length ? (
        <div className="grid gap-4">
          {rowsWithAnomalies.map((row) => (
            <AnomalyRow key={row.id} row={row} onDecision={onDecision} pending={pending} />
          ))}
        </div>
      ) : (
        <EmptyIllustration title="No anomalies detected" body="This file is ready for import. Finalize to generate the report." />
      )}
    </section>
  );
}

function AnomalyRow({
  row,
  onDecision,
  pending
}: {
  row: CsvRawRow;
  onDecision: (anomalyId: string, finalActionTaken: DecisionAction) => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-elevated/45 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-ink">Row {row.rowNumber}</p>
          <p className="text-sm text-muted">{row.status} - {row.anomalies.length} issue{row.anomalies.length === 1 ? "" : "s"}</p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">Raw row preserved</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ComparisonPanel title="Original CSV row" data={row.rawData} />
        <ComparisonPanel title="Parsed preview" data={row.parsedData || { status: "Unable to normalize without review" }} />
      </div>

      <div className="mt-4 grid gap-3">
        {row.anomalies.map((anomaly) => {
          const styles = severityStyles(anomaly.severity);
          return (
            <div key={anomaly.id} className={`rounded-md border bg-surface/70 p-4 ${styles.border}`}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${styles.badge}`}>
                      {styles.icon} {styles.label}
                    </span>
                    <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-semibold text-muted">Row {anomaly.rowNumber}</span>
                    {anomaly.fieldName && <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-semibold text-muted">{anomaly.fieldName}</span>}
                  </div>
                  <p className="font-semibold text-ink">{anomaly.anomalyType}</p>
                  <p className="mt-1 text-sm text-muted">{anomaly.explanation}</p>
                  <p className="mt-2 text-sm font-semibold text-ink">Suggested action: {anomaly.suggestedAction}</p>
                </div>
                {anomaly.finalActionTaken && (
                  <span className="rounded-full bg-mint/10 px-3 py-1 text-xs font-bold text-mint">
                    {anomaly.finalActionTaken}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(decisionLabels) as DecisionAction[]).map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant={action === "APPROVE_IMPORT" ? "primary" : "secondary"}
                    className="min-h-9 px-3"
                    disabled={pending}
                    onClick={() => onDecision(anomaly.id, action)}
                  >
                    {decisionLabels[action]}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonPanel({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded-md border border-line bg-slate-950 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5 text-white">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function PreviewMetric({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "mint" | "coral" | "amber" | "neutral" }) {
  const toneClass = tone === "mint" ? "text-mint" : tone === "coral" ? "text-coral" : tone === "amber" ? "text-amber-600" : "text-ink";
  return (
    <div className="rounded-md border border-line bg-elevated/60 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Legend({ severity }: { severity: ImportAnomaly["severity"] }) {
  const styles = severityStyles(severity);
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}>{styles.icon} {styles.label}</span>;
}

function EmptyIllustration({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-line bg-elevated/35 p-8 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-surface shadow-inner">
        <div className="relative size-9 rounded-lg border border-line bg-elevated">
          <span className="absolute -right-2 -top-2 size-4 rounded-full bg-mint/70" />
          <span className="absolute bottom-1 left-1 h-2 w-6 rounded-full bg-coral/60" />
        </div>
      </div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}

function summarizeAnomalies(batch?: CsvImportBatch) {
  return {
    ERROR: batch?.anomalies.filter((item) => item.severity === "ERROR").length || 0,
    WARNING: batch?.anomalies.filter((item) => item.severity === "WARNING").length || 0,
    INFO: batch?.anomalies.filter((item) => item.severity === "INFO").length || 0
  };
}
