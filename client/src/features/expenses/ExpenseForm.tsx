import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "../../components/Button";
import { Field, Input, Select, TextArea } from "../../components/Field";
import { useToast } from "../../components/Toast";
import { postJson } from "../../lib/api";
import { parseMoneyToCents } from "../../lib/format";
import type { Group, SplitMethod } from "../../types/domain";

type SplitDraft = {
  userId: string;
  selected: boolean;
  amount: string;
  percentage: string;
  shares: string;
};

function createSplitDraft(userId: string): SplitDraft {
  return {
    userId,
    selected: true,
    amount: "",
    percentage: "",
    shares: "1"
  };
}

export function ExpenseForm({ group }: { group: Group }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(group.members[0]?.user.id || "");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("EQUAL");
  const [notes, setNotes] = useState("");
  const [splits, setSplits] = useState<SplitDraft[]>(group.members.map((member) => createSplitDraft(member.user.id)));

  useEffect(() => {
    const memberIds = new Set(group.members.map((member) => member.user.id));
    setSplits((current) =>
      group.members.map((member) => current.find((split) => split.userId === member.user.id) || createSplitDraft(member.user.id))
    );
    if (!memberIds.has(paidById)) {
      setPaidById(group.members[0]?.user.id || "");
    }
  }, [group.members, paidById]);

  const selectedSplits = useMemo(() => splits.filter((split) => split.selected), [splits]);

  const mutation = useMutation({
    mutationFn: () =>
      postJson("/api/expenses", {
        groupId: group.id,
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
      }),
    onSuccess: async () => {
      setDescription("");
      setAmount("");
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "group", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "overall"] });
      showToast({ tone: "success", title: "Expense added", body: "Balances were recalculated for the group." });
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
          <Input
            inputMode="decimal"
            placeholder="45.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
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
        <div className="grid gap-2">
          {group.members.map((member) => {
            const split = splits.find((item) => item.userId === member.user.id) || createSplitDraft(member.user.id);
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
                  <Input
                    placeholder="Amount"
                    value={split.amount}
                    onChange={(event) => updateSplit(member.user.id, { amount: event.target.value })}
                  />
                )}
                {splitMethod === "PERCENTAGE" && (
                  <Input
                    placeholder="Percent"
                    value={split.percentage}
                    onChange={(event) => updateSplit(member.user.id, { percentage: event.target.value })}
                  />
                )}
                {splitMethod === "SHARES" && (
                  <Input
                    placeholder="Shares"
                    value={split.shares}
                    onChange={(event) => updateSplit(member.user.id, { shares: event.target.value })}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {mutation.error && <p className="text-sm text-coral">{mutation.error.message}</p>}
      <Button type="submit" disabled={mutation.isPending}>
        <Plus size={16} /> {mutation.isPending ? "Adding..." : "Add expense"}
      </Button>
    </form>
  );
}
