import type { FigureTypeValue } from "../config/figure-types";

/** Three distinct creative directions per figure type (generations 1–3). */
export const FIGURE_TYPE_SUBJECTS: Record<FigureTypeValue, readonly [string, string, string]> = {
  humanoid: [
    "stylized fantasy warrior in leather-and-steel armor with a longsword, neutral standing pose facing camera",
    "hooded rogue in light armor with twin curved daggers, compact readable silhouette",
    "sci-fi tactical soldier in helmet and vest with a compact rifle, symmetric front-facing stance",
  ],
  creature: [
    "quadruped armored predator beast with plated hide and thick tail, alert stance, full body visible",
    "compact wyvern-like creature with folded wings and horn ridges, grounded pose",
    "alien insectoid with glossy segmented chitin and six legs, symmetric body",
  ],
  npc: [
    "friendly townsfolk merchant in layered travel robes with belt pouches and a walking stick",
    "armored city guard with spear and heater shield, formal front stance",
    "mysterious robed scholar clutching a tome with a small floating magical orb near one hand",
  ],
  obstacle: [
    "modular concrete jersey barrier chunk with painted hazard stripes, single continuous prop",
    "wooden spike palisade wall segment tied with rope, one cohesive barricade piece",
    "toppled ancient stone column segment with carved geometric bands, heavy cover object",
  ],
  weapon: [
    "ornate fantasy greatsword with wide blade and leather-wrapped grip, vertical centered",
    "sci-fi assault rifle with clean hard-surface panels and a subtle glowing power cell",
    "twin-headed battle axe with compact curved blades on a single haft",
  ],
  armor: [
    "complete fantasy plate armor presented as a single armored statue bust-down (helmet, torso, arms, legs as one sculpt)",
    "elven leaf-pattern mail and leather layered armor suit as one rigid mannequin-like form",
    "heavy powered exosuit armor with broad pauldrons and sealed helmet as one solid figure",
  ],
  vehicle: [
    "compact off-road dune buggy with chunky tires and roll cage, three-quarter front view",
    "sleek sci-fi hover bike with single seat and glowing repulsor accents, full vehicle in frame",
    "small armored APC troop carrier with sloped armor panels, four wheels visible",
  ],
  mount: [
    "armored warhorse with barding and saddle as one creature prop, side-facing full body",
    "large wolf mount with saddle straps and fur trim, grounded quadruped pose",
    "fantasy giant beetle mount with saddle on the carapace, six legs visible",
  ],
  building: [
    "modular fantasy cottage facade chunk with door and timber frame, single building segment",
    "sci-fi bunker entrance airlock segment with metal bulkhead, standalone prop",
    "broken temple archway ruin with cracked columns as one environment chunk",
  ],
  environment_prop: [
    "vintage iron street lamp post with lantern top, single vertical prop",
    "cluster of wooden barrels and crates stacked as one staged pile",
    "industrial sci-fi generator crate with vents and cable ports, one boxy unit",
  ],
  item: [
    "cluster of glass potion bottles with corks and leather harness as one grouped collectible",
    "closed wooden treasure chest with metal bands and a simple lock plate",
    "stack of large fantasy gold coins forming one small pile prop",
  ],
  projectile: [
    "single streamlined missile rocket with fins, horizontal centered",
    "fantasy arrow mid-flight frozen with a short stylized motion trail as one mesh-friendly shape",
    "compact plasma energy bolt sphere with inner glow, isolated projectile",
  ],
  effect: [
    "single magical arcane sigil ring of fire and sparks as one cohesive VFX-readable form",
    "isolated swirling wind and leaf vortex column as one stylized effect element",
    "compact electric lightning burst ball with branching arcs contained in one volume",
  ],
};
