export type DatasetCatalogItem = {
  key: string;
  title: string;
  description: string;
  size: string;
  updated: string;
  type: "PUBLIC" | "PREMIUM";
  icon: "code" | "message" | "chart" | "trend" | "patent" | "stream";
  colorClass: string;
};

export const DATASET_CATALOG: DatasetCatalogItem[] = [
  {
    key: "github-repositories",
    title: "GitHub Repositories",
    description:
      "Comprehensive data on open-source projects, commit velocity, and repository activity patterns.",
    size: "1.2M records",
    updated: "2 days ago",
    type: "PUBLIC",
    icon: "code",
    colorClass: "bg-slate-900",
  },
  {
    key: "app-store-reviews",
    title: "App Store Reviews",
    description:
      "Sentiment analysis, feature requests, and pain points extracted from top app categories.",
    size: "850k records",
    updated: "Weekly",
    type: "PREMIUM",
    icon: "message",
    colorClass: "bg-[#3b82f6]",
  },
  {
    key: "developer-survey",
    title: "Developer Survey",
    description:
      "Insights from global developers about stacks, tooling preferences, and hiring trends.",
    size: "120k records",
    updated: "Annual",
    type: "PUBLIC",
    icon: "chart",
    colorClass: "bg-[#a855f7]",
  },
  {
    key: "global-market-trends",
    title: "Global Market Trends",
    description:
      "Aggregated market movement, buyer behavior shifts, and category momentum signals.",
    size: "500k records",
    updated: "Real-time",
    type: "PREMIUM",
    icon: "trend",
    colorClass: "bg-[#f59e0b]",
  },
  {
    key: "tech-patents-database",
    title: "Tech Patents Database",
    description:
      "Worldwide active and pending technology patent filings with assignee mapping.",
    size: "2.1M records",
    updated: "Monthly",
    type: "PREMIUM",
    icon: "patent",
    colorClass: "bg-[#ef4444]",
  },
  {
    key: "emerging-topics-feed",
    title: "Emerging Topics Feed",
    description:
      "Real-time keyword extraction from specialized communities and technical forums.",
    size: "10M+ events",
    updated: "Real-time",
    type: "PREMIUM",
    icon: "stream",
    colorClass: "bg-[#0ea5e9]",
  },
];
