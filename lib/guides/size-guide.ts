import type { Guide } from "./types";

/**
 * Typical ranges, not promises: compiled from the size guides of Delsey,
 * Samsonite (UK + Australia) and American Tourister UK (see `sources`),
 * checked 2026-10-14. Each brand measures a little differently, so every
 * figure is a range.
 */
export const sizeGuide: Guide = {
  slug: "luggage-size-guide",
  published: "2026-10-26",
  updated: "2026-10-26",
  title: {
    ar: "دليل مقاسات شنط السفر: 20 و24 و28 بوصة بالسنتيمتر واللتر",
    en: "Suitcase size guide: 20, 24 and 28 inch in cm and litres",
  },
  description: {
    ar: "جدول مقاسات شنط السفر من 20 لـ 30 بوصة: الطول بالسنتيمتر، السعة باللتر، وتكفي سفر كام يوم — وإمتى تتشحن وإمتى تدخل الكابينة.",
    en: "A suitcase size chart from 20 to 30 inches: height in cm, capacity in litres and how many days each one suits — and which go in the cabin or the hold.",
  },
  summary: {
    ar: "شنطة 20 بوصة (حوالي 55 سم، 30–45 لتر) للكابينة ورحلة لحد 4 أيام. شنطة 24 بوصة (60–70 سم، 60–80 لتر) لأسبوع. شنطة 28 بوصة (71–79 سم، 75–110 لتر) لأسبوع لأسبوعين. أكبر من كده لأكتر من أسبوعين — وراجع حد الوزن ومجموع الأبعاد في شركة الطيران.",
    en: "A 20-inch case (about 55 cm, 30–45 L) is for the cabin and trips of up to 4 days. A 24-inch (60–70 cm, 60–80 L) covers a week. A 28-inch (71–79 cm, 75–110 L) covers one to two weeks. Bigger is for more than two weeks — and check your airline's weight and size limits.",
  },
  sections: [
    {
      id: "chart",
      title: { ar: "جدول المقاسات", en: "The size chart" },
      blocks: [
        {
          kind: "table",
          caption: { ar: "مقاسات شنط السفر", en: "Suitcase sizes" },
          head: [
            { ar: "المقاس", en: "Size" },
            { ar: "الطول برا (بالعجل)", en: "Outside height (with wheels)" },
            { ar: "السعة", en: "Capacity" },
            { ar: "تكفي", en: "Trip length" },
            { ar: "بتتحط فين", en: "Where it goes" },
          ],
          rows: [
            [
              { ar: "20 بوصة", en: "20\"" },
              { ar: "55–56 سم", en: "55–56 cm" },
              { ar: "30–45 لتر", en: "30–45 L" },
              { ar: "1–4 أيام", en: "1–4 days" },
              { ar: "كابينة (حسب الشركة)", en: "Cabin (airline-dependent)" },
            ],
            [
              { ar: "22 بوصة", en: "22\"" },
              { ar: "حوالي 56 سم أو أكتر", en: "About 56 cm or more" },
              { ar: "40–45 لتر", en: "40–45 L" },
              { ar: "3–4 أيام", en: "3–4 days" },
              { ar: "غالبًا أكبر من حد الكابينة — بتتشحن", en: "Usually over cabin limits — checked" },
            ],
            [
              { ar: "24 بوصة", en: "24\"" },
              { ar: "61–70 سم", en: "61–70 cm" },
              { ar: "60–80 لتر", en: "60–80 L" },
              { ar: "4–7 أيام", en: "4–7 days" },
              { ar: "بتتشحن", en: "Checked" },
            ],
            [
              { ar: "26 بوصة", en: "26\"" },
              { ar: "66–72 سم", en: "66–72 cm" },
              { ar: "60–80 لتر", en: "60–80 L" },
              { ar: "أسبوع لأسبوعين", en: "1–2 weeks" },
              { ar: "بتتشحن", en: "Checked" },
            ],
            [
              { ar: "28 بوصة", en: "28\"" },
              { ar: "71–79 سم", en: "71–79 cm" },
              { ar: "75–110 لتر", en: "75–110 L" },
              { ar: "7–14 يوم", en: "7–14 days" },
              { ar: "بتتشحن", en: "Checked" },
            ],
            [
              { ar: "30 بوصة", en: "30\"" },
              { ar: "76–82 سم", en: "76–82 cm" },
              { ar: "90–120 لتر", en: "90–120 L" },
              { ar: "أكتر من أسبوعين", en: "2 weeks +" },
              { ar: "بتتشحن — راجع حد 158 سم", en: "Checked — mind the 158 cm limit" },
            ],
          ],
          note: {
            ar: "نطاقات تقريبية من جداول مقاسات Delsey وSamsonite وAmerican Tourister. المقاس الفعلي لكل شنطة مكتوب في صفحة المنتج.",
            en: "Approximate ranges from the Delsey, Samsonite and American Tourister size guides. Each product page lists that case's actual size.",
          },
        },
      ],
    },
    {
      id: "inches",
      title: { ar: "البوصة مش مقياس ثابت", en: "Inches aren't a fixed measure" },
      blocks: [
        {
          kind: "p",
          text: {
            ar: "«20 بوصة» اسم للمقاس أكتر منه قياس. في ماركات بتقيس الجسم من غير العجل والإيد، فشنطة مكتوب عليها 24 بوصة ممكن تبقى 26 أو 27 بوصة شاملة العجل. شركات الطيران بتقيس الشنطة كلها، فالرقم اللي يهمك هو الطول والعرض والعمق بالسنتيمتر شامل العجل.",
            en: "\"20 inch\" is a size name more than a measurement. Some brands measure the body without wheels and handle, so a case sold as 24 inches can be 26–27 inches overall. Airlines measure the whole bag, so the number that matters is height, width and depth in centimetres including wheels.",
          },
        },
        {
          kind: "callout",
          text: {
            ar: "شنط الكابينة 20 بوصة عندنا: ميلانو 55 × 38 × 22 سم، وCalvin Klein ‏55 × 36 × 22 سم.",
            en: "Our 20-inch cabin cases: Milano 55 × 38 × 22 cm, Calvin Klein 55 × 36 × 22 cm.",
          },
        },
        {
          kind: "cta",
          href: "/guides/cabin-bag-size-by-airline",
          label: { ar: "تدخل كابينة أنهي شركة طيران؟", en: "Which airlines' cabins do they fit?" },
        },
      ],
    },
    {
      id: "by-trip",
      title: { ar: "اختار حسب رحلتك", en: "Choose by trip" },
      blocks: [
        {
          kind: "list",
          items: [
            {
              ar: "سفرية شغل أو ويك إند (1–3 أيام): شنطة كابينة 20 بوصة تكفي، ومن غير ما تستنى الشنط.",
              en: "Business trip or weekend (1–3 days): a 20-inch cabin case is enough, with no waiting at the carousel.",
            },
            {
              ar: "أسبوع: 24 بوصة، أو 26 لو بتاخد شوز وهدوم شتوي.",
              en: "A week: 24 inches, or 26 if you're packing shoes and winter clothes.",
            },
            {
              ar: "أسبوع لأسبوعين: 28 بوصة.",
              en: "One to two weeks: 28 inches.",
            },
            {
              ar: "أكتر من أسبوعين أو سفر للشغل برا: 30 بوصة، أو شنطتين بدل واحدة كبيرة عشان الوزن يتوزع.",
              en: "More than two weeks or moving abroad for work: 30 inches, or two cases instead of one big one so the weight is split.",
            },
            {
              ar: "العيلة: طقم 3 قطع (20 + 24 + 28) بيغطي الكابينة والشحن، والشنط بتدخل جوه بعض في التخزين.",
              en: "Families: a 3-piece set (20 + 24 + 28) covers cabin and hold, and the cases nest inside each other for storage.",
            },
          ],
        },
        { kind: "cta", href: "/catalog/travel-sets", label: { ar: "شوف أطقم الشنط", en: "Browse luggage sets" } },
      ],
    },
    {
      id: "limits",
      title: { ar: "الشنطة الكبيرة والوزن ومجموع الأبعاد", en: "Big cases, weight and total size" },
      blocks: [
        {
          kind: "list",
          items: [
            {
              ar: "حد شائع لمجموع أبعاد الشنطة المشحونة (الطول + العرض + العمق) هو 158 سم شامل العجل — زي مصر للطيران. شنط 30 بوصة وأكبر ممكن تعدّي الرقم ده وتتحسب «مقاس زيادة» برسوم.",
              en: "A common cap on a checked bag's total size (length + width + depth) is 158 cm including wheels — EgyptAir uses it, for example. Cases of 30 inches and up can exceed that and be charged as oversize.",
            },
            {
              ar: "حد الوزن المجاني في تذاكر كتير 23 كيلو للشنطة. كل ما الشنطة تكبر، كل ما توصل للحد ده أسرع — وزّنها في البيت.",
              en: "Many fares allow 23 kg per bag for free. The bigger the case, the faster you reach it — weigh it at home.",
            },
            {
              ar: "أقصى وزن لأي شنطة مشحونة غالبًا 32 كيلو، ومش بيتقبل أكتر من كده حتى لو هتدفع.",
              en: "The maximum for any checked bag is usually 32 kg, and heavier bags generally aren't accepted even for a fee.",
            },
          ],
        },
      ],
    },
  ],
  faq: [
    {
      q: { ar: "شنطة 28 بوصة تشيل كام؟", en: "How much does a 28-inch suitcase hold?" },
      a: {
        ar: "حوالي 75 لـ 110 لتر حسب العمق والماركة، وتكفي سفر من أسبوع لأسبوعين. طولها برا تقريبًا 71–79 سم شامل العجل.",
        en: "About 75–110 litres depending on depth and brand — enough for one to two weeks. It's roughly 71–79 cm tall including wheels.",
      },
    },
    {
      q: { ar: "أنهي مقاس شنطة مناسب لأسبوع؟", en: "What size suitcase do I need for a week?" },
      a: {
        ar: "24 بوصة (60–80 لتر) لأغلب الناس، أو 26 بوصة لو بتاخد شوز كتير أو هدوم شتوي.",
        en: "24 inches (60–80 L) for most people, or 26 inches if you pack lots of shoes or winter clothes.",
      },
    },
    {
      q: { ar: "شنطة 24 بوصة تدخل الكابينة؟", en: "Can a 24-inch suitcase go in the cabin?" },
      a: {
        ar: "لأ. طولها حوالي 61–70 سم، وحد الكابينة في الشركات اللي راجعناها من 51 لـ 56 سم. شنطة الكابينة هي الـ 20 بوصة.",
        en: "No. It's about 61–70 cm tall, while the cabin limits we checked run from 51 to 56 cm. The cabin size is 20 inches.",
      },
    },
    {
      q: { ar: "شنطة 20 بوصة كام سنتيمتر؟", en: "How many centimetres is a 20-inch suitcase?" },
      a: {
        ar: "20 بوصة = 51 سم حسابيًا، لكن شنط الـ 20 بوصة بتكون عادةً 55–56 سم شاملة العجل. ميلانو 20 عندنا 55 × 38 × 22 سم.",
        en: "20 inches is 51 cm on paper, but 20-inch cases usually measure 55–56 cm including wheels. Our Milano 20 is 55 × 38 × 22 cm.",
      },
    },
    {
      q: { ar: "الفرق بين شنطة 26 و28 بوصة إيه؟", en: "What's the difference between a 26 and a 28-inch suitcase?" },
      a: {
        ar: "الـ 28 أطول بحوالي 5–7 سم وبتشيل حوالي 15–30 لتر زيادة. الـ 26 تكفي أسبوع لأسبوعين، والـ 28 أريح للأسبوعين أو لما تاخد هدايا.",
        en: "The 28 is about 5–7 cm taller and holds roughly 15–30 litres more. A 26 covers one to two weeks; a 28 is more comfortable for two weeks or when you bring gifts back.",
      },
    },
  ],
  sources: [
    { label: "Delsey — What size is a small suitcase?", url: "https://us.delsey.com/blogs/travel-guide-and-blog/what-size-is-a-small-suitcase" },
    { label: "Delsey — What size is a medium suitcase?", url: "https://us.delsey.com/blogs/travel-guide-and-blog/what-size-is-a-medium-suitcase" },
    { label: "Delsey — What size is a large suitcase?", url: "https://us.delsey.com/blogs/travel-guide-and-blog/what-size-is-a-large-suitcase" },
    { label: "Samsonite UK — Medium suitcases", url: "https://www.samsonite.co.uk/luggage/medium-suitcases/" },
    { label: "Samsonite UK — Large suitcases", url: "https://www.samsonite.co.uk/luggage/large-suitcases/" },
    { label: "Samsonite Australia — Medium suitcases", url: "https://www.samsonite.com.au/suitcases/medium/" },
    { label: "American Tourister UK — Luggage for long getaways", url: "https://www.americantourister.co.uk/luggage-for-long-getaways/" },
    { label: "IATA — Passenger baggage rules", url: "https://www.iata.org/en/programs/ops-infra/baggage/passenger-baggage-rules/" },
  ],
  related: [
    { href: "/guides/cabin-bag-size-by-airline", label: { ar: "مقاس ووزن شنطة الكابينة", en: "Cabin bag size and weight" } },
    { href: "/guides/hard-vs-soft-luggage", label: { ar: "شنطة هارد ولا سوفت؟", en: "Hard-shell or soft luggage?" } },
    { href: "/guides/luggage-materials", label: { ar: "الفرق بين خامات شنط السفر", en: "Suitcase materials compared" } },
  ],
};
