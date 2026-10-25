import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Button } from "../../components/Button";
import { Field, Input, Select, TextArea } from "../../components/Field";
import { api } from "../../lib/api";
import { parseMoneyToCents } from "../../lib/format";
import type { Expense, Group, SplitMethod } from "../../types/domain";

type SplitDraft = {
  userId: string;
  selected: boolean;
  amount: string;
  percentage: string;
  shares: string;
};

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function ExpenseEditForm({
  expense,
  group,
  onSaved
}: {
  expense: Expense;
  group: Group;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(centsToInput(expense.amountCents));
  const [paidById, setPaidById] = useState(expense.paidById);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(expense.splitMethod);
  const [notes, setNotes] = useState(expense.notes || "");
  const [splits, setSplits] = useState<SplitDraft[]>(
    group.members.map((member) => {
      const existing = expense.splits.find((split) => split.userId === member.user.id);
      return {
        userId: member.user.id,
        selected: Boolean(existing),
        amount: existing ? centsToInput(existing.inputAmountCents ?? existing.owedCents) : "",
        percentage: existing?.inputPercentage?.toString() || "",
        shares: existing?.inputShares?.toString() || "1"
      };
    })
  );

  const selectedSplits = useMemo(() => splits.filter((split) => split.selected), [splits]);

  const mutation = useMutation({
    mutationFn: () =>
      api<{ expense: Expense }>(`/api/expenses/${expense.id}`, {
        method: "PUT",
        body: JSON.stringify({
          description,
          amountCents: parseMoneyToCents(amount),
          paidById,
          splitMethod,
          notes,
          splits: selectedSplits.map((split) => ({
            userId: split.userId,
            amountCents: splitMethod === "UNEQUAL" ? parseMoneyToCents(split.amount) : undefined,
            percentage: splitMethod === "PERCENTAGE" ? Number(split.percentage) : undefined,
            shares: splitMethod === "SHARES" ? Number(split.shares) : undefined
          }))
        })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expense", expense.id] });
      await queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "group", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "overall"] });
      onSaved();
    }
  });

  function updateSplit(userId: string, patch: Partial<SplitDraft>) {
    setSplits((current) => current.map((split) => (split.userId === userId ? { ...split, ...patch } : split)));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Description">
          <Input value={description} onChange={(event) => setDescription(event.target.value)} required />
        </Field>
        <Field label="Amount">
          <Input value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} required />
        </Field>
        <Field label="Paid by">
          <Select value={paidById} onChange={(event) => setPaidById(event.target.value)}>
            {group.members.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Split method">
          <Select value={splitMethod} onChange={(event) => setSplitMethod(event.target.value as SplitMethod)}>
            <option value="EQUAL">Equal</option>
            <option value="UNEQUAL">Unequal amounts</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="SHARES">Shares</option>
          </Select>
        </Field>
      </div>

      <Field label="Notes">
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-ink">Participants</h3>
        {group.members.map((member) => {
          const split = splits.find((item) => item.userId === member.user.id)!;
          return (
            <div key={member.user.id} className="grid gap-2 rounded-md border border-line bg-elevated/50 p-3 md:grid-cols-[1fr_auto]">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={split.selected}
                  onChange={(event) => updateSplit(member.user.id, { selected: event.target.checked })}
                />
                {member.user.name}
              </label>
              {splitMethod === "UNEQUAL" && (
                <Input value={split.amount} onChange={(event) => updateSplit(member.user.id, { amount: event.target.value })} />
              )}
              {splitMethod === "PERCENTAGE" && (
                <Input
                  value={split.percentage}
                  onChange={(event) => updateSplit(member.user.id, { percentage: event.target.value })}
                />
              )}
              {splitMethod === "SHARES" && (
                <Input value={split.shares} onChange={(event) => updateSplit(member.user.id, { shares: event.target.value })} />
              )}
            </div>
          );
        })}
      </div>

      {mutation.error && <p className="text-sm text-coral">{mutation.error.message}</p>}
      <Button type="submit" disabled={mutation.isPending}>
        <Save size={16} /> {mutation.isPending ? "Saving..." : "Save expense"}
      </Button>
    </form>
  );
}
