function parseDefaultNewUserTokenBalance(value: string | undefined): number {
  const raw = value?.trim();
  if (!raw) return 100;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.floor(n));
}

export const USERS_CONFIG = {
  /** Starting token balance granted on registration. */
  DEFAULT_NEW_USER_TOKEN_BALANCE: parseDefaultNewUserTokenBalance(process.env.DEFAULT_NEW_USER_TOKEN_BALANCE),
} as const;

