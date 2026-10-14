import type { Guide } from "./types";
import { cabinByAirline } from "./cabin-by-airline";
import { hardVsSoft } from "./hard-vs-soft";
import { materials } from "./materials";
import { sizeGuide } from "./size-guide";

/** Display order on /guides. */
export const GUIDES: ReadonlyArray<Guide> = [sizeGuide, cabinByAirline, hardVsSoft, materials];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export { formatGuideDate } from "./format";
export type { Guide } from "./types";
