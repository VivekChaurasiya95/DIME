"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Filter, Loader2, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MarketApiPayload = {
  context_banner?: string;
  availableIndustries?: string[];
  sentiment_overview?: {
    total_reviews: number;
    sources: string[];
    positive_percent: number;
    neutral_percent: number;
    negative_percent: number;
    explanation: string;
  };
  top_reported_issues?: Array<{
    category: string;
    count: number;
    share_percent: number;
    primary_sources: string[];
  }>;
  review_volume_timeline?: Array<{
    month: string;
    total_reviews: number;
    negative_reviews: number;
  }>;
  source_distribution?: Array<{
    source: string;
    reviews: number;
    share_percent: number;
  }>;
  market_pain_signal?: {
    score_0_to_1: number;
    score_percent: number;
    explanation: string;
    scale: {
      low: string;
      moderate: string;
      high: string;
    };
  };
  domain_context?: {
    dataset_domain: string;
    idea_domain: string;
    is_aligned: boolean;
  };
  data_window?: {
    start_month: string | null;
    end_month: string | null;
  };
  insight_summary?: string;
};

type MarketData = {
  contextBanner: string;
  sentimentOverview: {
    totalReviews: number;
    sources: string[];
    positivePercent: number;
    neutralPercent: number;
    negativePercent: number;
    explanation: string;
  };
  topReportedIssues: Array<{
    category: string;
    count: number;
    sharePercent: number;
    primarySources: string[];
  }>;
  reviewVolumeTimeline: Array<{
    month: string;
    totalReviews: number;
    negativeReviews: number;
  }>;
  sourceDistribution: Array<{
    source: string;
    reviews: number;
    sharePercent: number;
  }>;
  marketPainSignal: {
    score: number;
    scorePercent: number;
    explanation: string;
    scale: {
      low: string;
      moderate: string;
      high: string;
    };
  };
  domainContext: {
    datasetDomain: string;
    ideaDomain: string;
    isAligned: boolean;
  };
  dataWindow: {
    startMonth: string | null;
    endMonth: string | null;
  };
  insightSummary: string;
};

type ViewMode = "overview" | "issues" | "trends";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const defaultData: MarketData = {
  contextBanner:
    "This analysis reflects trends from existing datasets and may not fully represent new or emerging idea domains.",
  sentimentOverview: {
    totalReviews: 0,
    sources: [],
    positivePercent: 0,
    neutralPercent: 0,
    negativePercent: 0,
    explanation:
      "This reflects sentiment of existing products in this domain, not your idea.",
  },
  topReportedIssues: [],
  reviewVolumeTimeline: [],
  sourceDistribution: [],
  marketPainSignal: {
    score: 0,
    scorePercent: 0,
    explanation:
      "Derived from frequency and intensity of negative user feedback.",
    scale: {
      low: "0-0.3",
      moderate: "0.3-0.7",
      high: "0.7-1",
    },
  },
  domainContext: {
    datasetDomain: "unknown",
    ideaDomain: "unknown",
    isAligned: false,
  },
  dataWindow: {
    startMonth: null,
    endMonth: null,
  },
  insightSummary: "No contextual summary is available yet.",
};

const rangeOptions = [
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "365", label: "Last 12 Months" },
];

const viewModes: { value: ViewMode; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "issues", label: "Issues" },
  { value: "trends", label: "Trends" },
];

const getRangeLabel = (value: string | null) =>
  rangeOptions.find((option) => option.value === value)?.label ?? "Choose range";

const sentimentColors: Record<string, string> = {
  Positive: "#22c55e",
  Neutral: "#f59e0b",
  Negative: "#ef4444",
};

const sourceColors = ["#0ea5e9", "#f97316", "#14b8a6", "#8b5cf6", "#ef4444"];

// ---------------------------------------------------------------------------
// Helpers (no backend dependency)
// ---------------------------------------------------------------------------

