/**
 * Prisma's `@db.ObjectId` fields expect a 24-hex string.
 */
export function isObjectIdLike(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

