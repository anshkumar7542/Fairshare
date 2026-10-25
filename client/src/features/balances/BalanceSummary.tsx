import { formatMoney } from "../../lib/format";
import type { Balance } from "../../types/domain";

export function BalanceSummary({ balance, currentUserId }: { balance?: Balance; currentUserId?: string }) {
  if (!balance) return <p className="text-sm text-muted">Loading balances...</p>;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-ink">Individual summary</h3>
        {balance.netByUser.length ? (
          balance.netByUser.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-md border border-line bg-elevated/60 p-3 text-sm">
              <span className="font-medium">
                {user.name}
                {user.id === currentUserId ? " (you)" : ""}
              </span>
              <span className={`font-semibold ${user.netCents >= 0 ? "text-mint" : "text-coral"}`}>
                {formatMoney(user.netCents)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">No individual balances yet.</p>
        )}
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-ink">Who owes whom</h3>
        {balance.pairwise.length ? (
          balance.pairwise.map((item) => (
            <div key={`${item.fromUser.id}-${item.toUser.id}`} className="rounded-md border border-line bg-elevated/60 p-3 text-sm">
              <span className="font-semibold">{item.fromUser.name}</span> owes{" "}
              <span className="font-semibold">{item.toUser.name}</span>{" "}
              <span className="font-semibold text-coral">{formatMoney(item.amountCents)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">No open pairwise balances.</p>
        )}
      </div>
    </div>
  );
}