const toMarketData = (payload: MarketApiPayload): MarketData => {
  const sentiment = payload.sentiment_overview;
  const painSignal = payload.market_pain_signal;

  return {
    contextBanner: payload.context_banner ?? defaultData.contextBanner,
    sentimentOverview: {
      totalReviews: sentiment?.total_reviews ?? 0,
      sources: sentiment?.sources ?? [],
      positivePercent: sentiment?.positive_percent ?? 0,
      neutralPercent: sentiment?.neutral_percent ?? 0,
      negativePercent: sentiment?.negative_percent ?? 0,
      explanation: sentiment?.explanation ?? defaultData.sentimentOverview.explanation,
    },
    topReportedIssues: (payload.top_reported_issues ?? []).map((issue) => ({
      category: issue.category,
      count: issue.count,
      sharePercent: issue.share_percent,
      primarySources: issue.primary_sources,
    })),
    reviewVolumeTimeline: (payload.review_volume_timeline ?? []).map((point) => ({
      month: point.month,
      totalReviews: point.total_reviews,
      negativeReviews: point.negative_reviews,
    })),
    sourceDistribution: (payload.source_distribution ?? []).map((source) => ({
      source: source.source,
      reviews: source.reviews,
      sharePercent: source.share_percent,
    })),
    marketPainSignal: {
      score: painSignal?.score_0_to_1 ?? 0,
      scorePercent: painSignal?.score_percent ?? 0,
      explanation: painSignal?.explanation ?? defaultData.marketPainSignal.explanation,
      scale: painSignal?.scale ?? defaultData.marketPainSignal.scale,
    },
    domainContext: {
      datasetDomain: payload.domain_context?.dataset_domain ?? "unknown",
      ideaDomain: payload.domain_context?.idea_domain ?? "unknown",
      isAligned: payload.domain_context?.is_aligned ?? false,
    },
    dataWindow: {
      startMonth: payload.data_window?.start_month ?? null,
      endMonth: payload.data_window?.end_month ?? null,
    },
    insightSummary: payload.insight_summary ?? defaultData.insightSummary,
  };
};

