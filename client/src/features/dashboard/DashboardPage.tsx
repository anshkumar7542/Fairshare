import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  Plus,
  ReceiptText,
  Sparkles,
  Users,
  WalletCards
} from "lucide-react";
import { Button } from "../../components/Button";
import { Panel } from "../../components/Panel";
import { api } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import type { Balance, Expense, Group, Settlement, User } from "../../types/domain";
import { useAuth } from "../auth/AuthProvider";

type ActivityItem = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  subtitle: string;
  amountCents: number;
  date: string;
  type: "expense" | "settlement";
};

export function DashboardPage() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: () => api<{ groups: Group[] }>("/api/groups") });
  const balanceQuery = useQuery({
    queryKey: ["balances", "overall"],
    queryFn: () => api<{ balance: Balance }>("/api/balances/overall")
  });
  const groupDetailQueries = useQueries({
    queries: (groupsQuery.data?.groups || []).map((group) => ({
      queryKey: ["group", group.id],
      queryFn: () => api<{ group: Group }>(`/api/groups/${group.id}`),
      enabled: Boolean(group.id)
    }))
  });

  const balance = balanceQuery.data?.balance;
  const groups = groupsQuery.data?.groups || [];
  const detailedGroups = groupDetailQueries
    .map((query) => query.data?.group)
    .filter(Boolean) as Group[];
  const loading = groupsQuery.isLoading || balanceQuery.isLoading;
  const youOwe = balance?.pairwise
    .filter((item) => item.fromUser.id === user?.id)
    .reduce((sum, item) => sum + item.amountCents, 0) || 0;
  const youAreOwed = balance?.pairwise
    .filter((item) => item.toUser.id === user?.id)
    .reduce((sum, item) => sum + item.amountCents, 0) || 0;
  const myNet = balance?.netByUser.find((item) => item.id === user?.id)?.netCents || 0;
  const activeGroups = groups.length;
  const selectedUser = selectedUserId
    ? balance?.netByUser.find((item) => item.id === selectedUserId)
    : balance?.netByUser.find((item) => item.id === user?.id) || balance?.netByUser[0];

  const recentActivity = useMemo(() => buildActivity(detailedGroups).slice(0, 6), [detailedGroups]);
  const suggestions = balance?.pairwise.slice(0, 4) || [];

  return (
    <div className="grid gap-6">
      <section className="glass-panel overflow-hidden rounded-lg p-6">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-elevated/70 px-3 py-1 text-xs font-semibold text-muted">
              <Sparkles size={14} /> Live demo dashboard
            </div>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-ink md:text-5xl">
              Hi {user?.name?.split(" ")[0] || "there"}, here is the cleanest view of your flatmate money.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Review who owes, who gets paid, latest activity, and settlement moves without opening a spreadsheet.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/imports">
              <Button className="w-full justify-between">
                <span className="inline-flex items-center gap-2"><FileWarning size={16} /> Import CSV</span>
                <ArrowUpRight size={16} />
              </Button>
            </Link>
            <Link to="/groups/new">
              <Button variant="secondary" className="w-full justify-between">
                <span className="inline-flex items-center gap-2"><Plus size={16} /> New group</span>
                <ArrowUpRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              label="You owe"
              value={formatMoney(youOwe)}
              tone="coral"
              icon={<ArrowUpRight size={18} />}
              caption={youOwe ? "Pay these down first." : "No outgoing dues."}
            />
            <MetricCard
              label="You are owed"
              value={formatMoney(youAreOwed)}
              tone="mint"
              icon={<ArrowDownLeft size={18} />}
              caption={youAreOwed ? "Money others should return." : "Nothing pending from others."}
            />
            <MetricCard
              label="Net balance"
              value={formatMoney(myNet)}
              tone={myNet >= 0 ? "mint" : "coral"}
              icon={<WalletCards size={18} />}
              caption={myNet >= 0 ? "You are ahead overall." : "You owe overall."}
            />
            <MetricCard
              label="Active groups"
              value={String(activeGroups)}
              tone="neutral"
              icon={<Users size={18} />}
              caption="Groups included in this summary."
            />
          </>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel title="Interactive balance overview">
          {loading ? (
            <ChartSkeleton />
          ) : balance?.netByUser.length ? (
            <div className="grid gap-4">
              <div className="rounded-lg border border-line bg-elevated/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Selected person</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-bold text-ink">{selectedUser?.name}</p>
                    <p className="text-sm text-muted">{selectedUser?.email}</p>
                  </div>
                  <p className={`text-3xl font-bold ${(selectedUser?.netCents || 0) >= 0 ? "text-mint" : "text-coral"}`}>
                    {formatMoney(selectedUser?.netCents || 0)}
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                {balance.netByUser.map((person) => (
                  <BalanceBar
                    key={person.id}
                    user={person}
                    selected={person.id === selectedUser?.id}
                    max={Math.max(...balance.netByUser.map((item) => Math.abs(item.netCents)), 1)}
                    onSelect={() => setSelectedUserId(person.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No balances yet" body="Create a group or import expenses to see a live balance map." />
          )}
        </Panel>

        <Panel title="Who pays whom">
          {loading ? (
            <ListSkeleton />
          ) : suggestions.length ? (
            <div className="grid gap-3">
              {suggestions.map((item) => (
                <PaymentRow key={`${item.fromUser.id}-${item.toUser.id}`} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState title="Aisha is settled" body="No simplified payments are needed right now." compact />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Recent activity">
          {groupDetailQueries.some((query) => query.isLoading) ? (
            <ListSkeleton />
          ) : recentActivity.length ? (
            <div className="grid gap-3">
              {recentActivity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState title="No activity yet" body="Imported expenses and settlements will appear here." />
          )}
        </Panel>

        <Panel title="Upcoming settlement suggestions">
          {loading ? (
            <ListSkeleton />
          ) : suggestions.length ? (
            <div className="grid gap-3">
              {suggestions.slice(0, 3).map((item, index) => (
                <SuggestionCard key={`${item.fromUser.id}-${item.toUser.id}-${index}`} item={item} rank={index + 1} />
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming settlements" body="Everyone is balanced, or no expenses have been imported yet." />
          )}
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon,
  tone
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  tone: "mint" | "coral" | "neutral";
}) {
  const toneClass = tone === "mint" ? "text-mint bg-mint/10" : tone === "coral" ? "text-coral bg-coral/10" : "text-ink bg-elevated";
  return (
    <div className="glass-panel group rounded-lg p-5 transition duration-200 hover:-translate-y-1 hover:shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{value}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-md transition group-hover:scale-110 ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-3 text-xs text-muted">{caption}</p>
    </div>
  );
}

function BalanceBar({
  user,
  selected,
  max,
  onSelect
}: {
  user: User & { netCents: number };
  selected: boolean;
  max: number;
  onSelect: () => void;
}) {
  const width = `${Math.max((Math.abs(user.netCents) / max) * 100, 5)}%`;
  const positive = user.netCents >= 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group rounded-md border p-3 text-left transition duration-200 hover:-translate-y-0.5 ${
        selected ? "border-mint bg-mint/10" : "border-line bg-elevated/50 hover:border-mint/60"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-ink">{user.name}</span>
        <span className={positive ? "font-semibold text-mint" : "font-semibold text-coral"}>{formatMoney(user.netCents)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line/70">
        <div
          className={`h-full rounded-full transition-all duration-500 ${positive ? "bg-mint" : "bg-coral"}`}
          style={{ width }}
        />
      </div>
    </button>
  );
}

function PaymentRow({ item }: { item: Balance["pairwise"][number] }) {
  return (
    <div className="group rounded-md border border-line bg-elevated/50 p-3 transition hover:-translate-y-0.5 hover:border-mint/60">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{item.fromUser.name}</p>
          <p className="truncate text-xs text-muted">pays {item.toUser.name}</p>
        </div>
        <ArrowRight className="shrink-0 text-muted transition group-hover:text-mint" size={16} />
        <p className="shrink-0 text-sm font-bold text-coral">{formatMoney(item.amountCents)}</p>
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <Link
      to={`/groups/${item.groupId}`}
      className="group flex items-center justify-between gap-3 rounded-md border border-line bg-elevated/50 p-3 transition hover:-translate-y-0.5 hover:border-mint/60"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface text-muted">
          {item.type === "expense" ? <ReceiptText size={16} /> : <CheckCircle2 size={16} />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
          <p className="truncate text-xs text-muted">{item.subtitle}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-ink">{formatMoney(item.amountCents)}</p>
        <p className="text-xs text-muted">{formatDate(item.date)}</p>
      </div>
    </Link>
  );
}

function SuggestionCard({ item, rank }: { item: Balance["pairwise"][number]; rank: number }) {
  return (
    <div className="rounded-md border border-line bg-elevated/50 p-4 transition hover:-translate-y-0.5 hover:border-mint/60">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-ink text-xs font-bold text-cloud">{rank}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-mint/10 px-2 py-1 text-xs font-semibold text-mint">
          <CalendarClock size={12} /> Suggested
        </span>
      </div>
      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">{item.fromUser.name}</span> should pay{" "}
        <span className="font-semibold text-ink">{item.toUser.name}</span>
      </p>
      <p className="mt-2 text-2xl font-bold text-coral">{formatMoney(item.amountCents)}</p>
    </div>
  );
}

function EmptyState({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-lg border border-dashed border-line bg-elevated/35 text-center ${compact ? "p-5" : "p-8"}`}>
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

function MetricSkeleton() {
  return (
    <div className="glass-panel rounded-lg p-5">
      <div className="h-3 w-24 animate-pulse rounded-full bg-line" />
      <div className="mt-4 h-8 w-32 animate-pulse rounded-full bg-line" />
      <div className="mt-4 h-3 w-40 animate-pulse rounded-full bg-line" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-md border border-line bg-elevated/50 p-3">
          <div className="mb-3 h-4 w-32 animate-pulse rounded-full bg-line" />
          <div className="h-2 animate-pulse rounded-full bg-line" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-md border border-line bg-elevated/50 p-3">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-line" />
          <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-line" />
        </div>
      ))}
    </div>
  );
}

function buildActivity(groups: Group[]): ActivityItem[] {
  return groups
    .flatMap((group) => [
      ...(group.expenses || []).map((expense) => expenseActivity(group, expense)),
      ...(group.settlements || []).map((settlement) => settlementActivity(group, settlement))
    ])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function expenseActivity(group: Group, expense: Expense): ActivityItem {
  return {
    id: `expense-${expense.id}`,
    groupId: group.id,
    groupName: group.name,
    title: expense.description,
    subtitle: `${group.name} · paid by ${expense.paidBy.name}`,
    amountCents: expense.amountCents,
    date: expense.expenseDate,
    type: "expense"
  };
}

function settlementActivity(group: Group, settlement: Settlement): ActivityItem {
  return {
    id: `settlement-${settlement.id}`,
    groupId: group.id,
    groupName: group.name,
    title: `${settlement.fromUser.name} paid ${settlement.toUser.name}`,
    subtitle: `${group.name} · settlement recorded`,
    amountCents: settlement.amountCents,
    date: settlement.settledAt,
    type: "settlement"
  };
}
