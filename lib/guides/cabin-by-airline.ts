import type { Bi, Cell, Guide } from "./types";
import { fitsCabin, fmtDims, type CabinLimit, type Dims } from "./cabin-fit";
import { formatGuideDate } from "./format";

/**
 * Economy cabin-bag limits, read on each airline's own baggage page on
 * `CHECKED`. Only airlines whose official page we could actually load are
 * listed — most airline sites block automated reads, and a figure we could
 * only see in a search snippet may be stale. Re-check every row before
 * changing `CHECKED`: these rules change without notice.
 */
const CHECKED = "2026-10-14";

type Airline = {
  name: Bi;
  limit: CabinLimit;
  kg: number;
  personal: Bi;
  note?: Bi;
  url: string;
};

const NONE: Bi = { ar: "مش محدد في صفحة الشركة", en: "Not stated on the airline's page" };

export const AIRLINES: ReadonlyArray<Airline> = [
  {
    name: { ar: "مصر للطيران", en: "EgyptAir" },
    limit: { dims: [55, 40, 23] },
    kg: 8,
    personal: NONE,
    note: { ar: "من بريطانيا: 58 × 45 × 25 سم.", en: "From the UK: 58 × 45 × 25 cm." },
    url: "https://www.egyptair.com/en/fly/baggage/Pages/carry-on-baggage.aspx",
  },
  {
    name: { ar: "العربية للطيران (ومنها العربية مصر)", en: "Air Arabia (incl. Air Arabia Egypt)" },
    limit: { dims: [55, 40, 20] },
    kg: 7,
    personal: { ar: "33 × 25 × 20 سم، لحد 3 كيلو", en: "33 × 25 × 20 cm, up to 3 kg" },
    url: "https://www.airarabia.com/en/hand-baggage",
  },
  {
    name: { ar: "الخطوط الكويتية", en: "Kuwait Airways" },
    limit: { dims: [56, 46, 25] },
    kg: 7,
    personal: { ar: "قطعة زيادة واحدة (شنطة يد أو شنطة شغل)", en: "One extra item (handbag or briefcase)" },
    url: "https://kuwaitairways.com/en/is/free-carry-on-baggage",
  },
  {
    name: { ar: "الملكية الأردنية", en: "Royal Jordanian" },
    limit: { dims: [51, 41, 23], maxLinear: 115 },
    kg: 7,
    personal: { ar: "40 × 35 × 20 سم، لحد 5 كيلو", en: "40 × 35 × 20 cm, up to 5 kg" },
    note: { ar: "المجموع ما يزيدش عن 115 سم شامل العجل.", en: "Total no more than 115 cm including wheels." },
    url: "https://www.rj.com/en/info-and-tips/baggage-information/carry-on-pieces",
  },
];

/** Our own cabin cases: outside dimensions including wheels and handle (owner-confirmed). */
export const OUR_CABIN_BAGS: ReadonlyArray<{ name: Bi; dims: Dims; href: string }> = [
  { name: { ar: "ميلانو 20 بوصة", en: "Milano 20\"" }, dims: [55, 38, 22], href: "/catalog/milano-series" },
  { name: { ar: "Calvin Klein 20 بوصة", en: "Calvin Klein 20\"" }, dims: [55, 36, 22], href: "/catalog/calvin-klein" },
];

const cm = (d: Dims): Cell => ({ ar: `${fmtDims(d)} سم`, en: `${fmtDims(d)} cm` });
const kg = (n: number): Cell => ({ ar: `${n} كيلو`, en: `${n} kg` });
const yes: Cell = { ar: "✓ تدخل", en: "✓ Fits" };
const no: Cell = { ar: "✗ أكبر", en: "✗ Too big" };

