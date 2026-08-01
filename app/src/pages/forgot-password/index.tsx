import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { AuthPageShell } from "@/components/layouts/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useForgotPassword } from "@/features/auth/hooks/use-auth.hooks";

const fieldClass =
  "rounded-lg border-border/80 bg-surface/50 py-2.5 transition-colors focus:border-accent/50 focus:bg-surface/70";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await forgotPassword.mutateAsync({ email });
      setSubmitted(true);
    } catch {
      /* toast handled in hook */
    }
  }

  return (
    <AuthPageShell
      title="Forgot password"
      subtitle="Enter your account email and we will send a reset link if it is registered."
      icon={KeyRound}
      footer={
        <>
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-medium text-accent-light underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      {submitted ? (
        <p className="text-sm leading-relaxed text-slate-400">
          If that email is registered, a reset link is on the way. Check your inbox and spam folder.
        </p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={fieldClass}
            required
          />
          <Button type="submit" size="lg" className="w-full" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? <Spinner className="h-4 w-4" /> : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
