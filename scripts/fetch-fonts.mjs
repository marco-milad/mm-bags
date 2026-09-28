// Re-downloads the woff2 files in app/fonts from Google Fonts.
//
// The app self-hosts its fonts so that a build never depends on
// fonts.gstatic.com being reachable — see the note in app/[locale]/layout.tsx.
// Run this only when a family needs different weights or subsets, then
// update the src[] arrays in that file to match.
//
//   node scripts/fetch-fonts.mjs app/fonts
//
import fs from "node:fs";
import path from "node:path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const OUT = process.argv[2] ?? "app/fonts";

// Only the subsets the app actually declares — matching the current
// next/font/google config exactly so nothing changes visually.
const FAMILIES = [
  { q: "Cormorant+Garamond:wght@400;500;600;700", subset: "latin",  prefix: "cormorant-garamond" },
  { q: "Jost:wght@100..900",                      subset: "latin",  prefix: "jost" },
  { q: "Tajawal:wght@400;500;700;800",            subset: "arabic", prefix: "tajawal" },
  { q: "JetBrains+Mono:wght@100..800",            subset: "latin",  prefix: "jetbrains-mono" },
];

for (const fam of FAMILIES) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${fam.q}&display=swap`, { headers: { "User-Agent": UA } })).text();

  // Each @font-face is preceded by a /* subset */ comment.
  const blocks = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) blocks.push({ subset: m[1], body: m[2] });

  const wanted = blocks.filter((b) => b.subset === fam.subset);
  if (!wanted.length) throw new Error(`${fam.prefix}: no "${fam.subset}" block found`);

  for (const b of wanted) {
    const weight = (b.body.match(/font-weight:\s*([^;]+);/) || [])[1]?.trim();
    const url = (b.body.match(/src:\s*url\(([^)]+)\)/) || [])[1];
    if (!url) continue;
    const variable = weight.includes(" ");
    const name = variable
      ? `${fam.prefix}-variable.woff2`
      : `${fam.prefix}-${weight}.woff2`;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    fs.writeFileSync(path.join(OUT, name), buf);
    console.log(`${name.padEnd(32)} ${String(weight).padEnd(10)} ${(buf.length / 1024).toFixed(1)} KB`);
  }
}
