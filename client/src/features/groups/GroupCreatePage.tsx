import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Field, Input, TextArea } from "../../components/Field";
import { Panel } from "../../components/Panel";
import { useToast } from "../../components/Toast";
import { postJson } from "../../lib/api";
import type { Group } from "../../types/domain";

export function GroupCreatePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: () => postJson<{ group: Group }>("/api/groups", { name, description }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      showToast({ tone: "success", title: "Group created", body: `${data.group.name} is ready for expenses.` });
      navigate(`/groups/${data.group.id}`);
    }
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <Panel title="Create group">
      <form onSubmit={handleSubmit} className="grid max-w-2xl gap-4">
        <Field label="Group name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        {mutation.error && <p className="text-sm text-red-700">{mutation.error.message}</p>}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create group"}
        </Button>
      </form>
    </Panel>
  );
}
