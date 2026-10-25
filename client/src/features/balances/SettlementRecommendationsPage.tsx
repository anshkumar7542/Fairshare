import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, WalletCards } from "lucide-react";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";
import { api, postJson } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { SettlementRecommendation } from "../../types/domain";

export function SettlementRecommendationsPage() {
  const { groupId } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const recommendationsQuery = useQuery({
    queryKey: ["balances", "recommendations", groupId],
    queryFn: () => api<{ recommendations: SettlementRecommendation[] }>(`/api/balances/groups/${groupId}/recommendations`),
    enabled: Boolean(groupId)
  });

  const recordMutation = useMutation({
    mutationFn: (item: SettlementRecommendation) =>
      postJson("/api/settlements", {
        groupId,
        fromUserId: item.fromUser.id,
        toUserId: item.toUser.id,
        amountCents: item.amountCents,
        note: "Recorded from settlement recommendation"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["balances", "recommendations", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "overall"] });
      await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      showToast({ tone: "success", title: "Settlement recorded", body: "The recommendation list and balances were refreshed." });
    }
  });

  const recommendations = recommendationsQuery.data?.recommendations || [];

  if (recommendationsQuery.isLoading) return <SettlementSkeleton />;
  if (recommendationsQuery.error || !recommendationsQuery.data) {
    return <p className="text-coral">Unable to load settlement recommendations.</p>;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link to={`/groups/${groupId}`}>
          <Button type="button" variant="ghost">
            <ArrowLeft size={16} /> Back
          </Button>
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-elevated/70 px-3 py-1 text-xs font-semibold text-muted">
          <Sparkles size={14} /> Aisha mode
        </div>
      </div>

      <section className="glass-panel overflow-hidden rounded-lg p-6 text-center md:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-mint/10 text-mint">
          <WalletCards size={26} />
        </div>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink md:text-6xl">Who pays whom</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
          The shortest settlement list using normalized INR balances.
        </p>
      </section>

      {recordMutation.error ? (
        <div className="rounded-lg border border-coral/30 bg-coral/10 p-4 text-sm font-semibold text-coral">
          {recordMutation.error.message}
        </div>
      ) : null}

      {recommendations.length ? (
        <div className="grid gap-4">
          {recommendations.map((item) => (
            <SettlementCard
              key={`${item.fromUser.id}-${item.toUser.id}`}
              item={item}
              isRecording={recordMutation.isPending}
              onRecord={() => recordMutation.mutate(item)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Everyone is settled" body="There is no one left to pay." icon={<Check size={22} />} />
      )}
    </div>
  );
}

function SettlementCard({
  item,
  isRecording,
  onRecord
}: {
  item: SettlementRecommendation;
  isRecording: boolean;
  onRecord: () => void;
}) {
  return (
    <div className="group rounded-lg border border-line bg-surface/85 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-mint hover:shadow-2xl md:p-7">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight text-ink md:text-5xl">
            <span className="truncate">{item.fromUser.name}</span>
            <ArrowRight className="shrink-0 text-mint transition group-hover:translate-x-1" size={36} />
            <span className="truncate">{item.toUser.name}</span>
          </div>
          <p className="mt-4 text-5xl font-black tracking-tight text-coral md:text-7xl">{formatMoney(item.amountCents)}</p>
        </div>

        <Button
          type="button"
          className="min-h-14 px-6 text-base md:min-w-48"
          disabled={isRecording}
          onClick={onRecord}
        >
          {isRecording ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          {isRecording ? "Recording" : "Record paid"}
        </Button>
      </div>
    </div>
  );
}

function SettlementSkeleton() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div className="h-12 animate-pulse rounded-lg bg-elevated" />
      <div className="h-56 animate-pulse rounded-lg bg-elevated" />
      <div className="h-44 animate-pulse rounded-lg bg-elevated" />
      <div className="h-44 animate-pulse rounded-lg bg-elevated" />
    </div>
  );
}
