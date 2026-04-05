import type { PropsWithChildren } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { Spinner } from "@/components/ui/Spinner";
import { Shell } from "@/components/layouts/Shell";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgePage from "@/pages/forge";
import SettingsPage from "@/pages/settings";
import SettingsAccountPage from "@/pages/settings/subpages/account";
import SettingsBillingPage from "@/pages/settings/subpages/billing";
import PricingPage from "@/pages/pricing";
import LandingPage from "@/pages/landing";

function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="w-6 h-6" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LandingRoute() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }
  return <LandingPage />;
}

function GuestOnly({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }
  if (user) return <Navigate to="/forge" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route path="/pricing" element={<Shell />}>
        <Route index element={<PricingPage />} />
      </Route>
      <Route
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route path="forge" element={<ForgePage />} />
        <Route path="billing" element={<Navigate to="/settings/billing" replace />} />
        <Route path="settings" element={<SettingsPage />}>
          <Route index element={<Navigate to="account" replace />} />
          <Route path="account" element={<SettingsAccountPage />} />
          <Route path="billing" element={<SettingsBillingPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
