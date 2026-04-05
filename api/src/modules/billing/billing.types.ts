export interface CheckoutInput {
  packId: string;
}

export interface PurchaseRecord {
  id: string;
  packId: string;
  tokens: number;
  amountCents: number;
  createdAt: string;
}

export interface BalanceResponse {
  balance: number;
}

export interface UsageRecord {
  id: string;
  usageKind: string;
  modelId: string;
  operation: string | null;
  tokens: number;
  createdAt: string;
  /** Provider response snapshots (AimlAPI / Tripo) for cost reconciliation. */
  metadata: unknown | null;
}
