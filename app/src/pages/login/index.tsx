import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { AuthPageShell } from "@/components/layouts/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { BILLING_PACK_QUERY_PARAM } from "@/features/billing/constants";
import type { TokenPackDto } from "@/features/billing/interfaces/billing.interfaces";
import { useCheckout, usePacks } from "@/features/billing/hooks/use-billing.hooks";

const fieldClass =
  "rounded-lg border-border/80 bg-surface/50 py-2.5 transition-colors focus:border-accent/50 focus:bg-surface/70";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const packIdFromUrl = searchParams.get(BILLING_PACK_QUERY_PARAM);
  const packsQuery = usePacks();
  const checkoutMutation = useCheckout();

  const selectedPack = useMemo(() => {
    if (!packIdFromUrl || !packsQuery.data) return undefined;
    return packsQuery.data.find((p) => p.id === packIdFromUrl);
  }, [packIdFromUrl, packsQuery.data]);

  const defaultSubtitle = "Welcome back — use your email and password to open the forge.";

  const subtitle = selectedPack
    ? `You will continue to checkout for ${selectedPack.name} (${selectedPack.tokens.toLocaleString()} tokens) after sign-in.`
    : defaultSubtitle;

  const registerHref = packIdFromUrl
    ? `/register?${BILLING_PACK_QUERY_PARAM}=${encodeURIComponent(packIdFromUrl)}`
    : "/register";

  async function startCheckoutForPack(packId: string): Promise<void> {
    const cached = queryClient.getQueryData<TokenPackDto[]>(["billing", "packs"]);
    const valid = cached?.some((p) => p.id === packId) ?? false;
    if (!valid) {
      toast.message("That pack is not available. Choose one under Billing in settings.");
      void navigate("/forge");
      return;
    }
    try {
      await checkoutMutation.mutateAsync(packId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      void navigate("/settings/billing");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      if (packIdFromUrl) {
        await startCheckoutForPack(packIdFromUrl);
        return;
      }
      void navigate("/forge");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const isBusy = loading || checkoutMutation.isPending;

  return (
    <AuthPageShell
      title="Sign in"
      subtitle={subtitle}
      icon={LogIn}
      footer={
        <>
          No account yet?{" "}
          <Link
            to={registerHref}
            className="font-medium text-accent-light underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
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
        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={fieldClass}
          required
        />
        {error ? (
          <div
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={isBusy}>
          {loading ? (
            <Spinner className="h-4 w-4" />
          ) : checkoutMutation.isPending ? (
            <>
              <Spinner className="h-4 w-4" />
              Opening checkout…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </AuthPageShell>
  );
}
