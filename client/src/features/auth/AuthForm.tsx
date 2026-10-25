import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Field, Input } from "../../components/Field";
import { useToast } from "../../components/Toast";
import { ApiError } from "../../lib/api";
import { useAuth } from "./AuthProvider";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signup") await signup(name, email, password);
      else await login(email, password);
      showToast({
        tone: "success",
        title: mode === "signup" ? "Account created" : "Welcome back",
        body: "Your workspace is ready."
      });
      navigate("/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Authentication failed";
      setError(message);
      showToast({ tone: "error", title: "Authentication failed", body: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cloud px-4 py-10 text-ink">
      <form onSubmit={handleSubmit} className="glass-panel w-full max-w-md rounded-lg p-6">
        <div className="mb-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-elevated/70 px-3 py-1 text-xs font-semibold text-muted">
            FairShare import studio
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{mode === "signup" ? "Create account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Audit shared expenses, explain balances, and settle faster.</p>
        </div>
        <div className="grid gap-4">
          {mode === "signup" && (
            <Field label="Name">
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          {error && <p className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Working..." : mode === "signup" ? "Sign up" : "Log in"}
          </Button>
          <p className="text-center text-sm text-muted">
            {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
            <Link className="font-semibold text-mint" to={mode === "signup" ? "/login" : "/signup"}>
              {mode === "signup" ? "Log in" : "Sign up"}
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
