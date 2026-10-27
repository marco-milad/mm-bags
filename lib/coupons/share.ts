/**
 * Sending a subscriber their code without a mail domain: the admin opens a
 * pre-filled Gmail compose window (Marco's own account) and presses Send.
 * Pure — tested in __tests__/share.test.ts.
 */

export function couponMessage(opts: {
  locale: "ar" | "en";
  code: string;
  percentOff: number;
  expiresAt: string | null;
  siteUrl: string;
}): { subject: string; body: string } {
  const until = opts.expiresAt
    ? new Intl.DateTimeFormat(opts.locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Cairo",
      }).format(new Date(opts.expiresAt))
    : null;
  const shop = `${opts.siteUrl.replace(/\/+$/, "")}/${opts.locale}/catalog`;

  if (opts.locale === "ar") {
    return {
      subject: `كود خصم ${opts.percentOff}٪ خاص بيك من M.M Bags`,
      body: [
        "أهلاً بيك 👋",
        "",
        `شكرًا إنك اشتركت في نشرة M.M Bags. ده كود خصم ${opts.percentOff}٪ خاص بيك على أول طلب:`,
        "",
        opts.code,
        "",
        `اكتبه في خانة «معاك كود خصم؟» في صفحة الدفع. الكود بيتستخدم مرة واحدة${until ? `، وصالح لحد ${until}` : ""}.`,
        "",
        `تسوّق من هنا: ${shop}`,
        "",
        "سافر بذكاء. سافر بأناقة.",
        "— ماركو ميلاد، M.M Bags",
      ].join("\n"),
    };
  }
  return {
    subject: `Your personal ${opts.percentOff}% code from M.M Bags`,
    body: [
      "Hello 👋",
      "",
      `Thanks for subscribing to the M.M Bags newsletter. Here is your personal ${opts.percentOff}% code for your first order:`,
      "",
      opts.code,
      "",
      `Enter it under "Have a discount code?" at checkout. It works once${until ? ` and is valid until ${until}` : ""}.`,
      "",
      `Shop here: ${shop}`,
      "",
      "Travel smart. Travel in style.",
      "— Marco Milad, M.M Bags",
    ].join("\n"),
  };
}

/** Gmail web compose URL (opens in the signed-in Google account). */
export function gmailComposeUrl(to: string, subject: string, body: string): string {
  const p = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return `https://mail.google.com/mail/?${p.toString()}`;
}
