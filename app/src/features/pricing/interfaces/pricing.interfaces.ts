export type PricingRatesDto = {
  tokensPerUsd: number;
  chatDebitTokens: number;
};

export type PricingPackDto = {
  id: string;
  name: string;
  tokens: number;
  price: number;
};

export type PricingOperationDto = {
  id: string;
  label: string;
  tokens: number;
};

export type PricingTrippoModelDto = {
  id: string;
  tokens: number;
  priceUsd: number;
};

export type PricingImageModelDto = {
  id: string;
  name: string;
  provider: string;
  tokens: number;
  priceUsd: number;
  available: boolean;
  imageToImage: boolean;
};

export type PricingCatalogDto = {
  rates: PricingRatesDto;
  packs: PricingPackDto[];
  operations: PricingOperationDto[];
  trippoModels: PricingTrippoModelDto[];
  imageModels: PricingImageModelDto[];
};
