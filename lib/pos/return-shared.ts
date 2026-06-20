/**
 * Client-safe types for the POS-returns flow.
 *
 * The server-side query module (`lib/queries/admin-pos-returns.ts`)
 * is `"server-only"`, which means any client component that needs
 * these shapes can't import from it without dragging the supabase
 * admin client into the browser bundle. Re-declaring them here
 * keeps the client side type-safe without that leak.
 *
 * Mirror with the server query types — keep in sync if shapes
 * change. The action wrappers in `lib/pos/return-actions.ts`
 * import the shapes from the server query module, so a divergence
 * between the two will surface as a TypeScript error there.
 */

export type PosSaleSearchResult = {
  id: string;
  saleNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  returnsTotal: number;
  hasReturns: boolean;
};

export type ReturnablePosLine = {
  saleItemId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  originalQty: number;
  returnedQty: number;
  remainingQty: number;
  unitPrice: number;
};

export type ReturnableSaleSummary = {
  id: string;
  saleNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
};
