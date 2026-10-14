import type { Guide } from "./types";

export const materials: Guide = {
  slug: "luggage-materials",
  published: "2026-10-14",
  updated: "2026-10-14",
  title: {
    ar: "بولي كربونيت ولا ABS ولا بولي بروبلين؟ خامات شنط السفر",
    en: "Polycarbonate vs ABS vs polypropylene: suitcase materials explained",
  },
  description: {
    ar: "الفرق بين خامات شنط السفر الهارد (بولي كربونيت، ABS، بولي بروبلين، ألومنيوم) والسوفت (نايلون وبوليستر): التحمّل، الوزن، والسعر.",
    en: "How hard-shell suitcase materials (polycarbonate, ABS, polypropylene, aluminium) and soft fabrics (nylon, polyester) compare on toughness, weight and price.",
  },
  summary: {
    ar: "البولي كربونيت بينثني مع الخبطة ويرجع لشكله، وده أحسن توازن بين التحمّل والوزن. الـ ABS أرخص وأنشف لكنه ممكن يشرخ مع خبطة قوية. البولي بروبلين خفيف جدًا ومرن. لو هتشحن الشنطة كتير، اختار بولي كربونيت أو بولي بروبلين.",
    en: "Polycarbonate flexes under a knock and springs back — the best balance of toughness and weight. ABS is cheaper and stiffer but can crack under a hard blow. Polypropylene is very light and flexible. If you check bags in often, choose polycarbonate or polypropylene.",
  },
  sections: [
    {
      id: "comparison",
      title: { ar: "الخامات الهارد في جدول", en: "Hard-shell materials side by side" },
      blocks: [
        {
          kind: "table",
          caption: { ar: "مقارنة خامات الشنط الهارد", en: "Hard-shell materials compared" },
          head: [
            { ar: "الخامة", en: "Material" },
            { ar: "مع الخبطة", en: "Under impact" },
            { ar: "الوزن", en: "Weight" },
            { ar: "السعر", en: "Price" },
            { ar: "تنفع لـ", en: "Best for" },
          ],
          rows: [
            [
              { ar: "بولي كربونيت (PC)", en: "Polycarbonate (PC)" },
              { ar: "بينثني ويرجع لشكله", en: "Flexes and springs back" },
              { ar: "خفيف", en: "Light" },
              { ar: "متوسط لعالي", en: "Mid to high" },
              { ar: "الشحن المتكرر والسفر الطويل", en: "Frequent checked travel, long trips" },
            ],
            [
              "ABS",
              { ar: "ناشف — ممكن يشرخ مع خبطة قوية", en: "Stiff — can crack under a hard blow" },
              { ar: "خفيف", en: "Light" },
              { ar: "اقتصادي", en: "Budget" },
              { ar: "السفر من وقت للتاني", en: "Occasional trips" },
            ],
            [
              { ar: "خليط PC + ABS", en: "PC + ABS blend" },
              { ar: "بين الاتنين", en: "In between" },
              { ar: "خفيف", en: "Light" },
              { ar: "متوسط", en: "Mid" },
              { ar: "حل وسط في السعر", en: "A middle-price compromise" },
            ],
            [
              { ar: "بولي بروبلين (PP)", en: "Polypropylene (PP)" },
              { ar: "مرن جدًا ومقاوم للخبط", en: "Very flexible and impact-resistant" },
              { ar: "خفيف جدًا", en: "Very light" },
              { ar: "متوسط لعالي", en: "Mid to high" },
              { ar: "اللي بيدوّر على أخف وزن", en: "Travellers chasing the lowest weight" },
            ],
            [
              { ar: "ألومنيوم", en: "Aluminium" },
              { ar: "قوي جدًا لكنه بيتبعج", en: "Very strong but dents" },
              { ar: "تقيل", en: "Heavy" },
              { ar: "عالي", en: "High" },
              { ar: "اللي عايز أقصى حماية", en: "Maximum protection" },
            ],
          ],
          note: {
            ar: "الوزن الفعلي بيختلف حسب سُمك الجسم والعجل والإيد — قارن الوزن المكتوب على كل منتج.",
            en: "Real weight depends on shell thickness, wheels and handle — compare the weight listed on each product.",
          },
        },
      ],
    },
    {
      id: "polycarbonate",
      title: { ar: "البولي كربونيت (PC)", en: "Polycarbonate (PC)" },
      blocks: [
        {
          kind: "p",
          text: {
            ar: "نفس عيلة الخامة اللي بتتعمل منها الخوذ ونضارات الأمان. الجسم بيمتص الخبطة بإنه ينثني ويرجع، فبيستحمل رمي الشنط في المطار. عيبه إن السطح اللامع بيبان عليه الخدش، فلو هتسافر كتير اختار سطح محبّب أو مضلّع.",
            en: "The same family of plastic used for helmets and safety glasses. The shell absorbs a knock by flexing and returning, so it copes with airport baggage handling. The catch: glossy finishes show scratches, so if you fly often pick a textured or ribbed finish.",
          },
        },
        {
          kind: "callout",
          text: {
            ar: "مجموعة ميلانو ومجموعة Calvin Klein عندنا جسمها بولي كربونيت.",
            en: "Our Milano series and Calvin Klein collection have polycarbonate shells.",
          },
        },
        { kind: "cta", href: "/catalog/milano-series", label: { ar: "شوف مجموعة ميلانو", en: "See the Milano series" } },
      ],
    },
    {
      id: "abs",
      title: { ar: "الـ ABS", en: "ABS" },
      blocks: [
        {
          kind: "p",
          text: {
            ar: "بلاستيك ناشف وخفيف وأرخص في التصنيع، علشان كده موجود في أغلب الشنط الاقتصادية. مناسب لو بتسافر مرة أو مرتين في السنة. لأنه مش بينثني، الخبطة القوية — خصوصًا في البرد — ممكن تعمل فيه شرخ.",
            en: "A stiff, light plastic that's cheaper to make, which is why it's in most budget suitcases. Fine if you fly once or twice a year. Because it doesn't flex, a hard knock — especially in the cold — can crack it.",
          },
        },
      ],
    },
    {
      id: "polypropylene",
      title: { ar: "البولي بروبلين (PP)", en: "Polypropylene (PP)" },
      blocks: [
        {
          kind: "p",
          text: {
            ar: "من أخف الخامات الهارد وأكترها مرونة، وبيستحمل الخبط كويس. الشنط اللي بتتعمل منه غالبًا بتكون مصبوبة قطعة واحدة، وده بيخلي سعرها أعلى من ABS.",
            en: "One of the lightest and most flexible hard-shell materials, and it takes knocks well. Cases made from it are usually moulded in one piece, which puts them above ABS in price.",
          },
        },
      ],
    },
    {
      id: "soft-fabrics",
      title: { ar: "خامات الشنط السوفت: نايلون وبوليستر", en: "Soft fabrics: nylon and polyester" },
      blocks: [
        {
          kind: "list",
          items: [
            {
              ar: "النايلون الـ Ballistic: أقوى قماش في الشنط السوفت، بيستحمل القطع والاحتكاك.",
              en: "Ballistic nylon: the toughest soft-luggage fabric; resists cuts and abrasion.",
            },
            {
              ar: "الـ Ripstop: نسيج فيه مربعات مقوّاة بتمنع القطع إنه يكبر.",
              en: "Ripstop: a weave with reinforced squares that stop a tear from spreading.",
            },
            {
              ar: "البوليستر: أخف وأرخص، ومناسب لشنط الضهر والشنط اليومية.",
              en: "Polyester: lighter and cheaper; good for backpacks and everyday bags.",
            },
            {
              ar: "رقم الـ Denier (زي 600D أو 1680D) بيقيس تخانة الخيط — كل ما الرقم يزيد، القماش يبقى أتقل وأقوى.",
              en: "The denier number (e.g. 600D or 1680D) measures yarn thickness — the higher it is, the heavier and tougher the fabric.",
            },
          ],
        },
      ],
    },
    {
      id: "in-store-check",
      title: { ar: "إزاي تعرف الخامة وانت في المحل", en: "How to check the material in a shop" },
      blocks: [
        {
          kind: "list",
          items: [
            {
              ar: "اضغط على نص الجسم بصباعك: البولي كربونيت والبولي بروبلين بيدخلوا ويرجعوا، الـ ABS ناشف ومش بيتحرك.",
              en: "Press the middle of the shell: polycarbonate and polypropylene give and spring back; ABS stays rigid.",
            },
            {
              ar: "دوّر على التيكت أو الكتابة جوه البطانة: الخامة الحقيقية بتكون مكتوبة (PC أو ABS أو PP).",
              en: "Look for the label or the print inside the lining: the real material is usually stated (PC, ABS or PP).",
            },
            {
              ar: "«100% بولي كربونيت» غير «بولي كربونيت مع ABS» — الخليط أرخص وأقل مرونة.",
              en: "\"100% polycarbonate\" is not the same as \"polycarbonate/ABS\" — the blend is cheaper and less flexible.",
            },
          ],
        },
      ],
    },
  ],
  faq: [
    {
      q: { ar: "أنهي أحسن، بولي كربونيت ولا ABS؟", en: "Which is better, polycarbonate or ABS?" },
      a: {
        ar: "البولي كربونيت أحسن للسفر المتكرر لأنه بينثني مع الخبطة ويرجع، والـ ABS ممكن يشرخ. الـ ABS أرخص ومناسب لو بتسافر قليل.",
        en: "Polycarbonate is better for frequent travel because it flexes and springs back, while ABS can crack. ABS is cheaper and fine if you rarely fly.",
      },
    },
    {
      q: { ar: "شنطة البولي كربونيت بتتخدش؟", en: "Does a polycarbonate suitcase scratch?" },
      a: {
        ar: "أيوه، الخدوش السطحية بتبان خصوصًا على الألوان اللامعة. ده شكل بس ومش بيأثر على قوة الشنطة. السطح المحبّب أو المضلّع بيخبّي الخدوش أكتر.",
        en: "Yes, surface scuffs show, especially on glossy colours. It's cosmetic and doesn't weaken the case. Textured or ribbed finishes hide scuffs better.",
      },
    },
    {
      q: { ar: "إيه أخف خامة لشنطة السفر؟", en: "What is the lightest suitcase material?" },
      a: {
        ar: "في الهارد: البولي بروبلين ثم البولي كربونيت. في السوفت: البوليستر والنايلون الخفيف. الألومنيوم هو الأتقل.",
        en: "Among hard shells: polypropylene, then polycarbonate. Among soft cases: polyester and light nylon. Aluminium is the heaviest.",
      },
    },
  ],
  related: [
    { href: "/guides/hard-vs-soft-luggage", label: { ar: "شنطة هارد ولا سوفت؟", en: "Hard-shell or soft luggage?" } },
    { href: "/guides/luggage-size-guide", label: { ar: "دليل مقاسات شنط السفر", en: "Suitcase size guide" } },
  ],
};
