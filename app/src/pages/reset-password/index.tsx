import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { AuthPageShell } from "@/components/layouts/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useResetPassword } from "@/features/auth/hooks/use-auth.hooks";

const fieldClass =
  "rounded-lg border-border/80 bg-surface/50 py-2.5 transition-colors focus:border-accent/50 focus:bg-surface/70";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const resetPassword = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasToken = token.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await resetPassword.mutateAsync({ token, password });
      void navigate("/login");
    } catch {
      /* toast handled in hook */
    }
  }

  return (
    <AuthPageShell
      title="Reset password"
      subtitle={
        hasToken
          ? "Choose a new password for your account."
          : "This reset link is missing or invalid. Request a new one from the forgot password page."
      }
      icon={LockKeyhole}
      footer={
        <>
          Back to{" "}
          <Link
            to="/login"
            className="font-medium text-accent-light underline-offset-2 hover:underline"
          >
            sign in
          </Link>
        </>
      }
    >
      {!hasToken ? (
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-accent-light underline-offset-2 hover:underline"
        >
          Request a new reset link
        </Link>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
          <Input
            id="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={fieldClass}
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
          <Input
            id="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className={fieldClass}
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
          {error ? (
            <div
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={resetPassword.isPending}>
            {resetPassword.isPending ? <Spinner className="h-4 w-4" /> : "Update password"}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
