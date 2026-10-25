import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  FileJson,
  ReceiptText,
  Scale,
  SearchCheck,
  WalletCards
} from "lucide-react";
import { Button } from "../../components/Button";
import { Panel } from "../../components/Panel";
import { api } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import type { BalanceExplanation, BalanceExplanationLine } from "../../types/domain";

type AuditLine = BalanceExplanationLine & {
  runningTotalCents: number;
  direction: "credit" | "debit";
};

export function BalanceExplanationPage() {
  const { groupId, userId } = useParams();
  const explanationQuery = useQuery({
    queryKey: ["balances", "explanation", groupId, userId],
    queryFn: () => api<{ explanation: BalanceExplanation }>(`/api/balances/groups/${groupId}/explanation/${userId}`),
    enabled: Boolean(groupId && userId)
  });

  const explanation = explanationQuery.data?.explanation;
  const auditLines = useMemo(() => buildAuditLines(explanation), [explanation]);
  const expenseCount = auditLines.filter((line) => line.type === "EXPENSE").length;
  const settlementCount = auditLines.filter((line) => line.type === "SETTLEMENT").length;
  const positiveTotal = auditLines.filter((line) => line.deltaCents > 0).reduce((sum, line) => sum + line.deltaCents, 0);
  const negativeTotal = Math.abs(auditLines.filter((line) => line.deltaCents < 0).reduce((sum, line) => sum + line.deltaCents, 0));

  if (explanationQuery.isLoading) return <AuditSkeleton />;
  if (explanationQuery.error || !explanation) {
    return <p className="text-coral">Unable to load balance explanation.</p>;
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel relative overflow-hidden rounded-lg p-6">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-mint/20 via-transparent to-coral/20" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface/75 px-3 py-1 text-xs font-semibold text-muted">
              <SearchCheck size={14} /> Why this balance?
            </div>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-ink md:text-5xl">
              Trace every rupee for {explanation.user.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Expenses, settlements, CSV evidence, and running totals are shown in the exact order they changed the balance.
            </p>
          </div>
          <Link to={`/groups/${groupId}`}>
            <Button type="button" variant="secondary">
              <ArrowLeft size={16} /> Back to group
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AuditMetric
          label="Final balance"
          value={formatMoney(explanation.netCents)}
          caption={explanation.netCents >= 0 ? "Net amount others owe this user." : "Net amount this user owes."}
          tone={explanation.netCents >= 0 ? "mint" : "coral"}
          icon={<Scale size={18} />}
        />
        <AuditMetric
          label="Expense effects"
          value={String(expenseCount)}
          caption="Expense rows contributing to the balance."
          tone="neutral"
          icon={<ReceiptText size={18} />}
        />
        <AuditMetric
          label="Settlement effects"
          value={String(settlementCount)}
          caption="Payments that changed the running total."
          tone="neutral"
          icon={<WalletCards size={18} />}
        />
        <AuditMetric
          label="Credits / Debits"
          value={`${formatMoney(positiveTotal)} / ${formatMoney(negativeTotal)}`}
          caption="Positive movements versus negative movements."
          tone="neutral"
          icon={<BadgeIndianRupee size={18} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Running total audit trail">
          {auditLines.length ? (
            <div className="relative grid gap-4 before:absolute before:bottom-4 before:left-[21px] before:top-4 before:w-px before:bg-line">
              {auditLines.map((line, index) => (
                <AuditTimelineRow key={`${line.type}-${index}`} line={line} index={index} />
              ))}
            </div>
          ) : (
            <EmptyAudit />
          )}
        </Panel>

        <Panel title="Contributor breakdown">
          {auditLines.length ? (
            <div className="grid gap-3">
              {auditLines.map((line, index) => (
                <ContributorCard key={`${line.type}-detail-${index}`} line={line} />
              ))}
            </div>
          ) : (
            <EmptyAudit />
          )}
        </Panel>
      </section>
    </div>
  );
}

function buildAuditLines(explanation?: BalanceExplanation): AuditLine[] {
  let runningTotalCents = 0;
  return (explanation?.lines || []).map((line) => {
    runningTotalCents += line.deltaCents;
    return {
      ...line,
      runningTotalCents,
      direction: line.deltaCents >= 0 ? "credit" : "debit"
    };
  });
}

function AuditMetric({
  label,
  value,
  caption,
  icon,
  tone
}: {
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
  tone: "mint" | "coral" | "neutral";
}) {
  const toneClass = tone === "mint" ? "bg-mint/10 text-mint" : tone === "coral" ? "bg-coral/10 text-coral" : "bg-elevated text-ink";
  return (
    <div className="glass-panel rounded-lg p-5 transition duration-200 hover:-translate-y-1 hover:shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink">{value}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-md ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">{caption}</p>
    </div>
  );
}

function AuditTimelineRow({ line, index }: { line: AuditLine; index: number }) {
  const positive = line.deltaCents >= 0;
  return (
    <div className="relative grid grid-cols-[44px_1fr] gap-3">
      <div className={`z-10 grid size-11 place-items-center rounded-full border bg-surface shadow-sm ${positive ? "border-mint/30 text-mint" : "border-coral/30 text-coral"}`}>
        {line.type === "EXPENSE" ? <ReceiptText size={18} /> : <CheckCircle2 size={18} />}
      </div>
      <div className="rounded-lg border border-line bg-elevated/50 p-4 transition hover:-translate-y-0.5 hover:border-mint/60 hover:bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Step {index + 1} · {formatDate(line.date)}</p>
            <h2 className="mt-1 text-lg font-bold text-ink">{line.type === "EXPENSE" ? line.description : "Settlement recorded"}</h2>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${positive ? "text-mint" : "text-coral"}`}>
              {positive ? "+" : "-"}{formatMoney(Math.abs(line.deltaCents))}
            </p>
            <p className="text-xs text-muted">Running total {formatMoney(line.runningTotalCents)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">{humanizeExplanation(line)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-semibold ${positive ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"}`}>
            {positive ? "Increases balance" : "Decreases balance"}
          </span>
          <span className="rounded-full bg-elevated px-2.5 py-1 font-semibold text-muted">
            {line.type === "EXPENSE" ? "Expense contribution" : "Settlement impact"}
          </span>
          {line.type === "EXPENSE" && line.csvRowNumber ? (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-600">CSV row {line.csvRowNumber}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ContributorCard({ line }: { line: AuditLine }) {
  const positive = line.deltaCents >= 0;
  return (
    <div className="rounded-lg border border-line bg-elevated/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid size-10 place-items-center rounded-md ${positive ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"}`}>
            {line.type === "EXPENSE" ? <ReceiptText size={18} /> : <WalletCards size={18} />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{line.type === "EXPENSE" ? line.description : `${line.fromUser.name} paid ${line.toUser.name}`}</p>
            <p className="text-xs text-muted">{formatDate(line.date)}</p>
          </div>
        </div>
        <p className={`text-lg font-bold ${positive ? "text-mint" : "text-coral"}`}>{formatMoney(line.deltaCents)}</p>
      </div>

      <div className="mt-4 grid gap-2 rounded-md border border-line bg-surface/70 p-3 text-sm">
        {line.type === "EXPENSE" ? (
          <>
            <AuditFact label="Paid by" value={line.paidBy.name} />
            <AuditFact label="Expense total" value={formatMoney(line.amountCents)} />
          </>
        ) : (
          <>
            <AuditFact label="From" value={line.fromUser.name} />
            <AuditFact label="To" value={line.toUser.name} />
          </>
        )}
        <AuditFact label="Balance change" value={formatMoney(line.deltaCents)} />
        <AuditFact label="Running total after this" value={formatMoney(line.runningTotalCents)} />
      </div>

      {line.originalCurrency !== "INR" ? (
        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700">
          Original currency was {line.originalCurrency}. The audit trail uses normalized INR so Priya can verify currency correction.
        </div>
      ) : null}

      {line.type === "EXPENSE" && line.csvRowNumber ? (
        <details className="mt-3 rounded-md border border-line bg-surface/70 p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
            <FileJson size={14} /> View original CSV row {line.csvRowNumber}
          </summary>
          <pre className="mt-3 max-h-52 overflow-auto rounded-md bg-ink p-3 text-xs text-cloud">
            {JSON.stringify(line.rawCsvRow, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function AuditFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function humanizeExplanation(line: AuditLine) {
  if (line.type === "SETTLEMENT") {
    return `${line.fromUser.name} paid ${line.toUser.name}. This payment changes the balance by ${formatMoney(line.deltaCents)} and leaves the running total at ${formatMoney(line.runningTotalCents)}.`;
  }
  if (line.deltaCents >= 0) {
    return `${line.paidBy.name} paid ${formatMoney(line.amountCents)}. Other participants' shares increase this user's balance by ${formatMoney(line.deltaCents)}.`;
  }
  return `${line.paidBy.name} paid ${formatMoney(line.amountCents)}. This user's share decreases their balance by ${formatMoney(Math.abs(line.deltaCents))}.`;
}

function EmptyAudit() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-elevated/40 p-8 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-mint/10 text-mint">
        <SearchCheck size={24} />
      </div>
      <h2 className="mt-4 text-lg font-bold text-ink">No balance movement yet</h2>
      <p className="mt-2 text-sm text-muted">Expenses and settlements will appear here as an auditable running total.</p>
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="glass-panel h-48 animate-pulse rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="h-32 animate-pulse rounded-lg bg-elevated" />
        <div className="h-32 animate-pulse rounded-lg bg-elevated" />
        <div className="h-32 animate-pulse rounded-lg bg-elevated" />
        <div className="h-32 animate-pulse rounded-lg bg-elevated" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-lg bg-elevated" />
        <div className="h-96 animate-pulse rounded-lg bg-elevated" />
      </div>
    </div>
  );
}
