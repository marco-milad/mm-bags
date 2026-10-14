import type { Bi, Cell, Guide } from "./types";
import { fitsCabin, fmtDims, type CabinLimit, type Dims } from "./cabin-fit";
import { formatGuideDate } from "./format";

/**
 * Economy cabin-bag limits, from each airline's own baggage page (checked
 * 2026-10-14 — see `CHECKED`). When an airline's pages disagree we keep the
 * stricter figure and say so in `note`. Re-check every row before changing
 * `updated`: these rules change without notice.
 */
const CHECKED = "2026-10-14";

type Airline = {
  name: Bi;
  limit: CabinLimit;
  /** Stricter limit for the "does our bag fit" check when the airline's own figures disagree. */
  fitLimit?: CabinLimit;
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
    name: { ar: "الخطوط السعودية", en: "Saudia" },
    // One Saudia page says 56×45×25, another caps the sum at 115 cm: apply both.
    limit: { dims: [56, 45, 25], maxLinear: 115 },
    kg: 7,
    personal: NONE,
    note: {
      ar: "صفحة بتقول 56 × 45 × 25 وصفحة تانية بتقول مجموع الأبعاد ما يزيدش عن 115 سم — التزم بالـ 115.",
      en: "One page says 56 × 45 × 25, another caps the total at 115 cm — stay within 115.",
    },
    url: "https://www.saudia.com/pages/before-flying/baggage/hand-baggage",
  },
  {
    name: { ar: "طيران ناس", en: "flynas" },
    limit: { dims: [56, 36, 23] },
    kg: 7,
    personal: { ar: "شنطة لاب توب أو شنطة يد صغيرة تحت الكرسي", en: "A small laptop case or handbag under the seat" },
    url: "https://www.flynas.com/en/plan-my-trip/cabin-baggage",
  },
  {
    name: { ar: "طيران أديل", en: "flyadeal" },
    limit: { dims: [55, 40, 20] },
    kg: 7,
    personal: { ar: "40 × 30 × 20 سم", en: "40 × 30 × 20 cm" },
    url: "https://help.flyadeal.com/hc/en-us/articles/360010229700-Carry-On",
  },
  {
    name: { ar: "طيران الإمارات", en: "Emirates" },
    limit: { dims: [55, 38, 22] },
    // The same page gives 22 × 15 × 8 in: 8 in is ~20 cm. Judge fit on the smaller.
    fitLimit: { dims: [55, 38, 20] },
    kg: 7,
    personal: { ar: "مفيش قطعة زيادة: شنطة يد أو شنطة لاب توب ضمن القطعة", en: "No extra piece: a handbag or laptop bag counts as the one piece" },
    note: {
      ar: "نفس الصفحة بتكتب العمق 8 بوصة (حوالي 20 سم) — الأحوط 20 سم.",
      en: "The same page gives the depth as 8 in (about 20 cm) — 20 cm is the safe figure.",
    },
    url: "https://www.emirates.com/us/english/before-you-fly/baggage/cabin-baggage-rules/",
  },
  {
    name: { ar: "الخطوط القطرية", en: "Qatar Airways" },
    limit: { dims: [50, 37, 25] },
    kg: 7,
    personal: { ar: "شنطة اللاب توب محسوبة ضمن الشنطة", en: "A laptop bag counts within the allowance" },
    url: "https://www.qatarairways.com/en/baggage/allowance.html",
  },
  {
    name: { ar: "الاتحاد للطيران", en: "Etihad" },
    limit: { dims: [56, 36, 23] },
    kg: 7,
    personal: NONE,
    url: "https://www.etihad.com/content/eag/etihadairways/etihadcom/global/en/fly-etihad/baggage/cabin-bags.html",
  },
  {
    name: { ar: "العربية للطيران (ومنها العربية مصر)", en: "Air Arabia (incl. Air Arabia Egypt)" },
    limit: { dims: [55, 40, 20] },
    kg: 7,
    personal: { ar: "33 × 25 × 20 سم، لحد 3 كيلو", en: "33 × 25 × 20 cm, up to 3 kg" },
    note: { ar: "المقاس شامل العجل والإيد والجيوب.", en: "Includes wheels, handles and pockets." },
    url: "https://www.airarabia.com/en/hand-baggage",
  },
  {
    name: { ar: "النيل للطيران", en: "Nile Air" },
    limit: { dims: [56, 36, 23] },
    kg: 7,
    personal: NONE,
    url: "https://www.nileair.com/cabin-baggage",
  },
  {
    name: { ar: "إير كايرو", en: "Air Cairo" },
    limit: { dims: [55, 40, 23] },
    kg: 7,
    personal: NONE,
    note: { ar: "المقاس شامل العجل والإيد والجيوب.", en: "Includes wheels, handles and side pockets." },
    url: "https://aircairo.com/en-gl/carry-on-baggage",
  },
  {
    name: { ar: "الخطوط التركية", en: "Turkish Airlines" },
    limit: { dims: [55, 40, 23] },
    kg: 8,
    personal: { ar: "40 × 30 × 15 سم", en: "40 × 30 × 15 cm" },
    url: "https://www.turkishairlines.com/en-gb/any-questions/carry-on-baggage/",
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
  {
    name: { ar: "لوفتهانزا", en: "Lufthansa" },
    limit: { dims: [55, 40, 23] },
    kg: 8,
    personal: { ar: "40 × 30 × 15 سم", en: "40 × 30 × 15 cm" },
    note: {
      ar: "تذكرة Economy Basic على الرحلات القصيرة والمتوسطة: القطعة الشخصية بس، من غير ترولي.",
      en: "Economy Basic on short and medium-haul flights: personal item only, no trolley.",
    },
    url: "https://www.lufthansa.com/us/en/carry-on-baggage",
  },
];

