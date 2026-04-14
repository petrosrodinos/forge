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
  /** Number of generated image records. */
  generatedImagesCount: number;
  /** Number of generated mesh records (Model3D rows). */
  generatedMeshesCount: number;
  /** Number of mesh records that have started rigging. */
  generatedRigsCount: number;
  /** Number of generated animation records. */
  generatedAnimationsCount: number;
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

export interface AdminUserPurchaseDto {
  userId: string;
  userEmail: string;
  id: string;
  packId: string;
  packName: string;
  tokens: number;
  amountCents: number;
  stripeFeeCents: number | null;
  stripeSessionId: string;
  createdAt: string;
}
