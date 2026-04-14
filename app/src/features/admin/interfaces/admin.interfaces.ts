export interface AdminMetricsDto {
  netPurchaseCents: number;
  totalStripeFeeCents: number;
  tokenUsagePriceTotal: number;
  tokenUsagePriceOriginalTotal: number;
  tokenUsageMarginTotal: number;
  generatedImagesCount: number;
  generatedMeshesCount: number;
  generatedRigsCount: number;
  generatedAnimationsCount: number;
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
