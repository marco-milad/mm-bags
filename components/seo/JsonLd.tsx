/**
 * Tiny server component that serialises a JSON-LD object into a
 * `<script type="application/ld+json">` tag.
 *
 * Why a component (and not `metadata.other`)? Next 16's Metadata
 * doesn't directly support arbitrary script tags, and emitting the
 * tag from the page body works the same for crawlers (Google's
 * structured-data extractor reads anywhere in the document).
 *
 * Pass an array of schemas to render multiple — each gets its own
 * script tag. Avoid wrapping in `@graph` because Google handles
 * separate tags identically and per-tag debugging is easier.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((schema, i) => (
        <script
          // eslint-disable-next-line react/no-danger -- JSON-LD is a string blob; we
          // produce it via JSON.stringify so there's no untrusted markup.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          key={i}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
