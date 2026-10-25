import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { Field, Input, Select } from "../../components/Field";
import { useToast } from "../../components/Toast";
import { postJson } from "../../lib/api";
import { parseMoneyToCents } from "../../lib/format";
import type { Group } from "../../types/domain";

export function SettlementForm({ group }: { group: Group }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [fromUserId, setFromUserId] = useState(group.members[0]?.user.id || "");
  const [toUserId, setToUserId] = useState(group.members[1]?.user.id || "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      postJson("/api/settlements", {
        groupId: group.id,
        fromUserId,
        toUserId,
        amountCents: parseMoneyToCents(amount),
        note
      }),
    onSuccess: async () => {
      setAmount("");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "group", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["balances", "overall"] });
      showToast({ tone: "success", title: "Settlement recorded", body: "Open balances were refreshed." });
    }
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="From">
          <Select value={fromUserId} onChange={(event) => setFromUserId(event.target.value)}>
            {group.members.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="To">
          <Select value={toUserId} onChange={(event) => setToUserId(event.target.value)}>
            {group.members.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount">
          <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="20.00" required />
        </Field>
        <Field label="Note">
          <Input value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
      {mutation.error && <p className="text-sm text-coral">{mutation.error.message}</p>}
      <Button type="submit" disabled={mutation.isPending || group.members.length < 2}>
        {mutation.isPending ? "Recording..." : "Record settlement"}
      </Button>
    </form>
  );
}
