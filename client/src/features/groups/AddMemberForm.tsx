import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Field";
import { useToast } from "../../components/Toast";
import { postJson } from "../../lib/api";

export function AddMemberForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: () => postJson(`/api/groups/${groupId}/members`, { email }),
    onSuccess: async () => {
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      showToast({ tone: "success", title: "Member added", body: "Group membership was refreshed." });
    }
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <Input
        type="email"
        placeholder="existing.user@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Button type="submit" disabled={mutation.isPending}>
        <UserPlus size={16} /> Add
      </Button>
      {mutation.error && <p className="text-sm text-red-700 sm:col-span-2">{mutation.error.message}</p>}
    </form>
  );
}
