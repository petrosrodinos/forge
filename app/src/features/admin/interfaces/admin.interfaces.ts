export interface AdminMetricsDto {
  netPurchaseCents: number;
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
