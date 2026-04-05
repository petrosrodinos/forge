export function formatUsageKind(kind: string): string {
  const map: Record<string, string> = { image: "Image", trippo: "Tripo", chat: "Chat" };
  return map[kind] ?? kind;
}
