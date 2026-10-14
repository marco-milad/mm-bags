import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INDEXNOW_KEY, indexNowPayload, productPaths } from "../indexnow";

describe("IndexNow key file", () => {
  it("is served from public/<key>.txt with the key as its only content", () => {
    const file = path.resolve(__dirname, "../../../public", `${INDEXNOW_KEY}.txt`);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, "utf8").trim()).toBe(INDEXNOW_KEY);
  });

  it("uses a valid IndexNow key format (8–128 hex/alnum chars)", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-zA-Z0-9-]{8,128}$/);
  });
});

describe("indexNowPayload", () => {
  it("builds absolute, de-duplicated same-host URLs with the key location", () => {
    const p = indexNowPayload("https://mm-bags.vercel.app", ["/ar", "/ar", "https://mm-bags.vercel.app/en"]);
    expect(p.host).toBe("mm-bags.vercel.app");
    expect(p.urlList).toEqual(["https://mm-bags.vercel.app/ar", "https://mm-bags.vercel.app/en"]);
    expect(p.keyLocation).toBe(`https://mm-bags.vercel.app/${INDEXNOW_KEY}.txt`);
  });

  it("drops URLs on other hosts (IndexNow rejects mixed hosts)", () => {
    const p = indexNowPayload("https://mm-bags.vercel.app", ["https://evil.example/x", "/ar/faq"]);
    expect(p.urlList).toEqual(["https://mm-bags.vercel.app/ar/faq"]);
  });
});

describe("productPaths", () => {
  it("covers both locales", () => {
    expect(productPaths("pink-luggage")).toEqual(["/ar/products/pink-luggage", "/en/products/pink-luggage"]);
  });
});
