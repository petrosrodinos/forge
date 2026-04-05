export interface TokenPackDto {
  id: string;
  name: string;
  tokens: number;
  price: number;
}

export interface PurchaseRecordDto {
  id: string;
  packId: string;
  tokens: number;
  amountCents: number;
  createdAt: string;
}

export interface TokenUsageRecordDto {
  id: string;
  usageKind: string;
  modelId: string;
  operation: string | null;
  tokens: number;
  createdAt: string;
  /** Provider cost snapshots when available (`providerCosts.aimlapi` / `providerCosts.trippo`). */
  metadata: unknown | null;
}
