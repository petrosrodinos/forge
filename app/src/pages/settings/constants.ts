export const SETTINGS_NAV = [
  { to: "account", label: "Account" },
  { to: "billing", label: "Billing" },
] as const;

export const SETTINGS_NAV_WITH_ADMIN = [
  ...SETTINGS_NAV,
  { to: "admin", label: "Admin" },
] as const;
