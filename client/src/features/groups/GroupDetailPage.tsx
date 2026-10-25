import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  Plus,
  ReceiptText,
  SearchCheck,
  ShieldCheck,
  TrendingUp,
  UserMinus,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { Button } from "../../components/Button";
import { Panel } from "../../components/Panel";
import { api } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import type { Balance, Expense, Group, GroupMembership, Settlement } from "../../types/domain";
import { ExpenseForm } from "../expenses/ExpenseForm";
import { SettlementForm } from "../settlements/SettlementForm";
import { AddMemberForm } from "./AddMemberForm";

type TimelineItem = {
  id: string;
  kind: "expense" | "settlement";
  title: string;
  description: string;
  amountCents: number;
  date: string;
  href?: string;
};

export function GroupDetailPage() {
  const { groupId } = useParams();
  const queryClient = useQueryClient();
  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => api<{ group: Group }>(`/api/groups/${groupId}`),
    enabled: Boolean(groupId)
  });
  const balanceQuery = useQuery({
    queryKey: ["balances", "group", groupId],
    queryFn: () => api<{ balance: Balance }>(`/api/balances/groups/${groupId}`),
    enabled: Boolean(groupId)
  });
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api<void>(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "overall"] });
    }
  });

  if (groupQuery.isLoading) return <GroupSkeleton />;
  if (groupQuery.error || !groupQuery.data) return <p className="text-coral">Unable to load group.</p>;

  const group = groupQuery.data.group;
  const balance = balanceQuery.data?.balance;
  const totalExpenseCents = (group.expenses || []).reduce((sum, expense) => sum + expense.amountCents, 0);
  const openBalanceCents = (balance?.pairwise || []).reduce((sum, item) => sum + item.amountCents, 0);
  const timeline = buildTimeline(group);
  const health = getGroupHealth(openBalanceCents, group.expenses?.length || 0, group.settlements?.length || 0);
  const topDebtor = balance?.pairwise[0];
  const memberBalances = new Map((balance?.netByUser || []).map((item) => [item.id, item.netCents]));

  return (
    <div className="grid gap-6 pb-24">
      <a
        href="#add-expense"
        className="fixed bottom-5 right-5 z-20 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-cloud shadow-2xl transition hover:-translate-y-1 hover:shadow-mint/20 md:bottom-8 md:right-8"
      >
        <Plus size={18} /> Add expense
      </a>

      <section className="glass-panel relative overflow-hidden rounded-lg p-6">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-mint/20 via-transparent to-coral/20" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-semibold text-muted">
                <Users size={14} /> Collaborative workspace
              </span>
              <HealthBadge health={health} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">{group.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {group.description || "Track shared expenses, member timelines, balance health, and settlement movement from one place."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <BalanceChip label="Spent" value={formatMoney(totalExpenseCents)} icon={<ReceiptText size={14} />} />
              <BalanceChip label="Open balance" value={formatMoney(openBalanceCents)} icon={<WalletCards size={14} />} tone={openBalanceCents ? "coral" : "mint"} />
              <BalanceChip label="Members" value={String(group.members.length)} icon={<Users size={14} />} />
              <BalanceChip label="Settlements" value={String(group.settlements?.length || 0)} icon={<CheckCircle2 size={14} />} />
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface/75 p-4 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Settlement status</p>
            <AnimatedSettlementStatus openBalanceCents={openBalanceCents} />
            {topDebtor ? (
              <div className="mt-4 rounded-md border border-line bg-elevated/60 p-3 text-sm">
                <p className="text-muted">Next best move</p>
                <p className="mt-1 font-semibold text-ink">
                  {topDebtor.fromUser.name} pays {topDebtor.toUser.name}{" "}
                  <span className="text-coral">{formatMoney(topDebtor.amountCents)}</span>
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-mint/30 bg-mint/10 p-3 text-sm text-mint">
                Everyone is settled.
              </div>
            )}
          </div>
        </div>
      </section>

      <Panel title="Members">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {group.members.map((member) => (
            <MemberCard
              key={member.user.id}
              member={member}
              netCents={memberBalances.get(member.user.id) || 0}
              disabled={removeMemberMutation.isPending || group.members.length <= 1}
              onRemove={() => removeMemberMutation.mutate(member.user.id)}
            />
          ))}
        </div>
        <div className="mt-4">
          <AddMemberForm groupId={group.id} />
          {removeMemberMutation.error && <p className="mt-2 text-sm text-coral">{removeMemberMutation.error.message}</p>}
        </div>
      </Panel>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Why? balance audit">
          {balance ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {balance.netByUser.map((person) => (
                <Link
                  key={person.id}
                  to={`/groups/${group.id}/balances/${person.id}`}
                  className="group rounded-md border border-line bg-elevated/50 p-4 transition hover:-translate-y-0.5 hover:border-mint hover:bg-surface"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={person.name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{person.name}</p>
                        <p className="text-xs text-muted">Click the amount to trace every rupee</p>
                      </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ring-1 ring-transparent transition group-hover:ring-current ${person.netCents >= 0 ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"}`}>
                      <SearchCheck size={14} />
                      {formatMoney(person.netCents)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <ChipSkeleton />
          )}
        </Panel>

        <Panel title="Who pays whom">
          {balance?.pairwise.length ? (
            <div className="grid gap-3">
              {balance.pairwise.map((item) => (
                <div key={`${item.fromUser.id}-${item.toUser.id}`} className="group rounded-md border border-line bg-elevated/50 p-4 transition hover:-translate-y-0.5 hover:border-mint/60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={item.fromUser.name} />
                      <ArrowRight className="text-muted transition group-hover:text-mint" size={16} />
                      <Avatar name={item.toUser.name} />
                    </div>
                    <span className="text-right text-sm font-bold text-coral">{formatMoney(item.amountCents)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-semibold text-ink">{item.fromUser.name}</span> pays{" "}
                    <span className="font-semibold text-ink">{item.toUser.name}</span>
                  </p>
                </div>
              ))}
              <Link to={`/groups/${group.id}/recommendations`}>
                <Button variant="secondary" className="w-full justify-between">
                  Open recommendations <ArrowUpRight size={16} />
                </Button>
              </Link>
            </div>
          ) : (
            <EmptyWorkspace title="No open balances" body="This group is fully settled or does not have expenses yet." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <Panel title="Expense feed">
          {group.expenses?.length ? (
            <div className="grid gap-3">
              {group.expenses.map((expense) => (
                <ExpenseTransactionCard key={expense.id} groupId={group.id} expense={expense} />
              ))}
            </div>
          ) : (
            <EmptyWorkspace title="No expenses yet" body="Use the floating CTA to add the first shared cost." />
          )}
        </Panel>

        <Panel title="Activity timeline">
          {timeline.length ? (
            <div className="relative grid gap-4 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-line">
              {timeline.map((item) => (
                <TimelineRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyWorkspace title="Timeline is empty" body="Expenses and settlements will build the group story here." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <Panel title="Settlements">
          <SettlementForm group={group} />
          <div className="mt-4 grid gap-2">
            {group.settlements?.length ? (
              group.settlements.map((settlement) => (
                <div key={settlement.id} className="rounded-md border border-line bg-elevated/60 p-3 text-sm">
                  <div>
                    <span className="font-semibold">{settlement.fromUser.name}</span> paid{" "}
                    <span className="font-semibold">{settlement.toUser.name}</span>{" "}
                    <span className="font-semibold text-mint">{formatMoney(settlement.amountCents)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {formatDate(settlement.settledAt)}
                    {settlement.note ? ` - ${settlement.note}` : ""}
                  </div>
                </div>
              ))
            ) : (
              <p className="mt-3 text-sm text-muted">No settlements recorded yet.</p>
            )}
          </div>
        </Panel>
      </section>

      <Panel title="Add expense">
        <div id="add-expense" className="scroll-mt-28">
          <ExpenseForm group={group} />
        </div>
      </Panel>
    </div>
  );
}

function MemberCard({
  member,
  netCents,
  disabled,
  onRemove
}: {
  member: GroupMembership;
  netCents: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const isFormer = Boolean(member.leftAt);
  return (
    <div className="group rounded-lg border border-line bg-elevated/50 p-4 transition hover:-translate-y-0.5 hover:border-mint/60 hover:bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={member.user.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{member.user.name}</p>
            <p className="truncate text-xs text-muted">{member.user.email}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="min-h-8 px-2 opacity-70 transition group-hover:opacity-100"
          aria-label={`Remove ${member.user.name}`}
          disabled={disabled}
          onClick={onRemove}
        >
          <X size={15} />
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isFormer ? "bg-coral/10 text-coral" : "bg-mint/10 text-mint"}`}>
          {isFormer ? <UserMinus size={12} /> : <ShieldCheck size={12} />}
          {isFormer ? "Left group" : "Active"}
        </span>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted">
          Joined {member.joinedAt ? formatDate(member.joinedAt) : "from start"}
        </span>
        {member.leftAt && (
          <span className="rounded-full bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral">
            Left {formatDate(member.leftAt)}
          </span>
        )}
      </div>
      <div className="mt-4 rounded-md border border-line bg-surface/70 p-3">
        <p className="text-xs text-muted">Net in group</p>
        <p className={`mt-1 text-lg font-bold ${netCents >= 0 ? "text-mint" : "text-coral"}`}>{formatMoney(netCents)}</p>
      </div>
    </div>
  );
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

function BalanceChip({
  label,
  value,
  icon,
  tone = "neutral"
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "mint" | "coral" | "neutral";
}) {
  const toneClass = tone === "mint" ? "text-mint" : tone === "coral" ? "text-coral" : "text-ink";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-2 text-sm shadow-sm">
      <span className={toneClass}>{icon}</span>
      <span className="text-muted">{label}</span>
      <span className={`font-bold ${toneClass}`}>{value}</span>
    </span>
  );
}

function HealthBadge({ health }: { health: { label: string; tone: "mint" | "amber" | "coral"; detail: string } }) {
  const toneClass = health.tone === "mint" ? "bg-mint/10 text-mint" : health.tone === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-coral/10 text-coral";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`} title={health.detail}>
      <TrendingUp size={14} /> {health.label}
    </span>
  );
}

function AnimatedSettlementStatus({ openBalanceCents }: { openBalanceCents: number }) {
  const settled = openBalanceCents === 0;
  return (
    <div className="mt-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={`text-3xl font-bold ${settled ? "text-mint" : "text-coral"}`}>{settled ? "Settled" : formatMoney(openBalanceCents)}</p>
          <p className="mt-1 text-sm text-muted">{settled ? "No action needed." : "Open amount across members."}</p>
        </div>
        <span className={`grid size-11 place-items-center rounded-full ${settled ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"}`}>
          {settled ? <CheckCircle2 size={20} /> : <WalletCards size={20} />}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all duration-700 ${settled ? "w-full bg-mint" : "w-2/3 animate-pulse bg-coral"}`}
        />
      </div>
    </div>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const content = (
    <div className="group relative flex gap-3 rounded-md border border-line bg-elevated/50 p-4 transition hover:-translate-y-0.5 hover:border-mint/60">
      <span className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full ${item.kind === "expense" ? "bg-coral/10 text-coral" : "bg-mint/10 text-mint"}`}>
        {item.kind === "expense" ? <ReceiptText size={17} /> : <CheckCircle2 size={17} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{item.title}</p>
            <p className="text-sm text-muted">{item.description}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-ink">{formatMoney(item.amountCents)}</p>
            <p className="text-xs text-muted">{formatDate(item.date)}</p>
          </div>
        </div>
      </div>
    </div>
  );
  return item.href ? <Link to={item.href}>{content}</Link> : content;
}

function ExpenseTransactionCard({ groupId, expense }: { groupId: string; expense: Expense }) {
  const participants = expense.splits.map((split) => split.user.name);
  return (
    <details className="group rounded-lg border border-line bg-elevated/50 p-4 transition hover:-translate-y-0.5 hover:border-mint/60 hover:bg-surface">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-coral/10 text-coral">
            <ReceiptText size={19} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-ink">{expense.description}</p>
              <SplitBadge method={expense.splitMethod} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Avatar name={expense.paidBy.name} /> paid by {expense.paidBy.name}
              </span>
              <span>{relativeTime(expense.expenseDate)}</span>
              <span>{participants.length} participants</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-ink">{formatMoney(expense.amountCents)}</p>
          <ChevronDown className="ml-auto mt-1 text-muted transition group-open:rotate-180" size={16} />
        </div>
      </summary>
      <div className="mt-4 border-t border-line pt-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {expense.splits.map((split) => (
            <span key={split.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs">
              <Avatar name={split.user.name} /> {split.user.name} - {formatMoney(split.owedCents)}
            </span>
          ))}
        </div>
        {expense.notes && <p className="mb-3 rounded-md bg-surface/70 p-3 text-sm text-muted">{expense.notes}</p>}
        <div className="flex flex-wrap gap-2">
          <Link to={`/groups/${groupId}/expenses/${expense.id}`}>
            <Button type="button" variant="secondary" className="min-h-9 px-3">
              View explanation <ArrowUpRight size={15} />
            </Button>
          </Link>
          <span className="inline-flex items-center gap-1 rounded-md bg-elevated px-3 py-2 text-xs font-semibold text-muted">
            <MessageSquare size={13} /> Chat on detail page
          </span>
        </div>
      </div>
    </details>
  );
}

function SplitBadge({ method }: { method: Expense["splitMethod"] }) {
  const label = {
    EQUAL: "Equal",
    UNEQUAL: "Exact",
    PERCENTAGE: "Percent",
    SHARES: "Shares"
  }[method];
  return <span className="rounded-full bg-mint/10 px-2 py-1 text-xs font-bold text-mint">{label}</span>;
}

function EmptyWorkspace({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-line bg-elevated/35 p-8 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-surface shadow-inner">
        <div className="relative size-9 rounded-lg border border-line bg-elevated">
          <span className="absolute -right-2 -top-2 size-4 rounded-full bg-mint/70" />
          <span className="absolute bottom-1 left-1 h-2 w-6 rounded-full bg-coral/60" />
        </div>
      </div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>
    </div>
  );
}

function ChipSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-md border border-line bg-elevated/50 p-4">
          <div className="h-4 w-28 animate-pulse rounded-full bg-line" />
          <div className="mt-3 h-6 w-24 animate-pulse rounded-full bg-line" />
        </div>
      ))}
    </div>
  );
}

function GroupSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="glass-panel rounded-lg p-6">
        <div className="h-4 w-40 animate-pulse rounded-full bg-line" />
        <div className="mt-5 h-10 w-2/3 animate-pulse rounded-full bg-line" />
        <div className="mt-5 flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-full bg-line" />
          <div className="h-9 w-28 animate-pulse rounded-full bg-line" />
        </div>
      </div>
      <ChipSkeleton />
    </div>
  );
}

function buildTimeline(group: Group): TimelineItem[] {
  return [
    ...(group.expenses || []).map((expense) => expenseTimeline(group.id, expense)),
    ...(group.settlements || []).map(settlementTimeline)
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function expenseTimeline(groupId: string, expense: Expense): TimelineItem {
  return {
    id: `expense-${expense.id}`,
    kind: "expense",
    title: expense.description,
    description: `Paid by ${expense.paidBy.name}`,
    amountCents: expense.amountCents,
    date: expense.expenseDate,
    href: `/groups/${groupId}/expenses/${expense.id}`
  };
}

function settlementTimeline(settlement: Settlement): TimelineItem {
  return {
    id: `settlement-${settlement.id}`,
    kind: "settlement",
    title: `${settlement.fromUser.name} paid ${settlement.toUser.name}`,
    description: settlement.note || "Settlement recorded",
    amountCents: settlement.amountCents,
    date: settlement.settledAt
  };
}

function getGroupHealth(openBalanceCents: number, expenseCount: number, settlementCount: number) {
  if (expenseCount === 0) {
    return { label: "Needs activity", tone: "amber" as const, detail: "No expenses have been recorded yet." };
  }
  if (openBalanceCents === 0) {
    return { label: "Healthy", tone: "mint" as const, detail: "All balances are settled." };
  }
  if (settlementCount > 0) {
    return { label: "Improving", tone: "amber" as const, detail: "Settlements exist, but some balances remain open." };
  }
  return { label: "Needs settlement", tone: "coral" as const, detail: "Expenses exist but no settlements have been recorded." };
}

function relativeTime(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffDays) < 1) return "today";
  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return formatter.format(diffMonths, "month");
  return formatter.format(Math.round(diffMonths / 12), "year");
}
