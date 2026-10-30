export const SIGN_IN_HREF = "/login";
export const GET_STARTED_HREF = "/login?mode=signup";

export const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#product", label: "Product" },
] as const;

export const FEATURES = [
  {
    id: "search",
    eyebrow: "Search",
    title: "Start with the right businesses.",
    body: "Search by niche and location, then review the businesses worth contacting.",
    image: {
      src: "/images/search-page.png",
      alt: "Reachly Find Businesses search results",
      width: 1575,
      height: 842,
    },
    imageFirst: true,
  },
  {
    id: "leads",
    eyebrow: "Leads",
    title: "A place for every opportunity.",
    body: "Save promising businesses, add notes, and keep every conversation in one workspace.",
    image: {
      src: "/images/leads-page.png",
      alt: "Reachly My Leads workspace",
      width: 1885,
      height: 915,
    },
    imageFirst: false,
  },
  {
    id: "follow-ups",
    eyebrow: "Follow-ups",
    title: "Keep the next conversation in sight.",
    body: "Track who you contacted, what happened, and when to follow up again.",
    image: {
      src: "/images/overview-page.png",
      alt: "Reachly Overview with follow-ups due",
      width: 1886,
      height: 908,
    },
    imageFirst: true,
  },
  {
    id: "analytics",
    eyebrow: "Analytics",
    title: "See how your pipeline is taking shape.",
    body: "Understand which niches, locations, and statuses are actually moving.",
    image: {
      src: "/images/analytics-page.png",
      alt: "Reachly Analytics dashboard",
      width: 1880,
      height: 913,
    },
    imageFirst: false,
  },
  {
    id: "ai",
    eyebrow: "AI Assistant",
    title: "Ask questions. Get answers from your own data.",
    body: "Ask about your pipeline in plain language and get answers from your own Reachly data.",
    bullets: [
      "Search businesses by niche and location",
      "Save and organize leads",
      "Track follow-ups automatically",
    ],
    image: {
      src: "/images/Aiassist-page.png",
      alt: "Reachly AI Assistant conversation",
      width: 1902,
      height: 906,
    },
    imageFirst: true,
  },
] as const;

export const STEPS = [
  {
    n: "01",
    title: "Find businesses",
    body: "Search by niche and location.",
  },
  {
    n: "02",
    title: "Save leads",
    body: "Keep the right opportunities in one place.",
  },
  {
    n: "03",
    title: "Contact and record activity",
    body: "Reachly never sends messages for you.",
  },
  {
    n: "04",
    title: "Never miss a follow-up",
    body: "See what’s due before it slips.",
  },
] as const;

export const PRODUCT_SHOTS = [
  {
    src: "/images/overview-page.png",
    alt: "Reachly Overview",
    width: 1886,
    height: 908,
  },
  {
    src: "/images/search-page.png",
    alt: "Reachly Find Businesses",
    width: 1575,
    height: 842,
  },
  {
    src: "/images/leads-page.png",
    alt: "Reachly My Leads",
    width: 1885,
    height: 915,
  },
  {
    src: "/images/analytics-page.png",
    alt: "Reachly Analytics",
    width: 1880,
    height: 913,
  },
] as const;