/** Our own cabin cases, measured dimensions from the product data. */
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
  published: "2026-10-14",
  updated: CHECKED,
  title: {
    ar: "مقاس ووزن شنطة الكابينة لكل شركة طيران (2026)",
    en: "Cabin bag size and weight by airline (2026)",
  },
  description: {
    ar: "مقاسات ووزن شنطة الكابينة في الدرجة الاقتصادية لمصر للطيران والسعودية وطيران ناس والإمارات والقطرية والعربية وغيرهم — من مواقع الشركات الرسمية.",
    en: "Economy cabin-bag size and weight limits for EgyptAir, Saudia, flynas, Emirates, Qatar Airways, Air Arabia and more — from each airline's official site.",
  },
  summary: {
    ar: "مفيش مقاس كابينة واحد ينفع مع كل الشركات. أغلب الشركات اللي بتطير من مصر وللخليج بتسمح بحوالي 55 × 40 × 23 سم أو أقل، والوزن غالبًا 7 كيلو (مصر للطيران والتركية ولوفتهانزا 8 كيلو). القطرية أقصر (50 سم)، وناس والاتحاد والنيل أضيق (36 سم) — راجع شركتك في الجدول.",
    en: "No single cabin size works with every airline. Most carriers flying from Egypt and to the Gulf allow about 55 × 40 × 23 cm or less, usually at 7 kg (EgyptAir, Turkish and Lufthansa allow 8 kg). Qatar Airways is shorter (50 cm), and flynas, Etihad and Nile Air are narrower (36 cm) — check your airline in the table.",
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
            ar: `اتراجع من صفحة كل شركة يوم ${formatGuideDate(CHECKED, "ar")}. القواعد بتتغير وبتختلف حسب نوع التذكرة والخط — راجع حجزك قبل السفر. طيران الخليج مش في الجدول لأننا ما لقيناش رقم رسمي على موقعها.`,
            en: `Checked against each airline's page on ${formatGuideDate(CHECKED, "en")}. Rules change and vary by fare and route — check your booking before you fly. Gulf Air isn't listed because we couldn't find an official figure on its site.`,
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
            ar: "قارنّا أبعاد شنط الكابينة 20 بوصة اللي بنبيعها بحدود كل شركة. المقارنة دي محسوبة من الأرقام اللي فوق مش بالعين:",
            en: "We compared the 20-inch cabin cases we sell against each airline's limit. The result is calculated from the figures above, not eyeballed:",
          },
        },
        {
          kind: "table",
          caption: { ar: "هل الشنطة تدخل الكابينة؟", en: "Does the bag fit the cabin limit?" },
          head: [
            { ar: "الشركة", en: "Airline" },
            ...OUR_CABIN_BAGS.map((b): Cell => ({ ar: `${b.name.ar} (${fmtDims(b.dims)})`, en: `${b.name.en} (${fmtDims(b.dims)})` })),
          ],
          rows: AIRLINES.map((a) => [a.name, ...OUR_CABIN_BAGS.map((b) => (fitsCabin(b.dims, a.fitLimit ?? a.limit) ? yes : no))]),
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
            ar: "هتلاقي في كل حتة إن «مقاس IATA» هو 56 × 45 × 25 سم. IATA نفسها بتقول إنه مرجع عام وبعض الشركات بتطبقه — مش قانون. من الشركات اللي في الجدول، السعودية والكويتية بس اللي بتسمح بمقاس قريب منه، والسعودية كمان بتحط حد 115 سم للمجموع. شنطة بالمقاس ده ممكن تترفض على مصر للطيران والإمارات والقطرية.",
            en: "You'll read everywhere that \"the IATA size\" is 56 × 45 × 25 cm. IATA itself calls it a general reference that many airlines apply — not a rule. Of the airlines in the table, only Saudia and Kuwait Airways allow something close, and Saudia also caps the total at 115 cm. A bag that size can be refused on EgyptAir, Emirates or Qatar Airways.",
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
              ar: "حد الـ 7 كيلو شامل وزن الشنطة نفسها — كل كيلو في الشنطة الفاضية بيتخصم من حاجتك.",
              en: "The 7 kg limit includes the bag itself — every kilo of empty case comes out of your allowance.",
            },
            {
              ar: "وزّن الشنطة في البيت بميزان شنط قبل ما تنزل.",
              en: "Weigh the bag at home with a luggage scale before you leave.",
            },
            {
              ar: "حط الحاجات التقيلة (الشاحن، الكتب، الأحذية) في الشنطة اللي هتتشحن.",
              en: "Put heavy items (chargers, books, shoes) in the checked bag.",
            },
            {
              ar: "مشتريات السوق الحرة ممكن تتحسب ضمن الوزن على بعض الشركات زي العربية للطيران.",
              en: "Duty-free shopping can count toward the weight on some airlines, such as Air Arabia.",
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
              ar: "أغلب الشركات في الجدول بتحدد مجموع الأبعاد (الطول + العرض + العمق) بـ 158 سم شامل العجل.",
              en: "Most airlines in the table cap a checked bag at 158 cm in total (length + width + depth) including wheels.",
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
      q: { ar: "إيه مقاس شنطة الكابينة في طيران ناس؟", en: "What is flynas's cabin bag size?" },
      a: {
        ar: "56 × 36 × 23 سم ووزن 7 كيلو، ومعاها شنطة لاب توب أو شنطة يد صغيرة تحت الكرسي.",
        en: "56 × 36 × 23 cm and 7 kg, plus a small laptop case or handbag under the seat.",
      },
    },
    {
      q: { ar: "شنطة 20 بوصة تدخل الكابينة؟", en: "Does a 20-inch suitcase fit in the cabin?" },
      a: {
        ar: "غالبًا أيوه على مصر للطيران وإير كايرو والتركية ولوفتهانزا (55 × 40 × 23)، بس مش على كل الشركات: السعودية حدها 115 سم للمجموع، والقطرية 50 سم طول، وناس والاتحاد والنيل حدهم 36 سم عرض، والعربية وأديل حدهم 20 سم عمق. البوصة مش مقياس ثابت — قارن الأبعاد بالسنتيمتر شامل العجل.",
        en: "Usually yes on EgyptAir, Air Cairo, Turkish and Lufthansa (55 × 40 × 23), but not everywhere: Saudia caps the total at 115 cm; Qatar Airways caps length at 50 cm; flynas, Etihad and Nile Air cap width at 36 cm; Air Arabia and flyadeal cap depth at 20 cm. Inches aren't a fixed standard — compare the centimetre size including wheels.",
      },
    },
    {
      q: { ar: "وزن شنطة الكابينة كام كيلو؟", en: "How heavy can a cabin bag be?" },
      a: {
        ar: "7 كيلو في أغلب شركات الخليج والسعودية ومصر، و8 كيلو في مصر للطيران والتركية ولوفتهانزا — شامل وزن الشنطة نفسها.",
        en: "7 kg on most Gulf, Saudi and Egyptian carriers, and 8 kg on EgyptAir, Turkish and Lufthansa — including the bag's own weight.",
      },
    },
    {
      q: { ar: "العجل محسوب في مقاس شنطة الكابينة؟", en: "Do wheels count in the cabin bag size?" },
      a: {
        ar: "أيوه. العربية للطيران وإير كايرو والملكية الأردنية بيقولوا ده صراحة، وIATA كمان. قيس الشنطة من تحت العجل لفوق الإيد.",
        en: "Yes. Air Arabia, Air Cairo and Royal Jordanian say so explicitly, and so does IATA. Measure from the bottom of the wheels to the top of the handle.",
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
