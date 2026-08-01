import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useChangePassword,
  useUpdateProfile,
} from "@/features/auth/hooks/use-auth.hooks";
import type { User } from "@/interfaces";

const MIN_PASSWORD_LENGTH = 8;

interface AccountUpdateFormProps {
  user: User;
}

export function AccountUpdateForm({ user }: AccountUpdateFormProps) {
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [email, setEmail] = useState(user.email);
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(user.email);
    setDisplayName(user.displayName ?? "");
  }, [user.email, user.displayName]);

  const emailChanged = email.trim() !== user.email;
  const nameChanged = displayName.trim() !== (user.displayName ?? "").trim();
  const passwordChanging = newPassword.length > 0 || confirmPassword.length > 0;
  const isDirty = emailChanged || nameChanged || passwordChanging;
  const isSaving = updateProfile.isPending || changePassword.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nextEmail = email.trim();
    const nextName = displayName.trim();

    if (!nextEmail) {
      setError("Email is required");
      return;
    }

    if (emailChanged && !currentPassword) {
      setError("Current password is required to change email");
      return;
    }

    if (passwordChanging) {
      if (!currentPassword) {
        setError("Current password is required to change password");
        return;
      }
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (newPassword === currentPassword) {
        setError("New password must be different");
        return;
      }
    }

    try {
      if (emailChanged || nameChanged) {
        await updateProfile.mutateAsync({
          ...(emailChanged ? { email: nextEmail, currentPassword } : {}),
          ...(nameChanged ? { displayName: nextName } : {}),
        });
      }

      if (passwordChanging) {
        await changePassword.mutateAsync({
          currentPassword,
          newPassword,
        });
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Account updated");
    } catch {
      /* toast handled in hooks */
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="overflow-hidden rounded-2xl border border-border bg-panel/95 ring-1 ring-white/5"
    >
      <div className="space-y-4 p-5 sm:p-6">
        <Input
          id="account-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSaving}
        />
        <Input
          id="account-display-name"
          label="Display name"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={120}
          placeholder="Your name"
          disabled={isSaving}
        />
        <Input
          id="account-current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Required to change email or password"
          disabled={isSaving}
        />
        <Input
          id="account-new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={`Leave blank to keep current · min ${MIN_PASSWORD_LENGTH} chars`}
          disabled={isSaving}
        />
        <Input
          id="account-confirm-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isSaving}
        />
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
      <div className="flex justify-end border-t border-border/80 px-5 py-4 sm:px-6">
        <Button type="submit" disabled={!isDirty || isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
