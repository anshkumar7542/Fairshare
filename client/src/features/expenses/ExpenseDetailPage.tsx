import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Pencil,
  ReceiptText,
  Send,
  Sparkles,
  Trash2,
  Users,
  WalletCards
} from "lucide-react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Field";
import { Panel } from "../../components/Panel";
import { api, postJson } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import type { Expense, Group } from "../../types/domain";
import { ExpenseEditForm } from "./ExpenseEditForm";

export function ExpenseDetailPage() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const expenseQuery = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => api<{ expense: Expense }>(`/api/expenses/${expenseId}`),
    enabled: Boolean(expenseId),
    refetchInterval: editing ? false : 5000,
    refetchIntervalInBackground: false
  });
  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => api<{ group: Group }>(`/api/groups/${groupId}`),
    enabled: Boolean(groupId)
  });

  const messageMutation = useMutation({
    mutationFn: () => postJson(`/api/expenses/${expenseId}/messages`, { message }),
    onSuccess: async () => {
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
    }
  });
  const deleteMutation = useMutation({
    mutationFn: () => api<void>(`/api/expenses/${expenseId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "overall"] });
      navigate(`/groups/${groupId}`);
    }
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    messageMutation.mutate();
  }

  if (expenseQuery.isLoading) return <ExpenseSkeleton />;
  if (expenseQuery.error || !expenseQuery.data) return <p className="text-coral">Unable to load expense.</p>;

  const expense = expenseQuery.data.expense;
  const maxSplit = Math.max(...expense.splits.map((split) => split.owedCents), 1);
  const settlementImpact = expense.splits.filter((split) => split.userId !== expense.paidById && split.owedCents > 0);
  const participantNames = expense.splits.map((split) => split.user.name).join(", ");

  return (
    <div className="grid gap-6">
      <Link to={`/groups/${groupId}`} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-mint">
        <ArrowLeft size={16} /> Back to group
      </Link>

      <section className="glass-panel relative overflow-hidden rounded-lg p-6">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-coral/20 via-transparent to-mint/20" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-semibold text-muted">
                <ReceiptText size={14} /> Expense intelligence
              </span>
              <SplitBadge method={expense.splitMethod} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">{expense.description}</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              {formatMoney(expense.amountCents)} paid by {expense.paidBy.name} on {formatDate(expense.expenseDate)} for {participantNames}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing((value) => !value)}>
              <Pencil size={16} /> {editing ? "Close edit" : "Edit"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-coral hover:bg-coral/10"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        </div>
        {deleteMutation.error && <p className="relative mt-3 text-sm text-coral">{deleteMutation.error.message}</p>}
      </section>

      {editing && groupQuery.data && (
        <Panel title="Edit expense">
          <ExpenseEditForm expense={expense} group={groupQuery.data.group} onSaved={() => setEditing(false)} />
        </Panel>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Split visualization">
          <div className="grid gap-4">
            {expense.splits.map((split) => {
              const width = `${Math.max((split.owedCents / maxSplit) * 100, 8)}%`;
              const payer = split.userId === expense.paidById;
              return (
                <div key={split.id} className="rounded-md border border-line bg-elevated/50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={split.user.name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{split.user.name}</p>
                        <p className="text-xs text-muted">{payer ? "Payer share" : `Owes ${expense.paidBy.name}`}</p>
                      </div>
                    </div>
                    <span className="font-bold text-ink">{formatMoney(split.owedCents)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className={`h-full rounded-full transition-all duration-700 ${payer ? "bg-mint" : "bg-coral"}`} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Calculation explanation">
          <div className="grid gap-3">
            <ExplanationStep
              icon={<WalletCards size={16} />}
              title="Total paid"
              body={`${expense.paidBy.name} paid ${formatMoney(expense.amountCents)} for this expense.`}
            />
            <ExplanationStep
              icon={<Users size={16} />}
              title="Split method"
              body={splitExplanation(expense)}
            />
            <ExplanationStep
              icon={<Sparkles size={16} />}
              title="Rounding policy"
              body="All calculations are stored in integer cents. Any rounding remainder is assigned deterministically so split totals match the expense total."
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Settlement impact">
          {settlementImpact.length ? (
            <div className="grid gap-3">
              {settlementImpact.map((split) => (
                <div key={split.id} className="rounded-md border border-line bg-elevated/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={split.user.name} />
                      <ArrowRight className="text-muted" size={16} />
                      <Avatar name={expense.paidBy.name} />
                    </div>
                    <span className="font-bold text-coral">{formatMoney(split.owedCents)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-semibold text-ink">{split.user.name}</span> owes{" "}
                    <span className="font-semibold text-ink">{expense.paidBy.name}</span> for this expense.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-mint/30 bg-mint/10 p-5 text-sm text-mint">
              This expense does not create external debt because the payer's own share covers the recorded split.
            </div>
          )}
        </Panel>

        <Panel title="Expense chat">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">
            <CheckCircle2 size={13} /> Updates automatically while open
          </p>
          <div className="mb-4 grid max-h-96 gap-3 overflow-auto pr-1">
            {expense.messages?.length ? (
              expense.messages.map((item) => (
                <div key={item.id} className="rounded-md border border-line bg-elevated/50 p-3">
                  <div className="mb-1 flex justify-between gap-2 text-xs text-muted">
                    <span className="font-semibold text-ink">{item.author.name}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="text-sm text-ink">{item.message}</p>
                </div>
              ))
            ) : (
              <div className="grid place-items-center rounded-lg border border-dashed border-line bg-elevated/35 p-8 text-center">
                <MessageSquare className="mb-3 text-muted" size={28} />
                <p className="font-semibold text-ink">No messages yet</p>
                <p className="mt-1 text-sm text-muted">Start a discussion about this expense.</p>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message" required />
            <Button type="submit" disabled={messageMutation.isPending}>
              <Send size={16} /> Send
            </Button>
            {messageMutation.error && <p className="text-sm text-coral sm:col-span-2">{messageMutation.error.message}</p>}
          </form>
        </Panel>
      </section>
    </div>
  );
}

function ExplanationStep({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-elevated/50 p-4">
      <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="grid size-8 place-items-center rounded-md bg-surface text-mint">{icon}</span>
        {title}
      </div>
      <p className="text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

function SplitBadge({ method }: { method: Expense["splitMethod"] }) {
  const label = {
    EQUAL: "Equal split",
    UNEQUAL: "Exact amounts",
    PERCENTAGE: "Percentage split",
    SHARES: "Share split"
  }[method];
  return <span className="rounded-full bg-mint/10 px-3 py-1 text-xs font-bold text-mint">{label}</span>;
}

function splitExplanation(expense: Expense) {
  if (expense.splitMethod === "EQUAL") {
    return `${expense.amountCents} cents were divided equally across ${expense.splits.length} participants.`;
  }
  if (expense.splitMethod === "UNEQUAL") {
    return "Each participant has an exact owed amount. The backend accepts the expense only when exact amounts add up to the total.";
  }
  if (expense.splitMethod === "PERCENTAGE") {
    return "Each participant has a percentage share. Percentages must total 100, then cents are allocated with deterministic rounding.";
  }
  return "Each participant has a share count. Shares act as weights, and cents are allocated proportionally with deterministic rounding.";
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-gradient-to-br from-mint/25 to-coral/20 text-sm font-black text-ink shadow-inner">
      {initials}
    </span>
  );
}

function ExpenseSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="glass-panel rounded-lg p-6">
        <div className="h-4 w-44 animate-pulse rounded-full bg-line" />
        <div className="mt-5 h-10 w-2/3 animate-pulse rounded-full bg-line" />
        <div className="mt-4 h-4 w-80 animate-pulse rounded-full bg-line" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="glass-panel rounded-lg p-5">
            <div className="h-5 w-32 animate-pulse rounded-full bg-line" />
            <div className="mt-5 h-24 animate-pulse rounded-md bg-line" />
          </div>
        ))}
      </div>
    </div>
  );
}
