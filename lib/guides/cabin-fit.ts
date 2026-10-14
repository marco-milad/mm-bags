/**
 * Does a bag fit an airline's cabin limit? Airlines print their limits in
 * different orders (L×W×H, H×W×D, 23×40×55), so both sides are compared
 * longest-to-shortest. Some also cap the sum of the three (e.g. 115 cm).
 * Pure: the cabin guide's "will our bag fit?" column is computed from this,
 * never typed by hand.
 */
export type Dims = readonly [number, number, number];

export type CabinLimit = {
  dims: Dims;
  /** Max L+W+H in cm, when the airline states one. */
  maxLinear?: number;
};

const sortDesc = (d: Dims) => [...d].sort((a, b) => b - a);

export function fitsCabin(bag: Dims, limit: CabinLimit): boolean {
  const b = sortDesc(bag);
  const l = sortDesc(limit.dims);
  if (b.some((v, i) => v > l[i])) return false;
  if (limit.maxLinear !== undefined && b[0] + b[1] + b[2] > limit.maxLinear) return false;
  return true;
}

/** No-break spaces: "55 × 40 × 23" must never wrap across lines in a table cell. */
export const fmtDims = (d: Dims) => d.join(" × ");