export const cabinByAirline: Guide = {
  slug: "cabin-bag-size-by-airline",
  published: "2026-10-26",
  updated: "2026-10-26",
  title: {
    ar: "مقاس ووزن شنطة الكابينة في الطيارة (2026)",
    en: "Cabin bag size and weight limits (2026)",
  },
  description: {
    ar: "مقاس ووزن شنطة الكابينة في الدرجة الاقتصادية على مصر للطيران والعربية للطيران والكويتية والملكية الأردنية — من مواقع الشركات الرسمية — وليه مقاس IATA مش قاعدة.",
    en: "Economy cabin-bag size and weight limits on EgyptAir, Air Arabia, Kuwait Airways and Royal Jordanian — from each airline's official site — and why the IATA size isn't a rule.",
  },
  summary: {
    ar: "مفيش مقاس كابينة واحد ينفع مع كل الشركات. مصر للطيران بتسمح بـ 55 × 40 × 23 سم ولحد 8 كيلو، والعربية للطيران 55 × 40 × 20 سم و7 كيلو، والكويتية 56 × 46 × 25 سم و7 كيلو، والملكية الأردنية 51 × 41 × 23 سم (مجموع 115 سم) و7 كيلو. المقاس شامل العجل، وراجع حجزك قبل السفر.",
    en: "No single cabin size works with every airline. EgyptAir allows 55 × 40 × 23 cm and up to 8 kg, Air Arabia 55 × 40 × 20 cm and 7 kg, Kuwait Airways 56 × 46 × 25 cm and 7 kg, and Royal Jordanian 51 × 41 × 23 cm (115 cm in total) and 7 kg. Sizes include wheels — check your booking before you fly.",
  },
  sections: [
    {
      id: "by-airline",
      title: { ar: "الجدول: شنطة الكابينة لكل شركة", en: "The table: cabin bag by airline" },
      blocks: [
        {
          kind: "table",
          caption: { ar: "شنطة الكابينة في الدرجة الاقتصادية", en: "Economy cabin bag allowance" },
          head: [
            { ar: "الشركة", en: "Airline" },
            { ar: "أقصى مقاس", en: "Max size" },
            { ar: "أقصى وزن", en: "Max weight" },
            { ar: "قطعة شخصية", en: "Personal item" },
            { ar: "ملاحظة", en: "Note" },
          ],
          rows: AIRLINES.map((a) => [a.name, cm(a.limit.dims), kg(a.kg), a.personal, a.note ?? "—"]),
          note: {
            ar: `اتراجع من صفحة كل شركة الرسمية يوم ${formatGuideDate(CHECKED, "ar")}. في الجدول بس الشركات اللي قدرنا نقرا أرقامها من موقعها بنفسنا — لو شركتك مش موجودة، راجع صفحة الشنط على موقعها. القواعد بتتغير وبتختلف حسب نوع التذكرة والخط.`,
            en: `Checked on each airline's official page on ${formatGuideDate(CHECKED, "en")}. The table lists only airlines whose figures we could read on their own site — if yours isn't here, check its baggage page. Rules change and vary by fare and route.`,
          },
        },
      ],
    },
    {
      id: "our-bags",
      title: { ar: "شنط الكابينة بتاعتنا تدخل فين؟", en: "Where do our cabin bags fit?" },
      blocks: [
        {
          kind: "p",
          text: {
            ar: "قارنّا أبعاد شنط الكابينة 20 بوصة اللي بنبيعها (شاملة العجل والإيد) بحدود كل شركة. المقارنة دي محسوبة من الأرقام اللي فوق مش بالعين:",
            en: "We compared the 20-inch cabin cases we sell (measured including wheels and handle) against each airline's limit. The result is calculated from the figures above, not eyeballed:",
          },
        },
        {
          kind: "table",
          caption: { ar: "هل الشنطة تدخل الكابينة؟", en: "Does the bag fit the cabin limit?" },
          head: [
            { ar: "الشركة", en: "Airline" },
            ...OUR_CABIN_BAGS.map((b): Cell => ({ ar: `${b.name.ar} (${fmtDims(b.dims)})`, en: `${b.name.en} (${fmtDims(b.dims)})` })),
          ],
          rows: AIRLINES.map((a) => [a.name, ...OUR_CABIN_BAGS.map((b) => (fitsCabin(b.dims, a.limit) ? yes : no))]),
          note: {
            ar: "المقاس بس — الوزن 7 أو 8 كيلو شامل وزن الشنطة نفسها.",
            en: "Size only — the 7 or 8 kg limit includes the bag's own weight.",
          },
        },
        { kind: "cta", href: "/catalog/travel-bags?size=20", label: { ar: "شوف شنط الكابينة 20 بوصة", en: "Shop 20\" cabin cases" } },
      ],
    },
    {
      id: "iata",
      title: { ar: "مقاس IATA ‏56 × 45 × 25 مش قاعدة", en: "IATA's 56 × 45 × 25 is not a rule" },
      blocks: [
        {
          kind: "p",
          text: {
            ar: "هتلاقي في كل حتة إن «مقاس IATA» هو 56 × 45 × 25 سم. IATA نفسها بتقول إنه مرجع عام وبعض الشركات بتطبقه — مش قانون. من الشركات اللي في الجدول، الكويتية بس اللي بتسمح بالمقاس ده كامل؛ على مصر للطيران والعربية والملكية الأردنية شنطة بالمقاس ده أكبر من المسموح.",
            en: "You'll read everywhere that \"the IATA size\" is 56 × 45 × 25 cm. IATA itself calls it a general reference that many airlines apply — not a rule. Of the airlines in the table, only Kuwait Airways allows that full size; on EgyptAir, Air Arabia and Royal Jordanian a bag that size is over the limit.",
          },
        },
      ],
    },
    {
      id: "weight",
      title: { ar: "الوزن غالبًا أصعب من المقاس", en: "Weight is usually harder than size" },
      blocks: [
        {
          kind: "list",
          items: [
            {
              ar: "حد الـ 7 أو 8 كيلو شامل وزن الشنطة نفسها — كل كيلو في الشنطة الفاضية بيتخصم من حاجتك.",
              en: "The 7 or 8 kg limit includes the bag itself — every kilo of empty case comes out of your allowance.",
            },
            {
              ar: "وزّن الشنطة في البيت بميزان شنط قبل ما تنزل.",
              en: "Weigh the bag at home with a luggage scale before you leave.",
            },
            {
              ar: "حط الحاجات التقيلة (الشاحن، الكتب، الأحذية) في الشنطة اللي هتتشحن.",
              en: "Put heavy items (chargers, books, shoes) in the checked bag.",
            },
          ],
        },
      ],
    },
    {
      id: "checked",
      title: { ar: "والشنطة اللي هتتشحن؟", en: "And the checked bag?" },
      blocks: [
        {
          kind: "list",
          items: [
            {
              ar: "مقاس شائع لمجموع أبعاد الشنطة المشحونة (الطول + العرض + العمق) هو 158 سم شامل العجل — ده حد مصر للطيران والكويتية والملكية الأردنية.",
              en: "A common cap on a checked bag's total size (length + width + depth) is 158 cm including wheels — it's the limit on EgyptAir, Kuwait Airways and Royal Jordanian.",
            },
            {
              ar: "أقصى وزن للشنطة الواحدة غالبًا 32 كيلو، وفي تذاكر كتير الحد المجاني 23 كيلو.",
              en: "The maximum for one bag is usually 32 kg, and on many fares the free limit is 23 kg.",
            },
            {
              ar: "الوزن المسموح بيختلف حسب التذكرة والخط — وفي تذاكر اقتصادية رخيصة مفيهاش شنطة مشحونة خالص.",
              en: "The allowance depends on the fare and route — and some cheap economy fares include no checked bag at all.",
            },
          ],
        },
        {
          kind: "cta",
          href: "/guides/luggage-size-guide",
          label: { ar: "أنهي مقاس شنطة محتاج؟", en: "Which suitcase size do you need?" },
        },
      ],
    },
  ],
  faq: [
    {
      q: { ar: "إيه مقاس شنطة الكابينة في مصر للطيران؟", en: "What is EgyptAir's cabin bag size?" },
      a: {
        ar: "55 × 40 × 23 سم ووزن لحد 8 كيلو في الدرجة الاقتصادية (من بريطانيا 58 × 45 × 25 سم).",
        en: "55 × 40 × 23 cm and up to 8 kg in economy (58 × 45 × 25 cm on departures from the UK).",
      },
    },
    {
      q: { ar: "إيه مقاس شنطة الكابينة في العربية للطيران؟", en: "What is Air Arabia's cabin bag size?" },
      a: {
        ar: "55 × 40 × 20 سم ووزن 7 كيلو، ومعاها شنطة صغيرة تحت الكرسي لحد 33 × 25 × 20 سم و3 كيلو. نفس القواعد على العربية مصر.",
        en: "55 × 40 × 20 cm and 7 kg, plus a small under-seat bag of up to 33 × 25 × 20 cm and 3 kg. The same rules apply on Air Arabia Egypt.",
      },
    },
    {
      q: { ar: "شنطة 20 بوصة تدخل الكابينة؟", en: "Does a 20-inch suitcase fit in the cabin?" },
      a: {
        ar: "حسب الشركة. على مصر للطيران والكويتية شنطة 55 × 38 × 22 سم بتدخل، لكن العربية للطيران حدها 20 سم عمق، والملكية الأردنية 51 سم طول. البوصة مش مقياس ثابت — قارن الأبعاد بالسنتيمتر شامل العجل.",
        en: "It depends on the airline. A 55 × 38 × 22 cm case fits on EgyptAir and Kuwait Airways, but Air Arabia caps depth at 20 cm and Royal Jordanian caps length at 51 cm. Inches aren't a fixed standard — compare the centimetre size including wheels.",
      },
    },
    {
      q: { ar: "وزن شنطة الكابينة كام كيلو؟", en: "How heavy can a cabin bag be?" },
      a: {
        ar: "8 كيلو على مصر للطيران، و7 كيلو على العربية للطيران والكويتية والملكية الأردنية — شامل وزن الشنطة نفسها.",
        en: "8 kg on EgyptAir and 7 kg on Air Arabia, Kuwait Airways and Royal Jordanian — including the bag's own weight.",
      },
    },
    {
      q: { ar: "العجل محسوب في مقاس شنطة الكابينة؟", en: "Do wheels count in the cabin bag size?" },
      a: {
        ar: "أيوه. الملكية الأردنية بتقول ده صراحة، وIATA كمان. قيس الشنطة من تحت العجل لفوق الإيد.",
        en: "Yes. Royal Jordanian says so explicitly, and so does IATA. Measure from the bottom of the wheels to the top of the handle.",
      },
    },
  ],
  sources: [
    ...AIRLINES.map((a) => ({ label: a.name.en, url: a.url })),
    { label: "IATA — Passenger baggage rules", url: "https://www.iata.org/en/programs/ops-infra/baggage/passenger-baggage-rules/" },
  ],
  related: [
    { href: "/guides/luggage-size-guide", label: { ar: "دليل مقاسات شنط السفر", en: "Suitcase size guide" } },
    { href: "/guides/hard-vs-soft-luggage", label: { ar: "شنطة هارد ولا سوفت؟", en: "Hard-shell or soft luggage?" } },
  ],
};
