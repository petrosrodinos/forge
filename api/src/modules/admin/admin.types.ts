export interface AdminMetricsDto {
  /** Sum of (amountCents − Stripe fee) across all purchases, in minor units (e.g. euro cents). */
  netPurchaseCents: number;
  /** Σ recorded Stripe fees (`TokenPurchase.stripeFeeCents`); missing fees count as 0. */
  totalStripeFeeCents: number;
  /** Σ `TokenUsage.price` (ledger / USD-equivalent units). */
  tokenUsagePriceTotal: number;
  /** Σ `TokenUsage.priceOriginal`. */
  tokenUsagePriceOriginalTotal: number;
  /** Σ (price − priceOriginal); equals `tokenUsagePriceTotal − tokenUsagePriceOriginalTotal` up to float rounding. */
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

export interface AdminUserUpdateInput {
  email: string;
  displayName: string | null;
  role: "USER" | "ADMIN";
  tokenBalance: number;
}
