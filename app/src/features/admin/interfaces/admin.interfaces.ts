export interface AdminMetricsDto {
  netPurchaseCents: number;
  totalStripeFeeCents: number;
  tokenUsagePriceTotal: number;
  tokenUsagePriceOriginalTotal: number;
  tokenUsageMarginTotal: number;
}

export interface AdminUserRowDto {
  id: string;
  email: string;
  displayName: string | null;
  role: "USER" | "ADMIN";
  tokenBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserUpdateInput {
  email: string;
  displayName: string | null;
  role: "USER" | "ADMIN";
  tokenBalance: number;
}
