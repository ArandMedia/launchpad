export const RESOURCE_PILLARS = ["HEALTH", "WEALTH", "RELATIONSHIPS"] as const;
export const RESOURCE_TYPES = ["LINK", "TOOL", "VIDEO", "GUIDE", "NOTE"] as const;

export type ResourcePillar = (typeof RESOURCE_PILLARS)[number];
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const PILLAR_RESOURCE_CATEGORIES: Record<ResourcePillar, string[]> = {
  HEALTH: ["Nutrition", "Movement & Fitness", "Mental Health", "Sleep & Recovery", "Medical & Prevention"],
  WEALTH: ["Budgeting & Cash Flow", "Investing", "Business & Career", "Credit & Debt", "Protection & Planning"],
  RELATIONSHIPS: ["Communication", "Partner & Family", "Friends & Community", "Repair & Boundaries", "Shared Experiences"],
};

export type PillarResource = {
  id: string;
  pillarKey: ResourcePillar;
  category: string;
  resourceType: ResourceType;
  title: string;
  description: string;
  url: string;
  favorite: boolean;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
};

export const BUILT_IN_PILLAR_RESOURCES: PillarResource[] = [
  {
    id: "builtin-health-dietary-guidelines",
    pillarKey: "HEALTH",
    category: "Nutrition",
    resourceType: "GUIDE",
    title: "Dietary Guidelines for Americans",
    description: "Federal nutrition guidance and practical resources for building healthy eating patterns.",
    url: "https://www.dietaryguidelines.gov/",
    favorite: false,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "builtin-health-move-your-way",
    pillarKey: "HEALTH",
    category: "Movement & Fitness",
    resourceType: "TOOL",
    title: "Move Your Way activity planner",
    description: "Free HHS tools, videos, and a weekly activity planner for aerobic and strength work.",
    url: "https://odphp.health.gov/moveyourway",
    favorite: false,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "builtin-health-mental-health",
    pillarKey: "HEALTH",
    category: "Mental Health",
    resourceType: "GUIDE",
    title: "Caring for your mental health",
    description: "Evidence-informed self-care guidance and signs that professional support may be helpful.",
    url: "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
    favorite: false,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "builtin-wealth-cfpb-toolkit",
    pillarKey: "WEALTH",
    category: "Budgeting & Cash Flow",
    resourceType: "TOOL",
    title: "Your Money, Your Goals toolkit",
    description: "Free CFPB worksheets for goals, cash flow, debt, credit, savings, and protecting your money.",
    url: "https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/toolkit/",
    favorite: false,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "builtin-wealth-compound-interest",
    pillarKey: "WEALTH",
    category: "Investing",
    resourceType: "TOOL",
    title: "Compound interest calculator",
    description: "Model how an initial amount, monthly contributions, time, and estimated returns may compound.",
    url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator",
    favorite: false,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "builtin-wealth-sba-learning",
    pillarKey: "WEALTH",
    category: "Business & Career",
    resourceType: "GUIDE",
    title: "SBA business learning resources",
    description: "U.S. Small Business Administration guidance for planning, launching, managing, and growing a business.",
    url: "https://www.sba.gov/business-guide",
    favorite: false,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "builtin-relationships-social-wellness",
    pillarKey: "RELATIONSHIPS",
    category: "Communication",
    resourceType: "GUIDE",
    title: "NIH social wellness checklist",
    description: "Practical prompts for honest communication, respectful disagreement, boundaries, and supportive connection.",
    url: "https://www.nih.gov/sites/default/files/2024-12/social-healthy-relationships-checklist.pdf",
    favorite: false,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "builtin-relationships-emotional-wellbeing",
    pillarKey: "RELATIONSHIPS",
    category: "Repair & Boundaries",
    resourceType: "GUIDE",
    title: "CDC emotional well-being guide",
    description: "Guidance for communicating feelings and needs, listening actively, and maintaining social connection.",
    url: "https://www.cdc.gov/emotional-well-being/improve-your-emotional-well-being/index.html",
    favorite: false,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "builtin-relationships-greater-good",
    pillarKey: "RELATIONSHIPS",
    category: "Shared Experiences",
    resourceType: "TOOL",
    title: "Greater Good in Action practices",
    description: "Free research-based exercises for connection, empathy, gratitude, communication, and repair.",
    url: "https://ggia.berkeley.edu/",
    favorite: false,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  },
];

export function isResourcePillar(value: unknown): value is ResourcePillar {
  return typeof value === "string" && RESOURCE_PILLARS.includes(value as ResourcePillar);
}

export function isResourceType(value: unknown): value is ResourceType {
  return typeof value === "string" && RESOURCE_TYPES.includes(value as ResourceType);
}

export function safeResourceUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string" || value.length > 2_000) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
