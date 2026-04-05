/**
 * Figure types for the batch generation script only.
 * Must stay in sync with `FIGURE_TYPES` in
 * `app/src/pages/forge/components/figure-list/index.tsx` (frontend owns that list).
 */
export const FIGURE_TYPES = [
  { value: "humanoid", label: "Humanoid" },
  { value: "creature", label: "Creature" },
  { value: "npc", label: "NPC" },
  { value: "obstacle", label: "Obstacle" },
  { value: "weapon", label: "Weapon" },
  { value: "armor", label: "Armor" },
  { value: "vehicle", label: "Vehicle" },
  { value: "mount", label: "Mount" },
  { value: "building", label: "Building" },
  { value: "environment_prop", label: "Environment Prop" },
  { value: "item", label: "Item / Collectible" },
  { value: "projectile", label: "Projectile" },
  { value: "effect", label: "Effect" },
] as const;

export type FigureTypeEntry = (typeof FIGURE_TYPES)[number];
export type FigureTypeValue = FigureTypeEntry["value"];

export const FIGURE_TYPE_VALUES: FigureTypeValue[] = FIGURE_TYPES.map((t) => t.value);

export function isFigureTypeValue(v: string): v is FigureTypeValue {
  return (FIGURE_TYPE_VALUES as readonly string[]).includes(v);
}