const formatMonth = (monthKey: string) => {
  const parts = monthKey.split("-");
  if (parts.length !== 2) {
    return monthKey;
  }

  const parsed = new Date(`${parts[0]}-${parts[1]}-01T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return monthKey;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
};

// ---------------------------------------------------------------------------
// Insight generators — derive summaries purely from existing API data
// ---------------------------------------------------------------------------

const getIssueIntensityTag = (rank: number) => {
  if (rank === 0) return { emoji: "🔥", label: "High Frequency", cls: "text-red-600 bg-red-50 border-red-200" };
  if (rank <= 2) return { emoji: "⚠️", label: "Moderate", cls: "text-amber-600 bg-amber-50 border-amber-200" };
  return { emoji: "ℹ️", label: "Low", cls: "text-blue-600 bg-blue-50 border-blue-200" };
};

const generateTopIssueInsight = (
  issues: MarketData["topReportedIssues"],
): string | null => {
  if (issues.length === 0) return null;
  const sorted = [...issues].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  const second = sorted[1];
  if (second) {
    return `🚨 ${top.category} dominates user complaints with ${top.sharePercent.toFixed(1)}% share, followed by ${second.category}.`;
  }
  return `🚨 ${top.category} accounts for ${top.sharePercent.toFixed(1)}% of all reported issues.`;
};

const generateTimelineInsight = (
  timeline: MarketData["reviewVolumeTimeline"],
): string | null => {
  if (timeline.length === 0) return null;
  const peak = [...timeline].sort((a, b) => b.negativeReviews - a.negativeReviews)[0];
  if (!peak || peak.negativeReviews === 0) return null;
  return `📈 Negative feedback peaked in ${formatMonth(peak.month)}, indicating increased user friction during this period.`;
};

const generateSourceInsight = (
  sources: MarketData["sourceDistribution"],
): string | null => {
  if (sources.length === 0) return null;
  const top = [...sources].sort((a, b) => b.reviews - a.reviews)[0];
  if (!top) return null;
  return `📊 ${top.source} contributes the highest volume of feedback (${top.sharePercent.toFixed(1)}%), indicating dataset skew toward this platform.`;
};

const generatePainInterpretation = (score: number): string => {
  if (score < 0.3) {
    return "Low market pain suggests fewer urgent complaints, indicating optimization opportunities rather than disruption.";
  }
  if (score < 0.7) {
    return "Moderate market pain signals recurring friction — a viable space for targeted improvements or competitive entry.";
  }
  return "High market pain reveals deep, unresolved user frustration — strong disruption opportunity if addressed effectively.";
};

const generateEnhancedSummary = (data: MarketData): string => {
  const issues = [...data.topReportedIssues].sort((a, b) => b.count - a.count);
  const topCategories = issues.slice(0, 2).map((i) => i.category);
  const negPct = data.sentimentOverview.negativePercent;
  const painScore = data.marketPainSignal.score;
  const painLabel = painScore < 0.3 ? "low" : painScore < 0.7 ? "moderate" : "high";

  const interpretation =
    painScore < 0.3
      ? "room for incremental innovation rather than fundamental disruption"
      : painScore < 0.7
        ? "targeted improvements could capture meaningful market share"
        : "a significant disruption opportunity exists if core friction points are addressed";

  if (topCategories.length === 0) {
    return `Current data shows ${negPct.toFixed(1)}% negative sentiment with ${painLabel} market pain. ${interpretation.charAt(0).toUpperCase() + interpretation.slice(1)}.`;
  }

  return `User feedback indicates recurring friction in ${topCategories.join(" and ")}, with ${negPct.toFixed(1)}% negative sentiment overall. However, ${painLabel} market pain suggests ${interpretation}.`;
};

// ---------------------------------------------------------------------------
// Context-aware interpretation layer
// ---------------------------------------------------------------------------

type IndustryContext = {
  issueTitle: string;
  sentimentTitle: string;
  timelineTitle: string;
  sourceTitle: string;
  issueNarrative: string;
  sentimentNarrative: string;
  timelineNarrative: string;
  sourceNarrative: string;
};

const getIndustryContext = (industry: string): IndustryContext => {
  const lower = industry.toLowerCase();

  if (lower.includes("ai") || lower.includes("ml") || lower.includes("artificial")) {
    return {
      issueTitle: "User Experience Bottlenecks in AI-driven Products",
      sentimentTitle: "Sentiment Landscape for AI/ML Solutions",
      timelineTitle: "AI Product Feedback Trajectory",
      sourceTitle: "Signal Sources Across AI Platforms",
      issueNarrative: "AI products face unique friction around accuracy, explainability, and trust — issues that compound when left unresolved.",
      sentimentNarrative: "User sentiment in AI reflects both hype-driven expectations and real usability gaps.",
      timelineNarrative: "Feedback spikes in AI often correlate with model updates or shifts in user expectations.",
      sourceNarrative: "AI feedback tends to concentrate on specialized platforms, creating potential signal bias.",
    };
  }

  if (lower.includes("mobile") || lower.includes("app")) {
    return {
      issueTitle: "Key Operational Pain Points in Mobile Apps",
      sentimentTitle: "User Sentiment Across Mobile Experiences",
      timelineTitle: "Mobile App Feedback Trends Over Time",
      sourceTitle: "Feedback Sources for Mobile Platforms",
      issueNarrative: "Mobile users are quick to report friction — performance, crashes, and UX inconsistencies are the most common drivers.",
      sentimentNarrative: "App store sentiment captures real-time user mood and is heavily influenced by recent update quality.",
      timelineNarrative: "Mobile feedback often spikes around OS updates, seasonal usage changes, or major app releases.",
      sourceNarrative: "App store reviews and social channels dominate mobile feedback, each with distinct bias patterns.",
    };
  }

  if (lower.includes("fintech") || lower.includes("finance") || lower.includes("banking")) {
    return {
      issueTitle: "Critical Friction Points in Financial Services",
      sentimentTitle: "Trust & Satisfaction in Fintech Products",
      timelineTitle: "Financial Product Complaint Trajectory",
      sourceTitle: "Feedback Channels for Financial Products",
      issueNarrative: "Financial products carry high trust expectations — security concerns and transaction failures escalate faster than in other domains.",
      sentimentNarrative: "Fintech sentiment is disproportionately shaped by security incidents and regulatory changes.",
      timelineNarrative: "Complaint volumes in fintech often spike around regulatory deadlines or market volatility.",
      sourceNarrative: "Financial feedback spans app reviews, regulatory portals, and social media — each with different severity profiles.",
    };
  }

  if (lower.includes("health") || lower.includes("medical") || lower.includes("wellness")) {
    return {
      issueTitle: "Patient & User Experience Gaps in Health Tech",
      sentimentTitle: "User Confidence in Health & Wellness Products",
      timelineTitle: "Health Product Feedback Patterns",
      sourceTitle: "Signal Sources Across Health Platforms",
      issueNarrative: "Health tech issues carry higher stakes — data accuracy and accessibility concerns demand faster resolution cycles.",
      sentimentNarrative: "Health product sentiment is shaped by trust, privacy expectations, and outcome alignment.",
      timelineNarrative: "Health tech feedback can be seasonal, with spikes around enrollment periods or public health events.",
      sourceNarrative: "Health feedback spans clinical platforms, app stores, and forums — representing diverse user segments.",
    };
  }

  if (lower.includes("ecommerce") || lower.includes("retail") || lower.includes("shopping")) {
    return {
      issueTitle: "Customer Experience Bottlenecks in E-Commerce",
      sentimentTitle: "Shopper Satisfaction Across Retail Platforms",
      timelineTitle: "Retail Feedback Volume & Seasonal Patterns",
      sourceTitle: "Feedback Channels for E-Commerce",
      issueNarrative: "E-commerce friction centers on delivery reliability, returns, and listing accuracy — areas where competitors differentiate quickly.",
      sentimentNarrative: "Retail sentiment is volatile and strongly tied to fulfillment quality and seasonal promotions.",
      timelineNarrative: "E-commerce complaints predictably surge during peak shopping seasons and promotional events.",
      sourceNarrative: "Retail feedback flows through marketplace reviews and social media, with heavy volume bias toward major platforms.",
    };
  }

  if (lower.includes("saas") || lower.includes("enterprise") || lower.includes("b2b")) {
    return {
      issueTitle: "Product Friction in Enterprise & SaaS Solutions",
      sentimentTitle: "Client Satisfaction Signals in B2B Products",
      timelineTitle: "Enterprise Feedback & Adoption Trends",
      sourceTitle: "Signal Distribution Across B2B Channels",
      issueNarrative: "Enterprise users prioritize reliability and workflow integration — issues here directly impact retention and expansion revenue.",
      sentimentNarrative: "B2B sentiment tends to be more measured but carries higher per-signal business impact.",
      timelineNarrative: "Enterprise feedback patterns often align with contract renewal cycles and major feature rollouts.",
      sourceNarrative: "B2B feedback concentrates on review platforms and direct support channels, each with distinct user profiles.",
    };
  }

  if (lower.includes("transport") || lower.includes("logistics") || lower.includes("delivery") || lower.includes("ride")) {
    return {
      issueTitle: "Operational Pain Points in Transport & Logistics",
      sentimentTitle: "User Satisfaction Across Mobility Services",
      timelineTitle: "Feedback Trends in Transportation Platforms",
      sourceTitle: "Signal Sources Across Mobility Platforms",
      issueNarrative: "Transport services face real-time scrutiny — delivery delays, pricing disputes, and driver quality dominate complaint patterns.",
      sentimentNarrative: "Mobility sentiment is heavily influenced by service reliability and real-time experience quality.",
      timelineNarrative: "Transport feedback fluctuates with demand surges, weather events, and operational scaling.",
      sourceNarrative: "Mobility feedback concentrates on major platform reviews, creating signal bias toward high-volume services.",
    };
  }

  // Default / "all" / unrecognized
  return {
    issueTitle: "Top Reported Issues Across Domains",
    sentimentTitle: "Cross-Domain Sentiment Overview",
    timelineTitle: "Feedback Volume Trends Over Time",
    sourceTitle: "Data Source Distribution",
    issueNarrative: "These issues represent the most frequently reported pain points across all connected datasets.",
    sentimentNarrative: "Aggregate sentiment provides a broad view of user satisfaction across the analyzed product landscape.",
    timelineNarrative: "Feedback volume trends reveal when user friction intensifies across the analyzed time window.",
    sourceNarrative: "Understanding source distribution helps identify potential bias in the signals driving these insights.",
  };
};

const generateSentimentInsight = (
  overview: MarketData["sentimentOverview"],
): { narrative: string; healthLabel: string; healthColor: string } => {
  const { positivePercent, negativePercent } = overview;

  if (negativePercent > 40) {
    return {
      narrative: `With ${negativePercent.toFixed(1)}% negative feedback, users are expressing significant dissatisfaction — a clear signal of unresolved product or service gaps.`,
      healthLabel: "Warning Zone",
      healthColor: "#ef4444",
    };
  }

  if (negativePercent > 20) {
    return {
      narrative: `A balanced but cautionary mix — ${positivePercent.toFixed(1)}% positive signals coexist with ${negativePercent.toFixed(1)}% negative feedback, suggesting targeted improvements could shift the balance.`,
      healthLabel: "Mixed Signals",
      healthColor: "#f59e0b",
    };
  }

  return {
    narrative: `Strong positive sentiment at ${positivePercent.toFixed(1)}% suggests broad satisfaction, though the ${negativePercent.toFixed(1)}% negative tail highlights areas worth monitoring.`,
    healthLabel: "Healthy Market",
    healthColor: "#22c55e",
  };
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.008, transition: { duration: 0.2 } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MarketInsightsPage() {
  const [rangeDays, setRangeDays] = useState("365");
  const [industry, setIndustry] = useState("all");
  const [availableIndustries, setAvailableIndustries] = useState<string[]>(["all"]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketData>(defaultData);
  const [chartsReady, setChartsReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const fetchMarketData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const query = new URLSearchParams({
        range: rangeDays,
        industry,
      });

      const response = await fetch(`/api/market-analysis/overview?${query.toString()}`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to load market analysis data");
      }

      const payload = (await response.json()) as MarketApiPayload;
      setMarketData(toMarketData(payload));
      setAvailableIndustries(payload.availableIndustries ?? ["all"]);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load market analysis right now.",
      );
      setMarketData(defaultData);
      setAvailableIndustries(["all"]);
    } finally {
      setIsLoading(false);
    }
  }, [industry, rangeDays]);

  useEffect(() => {
    void fetchMarketData();
  }, [fetchMarketData]);

  // ---- Derived data (memoised) ----

  const sentimentChartData = useMemo(
    () => [
      {
        name: "Positive",
        value: marketData.sentimentOverview.positivePercent,
        color: sentimentColors.Positive,
      },
      {
        name: "Neutral",
        value: marketData.sentimentOverview.neutralPercent,
        color: sentimentColors.Neutral,
      },
      {
        name: "Negative",
        value: marketData.sentimentOverview.negativePercent,
        color: sentimentColors.Negative,
      },
    ],
    [marketData.sentimentOverview],
  );

  const sourceDistributionData = useMemo(
    () =>
      marketData.sourceDistribution.map((item, index) => ({
        name: item.source,
        value: item.sharePercent,
        reviews: item.reviews,
        color: sourceColors[index % sourceColors.length],
      })),
    [marketData.sourceDistribution],
  );

  const reviewVolumeChartData = useMemo(
    () =>
      marketData.reviewVolumeTimeline.map((point) => ({
        month: formatMonth(point.month),
        totalReviews: point.totalReviews,
        negativeReviews: point.negativeReviews,
      })),
    [marketData.reviewVolumeTimeline],
  );

  const topIssues = useMemo(
    () => [...marketData.topReportedIssues].sort((a, b) => b.count - a.count),
    [marketData.topReportedIssues],
  );

  const issuesForChart = useMemo(
    () =>
      topIssues.slice(0, 8).map((issue) => ({
        category: issue.category,
        count: issue.count,
      })),
    [topIssues],
  );

  // ---- Insight lines ----

  const topIssueInsight = useMemo(() => generateTopIssueInsight(topIssues), [topIssues]);
  const timelineInsight = useMemo(
    () => generateTimelineInsight(marketData.reviewVolumeTimeline),
    [marketData.reviewVolumeTimeline],
  );
  const sourceInsight = useMemo(
    () => generateSourceInsight(marketData.sourceDistribution),
    [marketData.sourceDistribution],
  );
  const painInterpretation = useMemo(
    () => generatePainInterpretation(marketData.marketPainSignal.score),
    [marketData.marketPainSignal.score],
  );
  const enhancedSummary = useMemo(() => generateEnhancedSummary(marketData), [marketData]);

  // ---- Context-aware layer ----

  const industryCtx = useMemo(() => getIndustryContext(industry), [industry]);

  const sentimentInsight = useMemo(
    () => generateSentimentInsight(marketData.sentimentOverview),
    [marketData.sentimentOverview],
  );

  const issueImpactData = useMemo(() => {
    const negPct = marketData.sentimentOverview.negativePercent;
    return topIssues.slice(0, 6).map((issue) => ({
      category: issue.category,
      impact: Number(((issue.sharePercent * negPct) / 100).toFixed(2)),
      sharePercent: issue.sharePercent,
    }));
  }, [topIssues, marketData.sentimentOverview.negativePercent]);

  const peakTimelinePoint = useMemo(() => {
    if (reviewVolumeChartData.length === 0) return null;
    let maxIdx = 0;
    for (let i = 1; i < reviewVolumeChartData.length; i++) {
      if (reviewVolumeChartData[i].negativeReviews > reviewVolumeChartData[maxIdx].negativeReviews) {
        maxIdx = i;
      }
    }
    const peak = reviewVolumeChartData[maxIdx];
    return peak.negativeReviews > 0 ? peak : null;
  }, [reviewVolumeChartData]);

  const summaryData = useMemo(() => {
    const sorted = [...marketData.topReportedIssues].sort((a, b) => b.count - a.count);
    const top2 = sorted.slice(0, 2);
    const negPct = marketData.sentimentOverview.negativePercent;
    const posPct = marketData.sentimentOverview.positivePercent;
    const pain = marketData.marketPainSignal.score;
    const pLabel = pain < 0.3 ? "Low" : pain < 0.7 ? "Moderate" : "High";

    let conclusion: string;
    if (pain >= 0.7 && top2.length >= 2) {
      conclusion = `This market shows strong user friction concentrated around ${top2.map((i) => i.category).join(" and ")}, indicating a significant opportunity for solutions that address these operational gaps.`;
    } else if (pain >= 0.3 && top2.length > 0) {
      conclusion = `Users show moderate friction primarily around ${top2[0].category}. The market is receptive to improvements but not yet at a critical pain threshold.`;
    } else {
      conclusion = `Overall satisfaction is high with ${posPct.toFixed(0)}% positive signals. Opportunities lie in incremental innovation rather than fundamental disruption.`;
    }

    return { top2, painLabel: pLabel, negPct, posPct, conclusion };
  }, [marketData]);

  // ---- Derived labels ----

  const selectedSourceLabel =
    marketData.sentimentOverview.sources.length > 0
      ? marketData.sentimentOverview.sources.join(", ")
      : "No dataset connected";

  const dataWindowLabel =
    marketData.dataWindow.startMonth && marketData.dataWindow.endMonth
      ? `${marketData.dataWindow.startMonth} to ${marketData.dataWindow.endMonth}`
      : "No timestamp window available";

  const painScore = marketData.marketPainSignal.score;
  const painPercent = marketData.marketPainSignal.scorePercent;
  const painLevel =
    painScore < 0.3 ? "Low pain" : painScore < 0.7 ? "Moderate pain" : "High pain";
  const painBarColor =
    painScore < 0.3 ? "#22c55e" : painScore < 0.7 ? "#f59e0b" : "#ef4444";

  const dynamicTitle =
    industry === "all"
      ? "Market Analysis — Cross-Domain Signals"
      : `Market Analysis — ${industry}`;

  const getIndustryLabel = (value: string | null) => {
    if (!value || value === "all") return "All Industries";
    return value;
  };

  const exportReport = () => {
    const content = JSON.stringify(marketData, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `market-analysis-${rangeDays}d.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // ---- View mode helpers ----

  const showSentimentAndIssues = viewMode === "overview" || viewMode === "issues";
  const showTimelineAndSources = viewMode === "overview" || viewMode === "trends";
  const showPainAndSummary = viewMode === "overview" || viewMode === "issues";

  return (
    <div className="app-page space-y-6 animate-fade-in">
      {/* Context Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        {marketData.contextBanner}
      </div>

      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="app-title">{dynamicTitle}</h1>
          <p className="app-subtitle">
            Insights derived from aggregated user feedback datasets across selected sources.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="h-10 rounded-xl border-slate-200 bg-white px-4 text-slate-700"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>

          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="h-10 w-[170px] rounded-xl border-slate-200 bg-white text-slate-700">
              <SelectValue placeholder="Choose range">
                {(value: string | null) => getRangeLabel(value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={exportReport}
            className="h-10 rounded-xl bg-[#ea580c] px-4 font-semibold text-white hover:bg-[#d04e0a]"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit shadow-sm">
        {viewModes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            suppressHydrationWarning
            onClick={() => setViewMode(mode.value)}
            className={`rounded-lg px-5 py-2 text-sm font-bold transition-all duration-200 ${
              viewMode === mode.value
                ? "bg-[#ea580c] text-white shadow-md shadow-orange-300/40"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {isFilterOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_auto] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Industry Filter
              </p>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="mt-2 h-10 rounded-lg border-slate-200 bg-slate-50 text-slate-700">
                  <SelectValue placeholder="Industry">
                    {(value: string | null) => getIndustryLabel(value)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableIndustries.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "All Industries" : item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => void fetchMarketData()}
                variant="outline"
                className="h-10 rounded-lg border-slate-200"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              <Button
                onClick={() => {
                  setIndustry("all");
                  setRangeDays("365");
                }}
                variant="outline"
                className="h-10 rounded-lg border-slate-200"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION: Sentiment + Top Issues (viewMode: overview | issues)    */}
      {/* ================================================================ */}
      <AnimatePresence mode="wait">
        {showSentimentAndIssues && (
          <motion.div
            key="sentiment-issues"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 gap-6 min-[1700px]:grid-cols-2"
          >
            {/* Sentiment Card */}
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="rounded-xl border-slate-200 shadow-sm h-full hover:border-orange-200 transition-colors duration-200">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-bold text-slate-900">
                    {industryCtx.sentimentTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Based on {marketData.sentimentOverview.totalReviews.toLocaleString()} reviews
                    from {selectedSourceLabel}.
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {industryCtx.sentimentNarrative}
                  </p>

                  {/* Sentiment health narrative */}
                  <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm font-semibold text-emerald-800">
                    {sentimentInsight.narrative}
                  </div>

                  <div className="relative h-[250px] w-full pt-2">
                    {chartsReady ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <PieChart>
                            <Pie
                              data={sentimentChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={92}
                              paddingAngle={2}
                            >
                              {sentimentChartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center health label */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: sentimentInsight.healthColor }}>
                            {sentimentInsight.healthLabel}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2 md:grid-cols-3">
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5 text-sm text-slate-700">
                      <p className="font-bold text-emerald-700">Positive</p>
                      <p className="text-lg font-bold text-emerald-600">{marketData.sentimentOverview.positivePercent.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">Reviews expressing satisfaction</p>
                    </div>
                    <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-sm text-slate-700">
                      <p className="font-bold text-red-700">Negative</p>
                      <p className="text-lg font-bold text-red-600">{marketData.sentimentOverview.negativePercent.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">Complaints or issues</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5 text-sm text-slate-700">
                      <p className="font-bold text-amber-700">Neutral</p>
                      <p className="text-lg font-bold text-amber-600">{marketData.sentimentOverview.neutralPercent.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">Mixed feedback</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Issues Card */}
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="rounded-xl border-slate-200 shadow-sm h-full hover:border-orange-200 transition-colors duration-200">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-bold text-slate-900">
                    {industryCtx.issueTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium text-slate-500">
                    {industryCtx.issueNarrative}
                  </p>

                  {/* Auto-generated insight line */}
                  {topIssueInsight && (
                    <div className="mt-2 rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2 text-sm font-semibold text-orange-800">
                      {topIssueInsight}
                    </div>
                  )}

                  {issuesForChart.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                      No issue clusters detected in connected datasets.
                    </div>
                  ) : (
                    <>
                      <div className="h-[250px] w-full pt-2">
                        {chartsReady ? (
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart
                              data={issuesForChart}
                              layout="vertical"
                              margin={{ top: 8, right: 18, left: 24, bottom: 8 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                                stroke="#eef2f7"
                              />
                              <XAxis type="number" axisLine={false} tickLine={false} />
                              <YAxis
                                dataKey="category"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                width={170}
                                tick={{ fill: "#334155", fontSize: 12, fontWeight: 600 }}
                              />
                              <Tooltip formatter={(value: number) => [`${value}`, "Frequency"]} />
                              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                                {issuesForChart.map((_, index) => (
                                  <Cell key={`issue-${index}`} fill={index === 0 ? "#dc2626" : index <= 2 ? "#ea580c" : "#fb923c"} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                        )}
                      </div>

                      {/* Issues list with intensity tags */}
                      <div className="space-y-2 pt-2">
                        {topIssues.slice(0, 5).map((issue, index) => {
                          const tag = getIssueIntensityTag(index);
                          return (
                            <div
                              key={issue.category}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm flex items-start gap-3 hover:border-orange-200 hover:bg-orange-50/30 transition-colors duration-150"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-slate-900">{issue.category}</p>
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${tag.cls}`}>
                                    {tag.emoji} {tag.label}
                                  </span>
                                </div>
                                <p className="text-slate-600 mt-0.5">
                                  {issue.count} mentions ({issue.sharePercent.toFixed(1)}%) · {issue.primarySources.join(", ") || "Unknown source"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* SECTION: Issue vs Sentiment Impact (viewMode: overview | issues)  */}
      {/* ================================================================ */}
      <AnimatePresence mode="wait">
        {showSentimentAndIssues && issueImpactData.length > 0 && (
          <motion.div
            key="issue-impact"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="rounded-xl border-slate-200 shadow-sm hover:border-orange-200 transition-colors duration-200">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Issue Distribution vs Sentiment Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium text-slate-500">
                    Shows which issues actually drive negative sentiment, not just how often they appear.
                  </p>
                  <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Higher bars indicate issues that contribute most to user dissatisfaction — prioritize these for maximum impact.
                  </div>

                  <div className="h-[260px] w-full pt-3">
                    {chartsReady ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart
                          data={issueImpactData}
                          margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                          <XAxis
                            dataKey="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            tickFormatter={(v: number) => `${v}%`}
                          />
                          <Tooltip
                            formatter={(value: number, _name: string, props: { payload?: { sharePercent?: number } }) => [
                              `${value}% negative contribution (${props.payload?.sharePercent?.toFixed(1) ?? 0}% issue share)`,
                              "Sentiment Impact",
                            ]}
                          />
                          <Bar dataKey="impact" radius={[6, 6, 0, 0]}>
                            {issueImpactData.map((entry, index) => (
                              <Cell
                                key={`impact-${index}`}
                                fill={entry.impact > 5 ? "#dc2626" : entry.impact > 2 ? "#ea580c" : "#f59e0b"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* SECTION: Timeline + Source Distribution (viewMode: overview | trends) */}
      {/* ================================================================ */}
      <AnimatePresence mode="wait">
        {showTimelineAndSources && (
          <motion.div
            key="timeline-sources"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 gap-6 min-[1700px]:grid-cols-2"
          >
            {/* Timeline Card */}
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="rounded-xl border-slate-200 shadow-sm h-full hover:border-orange-200 transition-colors duration-200">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-bold text-slate-900">
                    {industryCtx.timelineTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium text-slate-500">
                    {industryCtx.timelineNarrative}
                  </p>

                  {/* Auto-generated insight line */}
                  {timelineInsight && (
                    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm font-semibold text-blue-800">
                      {timelineInsight}
                    </div>
                  )}

                  {reviewVolumeChartData.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                      No timestamped review data available.
                    </div>
                  ) : (
                    <div className="h-[280px] w-full pt-2">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <LineChart
                            data={reviewVolumeChartData}
                            margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#eef2f7"
                            />
                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#94a3b8", fontSize: 10 }}
                            />
                            <Tooltip
                              formatter={(value: number, name: string) =>
                                name === "totalReviews"
                                  ? [`${value}`, "Total reviews"]
                                  : [`${value}`, "Negative reviews"]
                              }
                            />
                            <Line
                              type="monotone"
                              dataKey="totalReviews"
                              stroke="#2563eb"
                              strokeWidth={2.5}
                              dot={{ r: 3, fill: "#2563eb" }}
                              activeDot={{ r: 5 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="negativeReviews"
                              stroke="#ef4444"
                              strokeWidth={2.5}
                              dot={{ r: 3, fill: "#ef4444" }}
                              activeDot={{ r: 5 }}
                            />
                            {peakTimelinePoint && (
                              <ReferenceDot
                                x={peakTimelinePoint.month}
                                y={peakTimelinePoint.negativeReviews}
                                r={8}
                                fill="#ef4444"
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Source Distribution Card */}
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="rounded-xl border-slate-200 shadow-sm h-full hover:border-orange-200 transition-colors duration-200">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-bold text-slate-900">
                    {industryCtx.sourceTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium text-slate-500">
                    {industryCtx.sourceNarrative}
                  </p>

                  {/* Auto-generated insight line */}
                  {sourceInsight && (
                    <div className="mt-2 rounded-lg border border-purple-100 bg-purple-50/60 px-3 py-2 text-sm font-semibold text-purple-800">
                      {sourceInsight}
                    </div>
                  )}

                  {sourceDistributionData.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                      No dataset connected.
                    </div>
                  ) : (
                    <>
                      <div className="h-[220px] w-full pt-2">
                        {chartsReady ? (
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <PieChart>
                              <Pie
                                data={sourceDistributionData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={48}
                                outerRadius={80}
                              >
                                {sourceDistributionData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number, _name, payload) => [
                                  `${value.toFixed(2)}%`,
                                  (payload?.payload?.name as string) ?? "Source",
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-2">
                        {sourceDistributionData.map((item) => (
                          <div key={item.name} className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-sm hover:border-slate-200 transition-colors duration-150">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <p className="font-bold text-slate-900">{item.name}</p>
                            </div>
                            <p className="text-slate-600 mt-0.5 ml-[18px]">
                              {item.value.toFixed(2)}% ({item.reviews.toLocaleString()} reviews)
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* SECTION: Market Pain + Insight Summary (viewMode: overview | issues) */}
      {/* ================================================================ */}
      <AnimatePresence mode="wait">
        {showPainAndSummary && (
          <motion.div
            key="pain-summary"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 gap-6 min-[1700px]:grid-cols-2"
          >
            {/* Market Pain Card */}
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="rounded-xl border-slate-200 shadow-sm h-full hover:border-orange-200 transition-colors duration-200">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Aggregated Market Pain Signal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium text-slate-500">
                    {marketData.marketPainSignal.explanation}
                  </p>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-5xl font-black text-slate-900 tracking-tight">{painScore.toFixed(2)}</p>
                      <p className="mt-1 text-sm font-bold" style={{ color: painBarColor }}>
                        {painLevel}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-400">{painPercent.toFixed(1)}%</p>
                  </div>

                  <div className="mt-4 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: painBarColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, painPercent))}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>

                  {/* Pain interpretation */}
                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 leading-relaxed">
                    {painInterpretation}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Scale: {marketData.marketPainSignal.scale.low} low, {marketData.marketPainSignal.scale.moderate} moderate, {marketData.marketPainSignal.scale.high} high.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Enhanced Insight Summary Card */}
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="rounded-xl border-2 border-orange-100 shadow-sm h-full hover:border-orange-300 transition-colors duration-200">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-bold text-slate-900">Market Intelligence Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dominant issues */}
                  {summaryData.top2.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Dominant Issues
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {summaryData.top2.map((issue, idx) => (
                          <span
                            key={issue.category}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
                              idx === 0
                                ? "bg-red-50 border border-red-200 text-red-700"
                                : "bg-amber-50 border border-amber-200 text-amber-700"
                            }`}
                          >
                            {idx === 0 ? "🔥" : "⚠️"} {issue.category}
                            <span className="text-xs font-medium opacity-70">({issue.count})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sentiment + Pain indicators */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Sentiment Health
                      </p>
                      <p className="text-sm font-bold" style={{ color: sentimentInsight.healthColor }}>
                        {sentimentInsight.healthLabel}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {summaryData.negPct.toFixed(1)}% negative · {summaryData.posPct.toFixed(1)}% positive
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Market Pain Level
                      </p>
                      <p className="text-sm font-bold" style={{ color: painBarColor }}>
                        {summaryData.painLabel}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Score: {painScore.toFixed(2)} / 1.0
                      </p>
                    </div>
                  </div>

                  {/* Conclusion */}
                  <div className="rounded-xl border-2 border-orange-100 bg-gradient-to-br from-orange-50/40 to-white px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-1.5">
                      Conclusion
                    </p>
                    <p className="text-sm leading-relaxed font-medium text-slate-800">
                      {summaryData.conclusion}
                    </p>
                  </div>

                  {/* Domain metadata */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 space-y-1">
                    <p>
                      Dataset domain: <span className="font-semibold">{marketData.domainContext.datasetDomain}</span>
                    </p>
                    <p>
                      Idea domain: <span className="font-semibold">{marketData.domainContext.ideaDomain}</span>
                    </p>
                    <p>
                      Domain alignment:{" "}
                      <span className={`font-bold ${marketData.domainContext.isAligned ? "text-emerald-600" : "text-amber-600"}`}>
                        {marketData.domainContext.isAligned ? "✓ Aligned" : "⚠ Not aligned"}
                      </span>
                    </p>
                    <p>
                      Data window: <span className="font-semibold">{dataWindowLabel}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading indicator */}
      {isLoading && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Refreshing market analysis data...
        </div>
      )}
    </div>
  );
}
