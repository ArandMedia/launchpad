export const REPORT_CATALOG = [
  { key: "EXECUTIVE", title: "Executive overview", description: "One-page view of life, work, risks, and the next decisions that matter.", group: "Overview", icon: "◈" },
  { key: "TIME_EXECUTION", title: "Calendar & execution", description: "Scheduled time, completed work, skipped work, routines, and follow-through.", group: "Overview", icon: "◷" },
  { key: "AAR_LEARNING", title: "AAR learning", description: "What was accomplished, what was missed, recurring lessons, and what should change.", group: "Overview", icon: "↻" },
  { key: "PROJECTS", title: "Project portfolio", description: "Project health, overdue work, milestones, scheduled effort, and delivery risk.", group: "ArandMedia", icon: "▦" },
  { key: "CLIENTS", title: "Client portfolio", description: "Client activity, project load, delivery coverage, and accounts needing attention.", group: "ArandMedia", icon: "◎" },
  { key: "ARANDMEDIA", title: "ArandMedia operations", description: "Portfolio throughput, workload, updates, deadlines, and operating gaps.", group: "ArandMedia", icon: "▲" },
  { key: "FINANCE", title: "ArandMedia finances", description: "Recorded revenue, expenses, cash, receivables, financial metrics, and missing inputs.", group: "ArandMedia", icon: "$" },
  { key: "HEALTH", title: "Health & recovery", description: "Sleep, recovery signals, routines, outcomes, and consistency over time.", group: "Life pillars", icon: "♥" },
  { key: "WEALTH", title: "Wealth", description: "Wealth outcomes, actions, routines, measurements, momentum, and risk.", group: "Life pillars", icon: "◆" },
  { key: "RELATIONSHIPS", title: "Relationships", description: "Commitments, routines, actions, outcomes, and neglected relationship areas.", group: "Life pillars", icon: "∞" },
  { key: "SELF_PURPOSE", title: "Self & purpose", description: "Values, convictions, strengths, growth edges, priorities, and alignment.", group: "Life pillars", icon: "✦" },
  { key: "OMNIS", title: "Operation Omnis", description: "Mission coverage, connected initiatives, brands, dependencies, and time horizons.", group: "Strategy", icon: "⌘" },
  { key: "DATA_READINESS", title: "Data & connection readiness", description: "What LaunchPAD can report reliably, what is stale, and which free sources add value.", group: "Strategy", icon: "⌁" },
] as const;

export type ReportKey = (typeof REPORT_CATALOG)[number]["key"];
export const REPORT_KEYS = REPORT_CATALOG.map((report) => report.key) as ReportKey[];

export type ReportMetric = {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "good" | "warning";
};

export type ReportSection = {
  title: string;
  items: string[];
};

export type GeneratedReport = {
  key: ReportKey;
  title: string;
  description: string;
  periodLabel: string;
  generatedAt: string;
  summary: string;
  metrics: ReportMetric[];
  sections: ReportSection[];
  sources: string[];
  gaps: string[];
  recommendations: string[];
};

export function reportDefinition(key: ReportKey) {
  return REPORT_CATALOG.find((report) => report.key === key)!;
}
