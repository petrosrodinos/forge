export const TOKENS_PER_EUR = 100;
export const MARKUP_FACTOR = 1.1;

/**
 * FX: how many EUR one USD is worth (used to turn provider USD list prices into EUR).
 * Example: 0.87 → $1 ≈ €0.87.
 */
export const DOLLARS_TO_EUR_RATE = 0.87;

/**
 * Tripo pricing: how many Tripo credits you get for **$1 USD** (e.g. 100 credits = $1).
 * Credits per **1 EUR** (indicative provider cost) = creditsPerUsd / DOLLARS_TO_EUR_RATE —
 */
export const TRIPPO_CREDITS_PER_USD = 100;
export const TOKENS_PER_EUR_TRIPPO = TRIPPO_CREDITS_PER_USD / DOLLARS_TO_EUR_RATE;

/** Wallet tokens debited per agent chat request (post-markup units). */
export const CHAT_DEBIT_TOKENS = 4;

/** Pre-markup ledger fields for `TokenUsage` on chat debits. */
export const CHAT_TOKENS_ORIGINAL = CHAT_DEBIT_TOKENS / MARKUP_FACTOR;
export const CHAT_PRICE_ORIGINAL_USD = CHAT_TOKENS_ORIGINAL / TOKENS_PER_EUR;