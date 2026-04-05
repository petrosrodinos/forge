import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { AuthPageShell } from "@/components/layouts/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useRegister } from "@/features/auth/hooks/use-auth.hooks";
import { BILLING_PACK_QUERY_PARAM } from "@/features/billing/constants";
import type { TokenPackDto } from "@/features/billing/interfaces/billing.interfaces";
import { useCheckout, usePacks } from "@/features/billing/hooks/use-billing.hooks";
import { useAuthStore } from "@/store/authStore";

const fieldClass =
  "rounded-lg border-border/80 bg-surface/50 py-2.5 transition-colors focus:border-accent/50 focus:bg-surface/70";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const packIdFromUrl = searchParams.get(BILLING_PACK_QUERY_PARAM);
  const packsQuery = usePacks();
  const register = useRegister();
  const checkoutMutation = useCheckout();

  const selectedPack = useMemo(() => {
    if (!packIdFromUrl || !packsQuery.data) return undefined;
    return packsQuery.data.find((p) => p.id === packIdFromUrl);
  }, [packIdFromUrl, packsQuery.data]);

  const defaultSubtitle =
    "Set up your profile — you will land in the forge as soon as you are signed in.";

  const subtitle = selectedPack
    ? `You chose ${selectedPack.name} (${selectedPack.tokens.toLocaleString()} tokens). After sign-up you will continue to secure Stripe checkout.`
    : defaultSubtitle;

  const loginHref = packIdFromUrl
    ? `/login?${BILLING_PACK_QUERY_PARAM}=${encodeURIComponent(packIdFromUrl)}`
    : "/login";

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate(
      { email, password, displayName },
      {
        onSuccess: async () => {
          await useAuthStore.getState().fetchMe();
          if (packIdFromUrl) {
            await startCheckoutForPack(packIdFromUrl);
            return;
          }
          void navigate("/forge");
        },
      },
    );
  }

  const isBusy = register.isPending || checkoutMutation.isPending;

  return (
    <AuthPageShell
      title="Create account"
      subtitle={subtitle}
      icon={UserPlus}
      footer={
        <>
          Already registered?{" "}
          <Link to={loginHref} className="font-medium text-accent-light underline-offset-2 hover:underline">
            Sign in instead
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          id="displayName"
          label="Display name"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How we should greet you"
          className={fieldClass}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Choose a strong password"
          className={fieldClass}
          required
        />
        {register.isError ? (
          <div
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
            role="alert"
          >
            {(register.error as Error).message}
          </div>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={isBusy}>
          {register.isPending ? (
            <Spinner className="h-4 w-4" />
          ) : checkoutMutation.isPending ? (
            <>
              <Spinner className="h-4 w-4" />
              Opening checkout…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthPageShell>
  );
}
