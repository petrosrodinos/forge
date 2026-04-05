export interface AdminMetricsDto {
  /** Sum of (amountCents − Stripe fee) across all purchases, in minor units (e.g. euro cents). */
  netPurchaseCents: number;
  /** Sum of (price − priceOriginal) across all usage rows (ledger / USD-equivalent units). */
  tokenUsageMarginTotal: number;
}

export interface AdminUserRowDto {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  tokenBalance: number;
  createdAt: string;
  updatedAt: string;
}
