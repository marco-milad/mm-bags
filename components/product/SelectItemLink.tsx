"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics/track";

/**
 * A product-card link that fires a `select_item` analytics event on click,
 * carrying the search attribution (search id, list id, position). This is the
 * click side of the search funnel: the Search Report's per-term "clicks" and
 * Product Demand's CTR both join `select_item.search_id` back to the `search`
 * event's impressions. Renders an ordinary next/link; `track()` no-ops without
 * consent and never blocks navigation.
 */
export function SelectItemLink({
  href,
  prefetch,
  className,
  productId,
  searchId,
  listId,
  position,
  children,
}: {
  href: string;
  prefetch?: boolean;
  className?: string;
  productId: string;
  searchId?: string;
  listId: string;
  position?: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={className}
      onClick={() =>
        track({ name: "select_item", productId, searchId, listId, position })
      }
    >
      {children}
    </Link>
  );
}
