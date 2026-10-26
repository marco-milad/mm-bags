import type { Guide } from "./types";

export const hardVsSoft: Guide = {
  slug: "hard-vs-soft-luggage",
  published: "2026-10-26",
  updated: "2026-10-26",
  title: {
    ar: "شنطة سفر هارد ولا سوفت؟ الفرق وإزاي تختار",
    en: "Hard-shell vs soft luggage: the differences and how to choose",
  },
  description: {
    ar: "مقارنة عملية بين شنط السفر الهارد والسوفت: الحماية، الوزن، المساحة، المياه، والسعر — وإمتى تختار كل نوع.",
    en: "A practical comparison of hard-shell and soft luggage: protection, weight, space, water and price — and when to pick each.",
  },
  summary: {
    ar: "الشنطة الهارد بتحمي الحاجة اللي جوه من الكسر والضغط والمية أحسن، ومناسبة للشحن في بطن الطيارة. الشنطة السوفت أخف ومرنة وفيها جيوب برا، ومناسبة أكتر للكابينة والسفر السريع. لو هتشحن هدايا أو حاجات تتكسر، خد هارد.",
    en: "A hard-shell case protects what's inside from crushing, knocks and rain better, and suits checked baggage. A soft case is lighter, flexes and has outside pockets, so it suits the cabin and quick trips. If you're checking in gifts or anything fragile, go hard-shell.",
  },
  sections: [
    {
      id: "comparison",
      title: { ar: "المقارنة في جدول", en: "Side by side" },
      blocks: [
        {
          kind: "table",
          caption: { ar: "هارد مقابل سوفت", en: "Hard-shell vs soft" },
          head: [
            { ar: "النقطة", en: "Point" },
            { ar: "هارد", en: "Hard-shell" },
            { ar: "سوفت (قماش)", en: "Soft (fabric)" },
          ],
          rows: [
            [
              { ar: "حماية من الكسر والضغط", en: "Protection from crushing" },
              { ar: "أعلى — الجسم بيحافظ على شكله", en: "Higher — the shell keeps its shape" },
              { ar: "أقل — القماش بيتضغط", en: "Lower — the fabric gives way" },
            ],
            [
              { ar: "المطر والمية", en: "Rain and water" },
              { ar: "مقاومة أحسن، وبتتمسح بسهولة", en: "Better resistance, wipes clean" },
              { ar: "حسب القماش — ممكن يشرب مية ويتبقّع", en: "Depends on the fabric — can soak through and stain" },
            ],
            [
              { ar: "المساحة", en: "Space" },
              { ar: "ثابتة — مش هتعرف تحشر زيادة", en: "Fixed — you can't overstuff it" },
              { ar: "بتتمط شوية، وكتير منها فيه سوستة توسعة", en: "Gives a little; many have an expansion zip" },
            ],
            [
              { ar: "الجيوب الخارجية", en: "Outside pockets" },
              { ar: "نادرة", en: "Rare" },
              { ar: "موجودة غالبًا — مفيدة للورق واللابتوب", en: "Usually — handy for documents and a laptop" },
            ],
            [
              { ar: "طريقة الفتح", en: "How it opens" },
              { ar: "نصين (50/50) — محتاجة مكان وهي مفتوحة", en: "Two halves (50/50) — needs floor space open" },
              { ar: "غطا واحد من فوق", en: "One lid from the top" },
            ],
            [
              { ar: "الخدوش", en: "Scuffs" },
              { ar: "بتبان على السطح اللامع أكتر من المحبّب", en: "Show more on glossy shells than textured ones" },
              { ar: "مش بتبان، لكن القماش ممكن يتقطع", en: "Don't show, but fabric can tear" },
            ],
          ],
        },
      ],
    },
    {
      id: "choose-hard",
      title: { ar: "إمتى تختار هارد", en: "When to pick hard-shell" },
      blocks: [
        {
          kind: "list",
          items: [
            {
              ar: "لو الشنطة هتتشحن في بطن الطيارة وهتتشال وتترمي مع شنط كتير.",
              en: "When the bag goes in the hold and gets stacked and thrown with everyone else's.",
            },
            {
              ar: "لو شايل هدايا أو برفانات أو حاجات بتتكسر — شائع في السفر للخليج والعمرة.",
              en: "When you're carrying gifts, perfume or anything breakable — common on Gulf and Umrah trips.",
            },
            {
              ar: "لو بتحب ترتيب الشنطة: النصين بيفصلوا الهدوم عن الشوز والشنطة الصغيرة.",
              en: "When you like an organised case: the two halves keep clothes apart from shoes and toiletries.",
            },
            {
              ar: "لو مسافر في موسم مطر أو هتستنى الشنط برا.",
              en: "When you're travelling in the rainy season or your bags may wait outside.",
            },
          ],
        },
      ],
    },
    {
      id: "choose-soft",
      title: { ar: "إمتى تختار سوفت", en: "When to pick soft luggage" },
      blocks: [
        {
          kind: "list",
          items: [
            {
              ar: "لو هتسافر بشنطة كابينة بس وعايز جيب برا للابتوب والباسبور.",
              en: "When you're flying cabin-only and want an outside pocket for a laptop and passport.",
            },
            {
              ar: "لو بترجع دايمًا بحاجات أكتر من اللي رحت بيها وعايز مساحة تتمط.",
              en: "When you always come back with more than you left with and need room to stretch.",
            },
            {
              ar: "لو بتتنقل كتير بالعربية أو الأتوبيس والشنطة لازم تدخل في أماكن ضيقة.",
              en: "When you travel by car or bus a lot and the bag has to squeeze into tight spots.",
            },
          ],
        },
      ],
    },
    {
      id: "what-matters-more",
      title: { ar: "أهم من هارد ولا سوفت", en: "What matters more than hard vs soft" },
      blocks: [
        {
          kind: "p",
          text: {
            ar: "الجسم مش كل حاجة: الأجزاء اللي بتتحرك — العجل والإيد والسوستة — هي اللي بتشيل الشغل كله في السفر. وانت بتختار أي شنطة، افحص دول:",
            en: "The shell isn't everything: the moving parts — wheels, handle and zip — do all the work on a trip. Whatever you choose, check these:",
          },
        },
        {
          kind: "list",
          items: [
            {
              ar: "العجل: 4 عجلات بتلف 360 درجة أسهل في المطار من 2 عجل. جرّب تمشيها في المحل.",
              en: "Wheels: four 360° spinner wheels are easier in an airport than two. Push it around before you buy.",
            },
            {
              ar: "الإيد اللي بتطلع: افردها للآخر وهزّها — لو بتتهز جامد، هتتعب بسرعة.",
              en: "Telescopic handle: extend it fully and shake it — a lot of wobble means it will wear quickly.",
            },
            {
              ar: "السوستة: لازم تقفل بنعومة من غير ما تقف عند الزوايا.",
              en: "Zip: it should run smoothly round the corners without catching.",
            },
            {
              ar: "وزن الشنطة فاضية: كل كيلو في الشنطة نفسها كيلو أقل من حاجتك في وزن شركة الطيران.",
              en: "Empty weight: every kilo of bag is a kilo less of your things within the airline's allowance.",
            },
          ],
        },
        {
          kind: "callout",
          text: {
            ar: "كل شنط السفر عندنا عليها ضمان سنة ضد عيوب الصناعة: العجل والإيد والسوستة والجسم.",
            en: "Every suitcase we sell has a one-year warranty against manufacturing defects: wheels, handle, zip and shell.",
          },
        },
        { kind: "cta", href: "/catalog/travel-bags", label: { ar: "شوف شنط السفر", en: "Browse travel bags" } },
      ],
    },
  ],
  faq: [
    {
      q: { ar: "الشنطة الهارد بتتكسر؟", en: "Do hard-shell suitcases crack?" },
      a: {
        ar: "الشنط المصنوعة من البولي كربونيت أو البولي بروبلين بتنثني مع الخبطة وترجع لشكلها، فنادرًا ما بتتكسر. الشنط الـ ABS أنشف وممكن تشرخ مع خبطة قوية. الخامة أهم من كون الشنطة هارد.",
        en: "Polycarbonate and polypropylene shells flex under a knock and spring back, so they rarely crack. ABS is stiffer and can crack under a hard blow. The material matters more than whether the case is hard.",
      },
    },
    {
      q: { ar: "أنهي أخف، الهارد ولا السوفت؟", en: "Which is lighter, hard or soft?" },
      a: {
        ar: "السوفت غالبًا أخف في نفس المقاس، لكن الفرق بيقل مع الهارد المصنوع من بولي كربونيت أو بولي بروبلين. قارن وزن الشنطة فاضية المكتوب على المنتج.",
        en: "Soft cases are usually lighter at the same size, but the gap narrows with polycarbonate or polypropylene shells. Compare the empty weight listed on the product.",
      },
    },
    {
      q: { ar: "أنهي أحسن للعمرة أو السفر للسعودية؟", en: "Which is better for Umrah or travel to Saudi Arabia?" },
      a: {
        ar: "للشنطة اللي هتتشحن، الهارد أحسن لأنها بتحمي الهدايا والحاجات اللي بتتكسر. للكابينة، أي شنطة في حدود مقاس ووزن شركة الطيران. شوف دليل مقاسات الكابينة لكل شركة.",
        en: "For the checked bag, hard-shell is better because it protects gifts and breakables. For the cabin, any bag within your airline's size and weight limits works — see our cabin-size guide per airline.",
      },
    },
    {
      q: { ar: "إزاي أنضف الشنطة الهارد؟", en: "How do I clean a hard-shell suitcase?" },
      a: {
        ar: "قماشة مبلولة بمية وصابون خفيف، ومن غير مواد كاشطة أو كحول عشان ما تبهتش اللمعة.",
        en: "A damp cloth with water and mild soap. Avoid abrasive cleaners and alcohol, which dull the finish.",
      },
    },
  ],
  related: [
    { href: "/guides/luggage-materials", label: { ar: "الفرق بين خامات شنط السفر", en: "Suitcase materials compared" } },
    { href: "/guides/luggage-size-guide", label: { ar: "دليل مقاسات شنط السفر", en: "Suitcase size guide" } },
    { href: "/guides/cabin-bag-size-by-airline", label: { ar: "مقاس ووزن شنطة الكابينة", en: "Cabin bag size and weight" } },
  ],
};
