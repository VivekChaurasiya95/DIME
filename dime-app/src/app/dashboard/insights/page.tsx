"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const getRangeLabel = (value: string | null) =>
  rangeOptions.find((option) => option.value === value)?.label ?? "Choose range";

const sentimentColors: Record<string, string> = {
  Positive: "#22c55e",
  Neutral: "#f59e0b",
  Negative: "#ef4444",
};

const sourceColors = ["#0ea5e9", "#f97316", "#14b8a6", "#8b5cf6", "#ef4444"];

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

export default function MarketInsightsPage() {
  const [rangeDays, setRangeDays] = useState("365");
  const [industry, setIndustry] = useState("all");
  const [availableIndustries, setAvailableIndustries] = useState<string[]>(["all"]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketData>(defaultData);
  const [chartsReady, setChartsReady] = useState(false);

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

  const getIndustryLabel = (value: string | null) => {
    if (!value || value === "all") {
      return "All Industries";
    }

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

  return (
    <div className="app-page space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        {marketData.contextBanner}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="app-title">Market Analysis</h1>
          <p className="app-subtitle">
            Research dashboard of dataset-derived sentiment, issue clusters, feedback
            volume, and market pain signals.
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

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 min-[1700px]:grid-cols-2">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              Market Sentiment (Dataset-Based)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Based on {marketData.sentimentOverview.totalReviews.toLocaleString()} reviews
              from {selectedSourceLabel}.
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {marketData.sentimentOverview.explanation}
            </p>

            <div className="h-[250px] w-full pt-2">
              {chartsReady ? (
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
              ) : (
                <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2 md:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                <p className="font-semibold">Positive</p>
                <p>{marketData.sentimentOverview.positivePercent.toFixed(2)}%</p>
                <p className="text-xs text-slate-500">% of reviews expressing satisfaction</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                <p className="font-semibold">Negative</p>
                <p>{marketData.sentimentOverview.negativePercent.toFixed(2)}%</p>
                <p className="text-xs text-slate-500">% expressing complaints or issues</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                <p className="font-semibold">Neutral</p>
                <p>{marketData.sentimentOverview.neutralPercent.toFixed(2)}%</p>
                <p className="text-xs text-slate-500">Informational or mixed feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              Top Reported Issues (from Reviews)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-medium text-slate-500">
              Extracted via keyword clustering from user reviews.
            </p>

            {issuesForChart.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                No issue clusters detected in connected datasets.
              </div>
            ) : (
              <>
                <div className="h-[280px] w-full pt-2">
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
                        <Bar dataKey="count" fill="#ea580c" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  {topIssues.slice(0, 5).map((issue) => (
                    <div
                      key={issue.category}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <p className="font-semibold text-slate-900">{issue.category}</p>
                      <p className="text-slate-700">
                        {issue.count} mentions, {issue.primarySources.join(", ") || "Unknown source"}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 min-[1700px]:grid-cols-2">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              User Feedback Volume Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-medium text-slate-500">
              Shows how frequently users are reporting feedback and issues over time.
            </p>

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
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              Data Source Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-medium text-slate-500">
              Indicates where market signals are being extracted from.
            </p>

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
                    <div key={item.name} className="rounded-lg bg-slate-50 p-2 text-sm">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-slate-700">
                        {item.value.toFixed(2)}% ({item.reviews.toLocaleString()} reviews)
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 min-[1700px]:grid-cols-2">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              Aggregated Market Pain Signal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-medium text-slate-500">
              {marketData.marketPainSignal.explanation}
            </p>

            <div className="mt-3 flex items-end justify-between">
              <p className="text-4xl font-bold text-slate-900">{painScore.toFixed(2)}</p>
              <p className="text-sm font-semibold text-slate-500">{painPercent.toFixed(2)}%</p>
            </div>

            <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#ea580c] transition-all"
                style={{ width: `${Math.min(100, Math.max(0, painPercent))}%` }}
              />
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-700">{painLevel}</p>
            <p className="mt-2 text-xs text-slate-600">
              Scale: {marketData.marketPainSignal.scale.low} low, {marketData.marketPainSignal.scale.moderate} moderate, {marketData.marketPainSignal.scale.high} high.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">Insight Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-slate-700">{marketData.insightSummary}</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p>
                Dataset domain: <span className="font-semibold">{marketData.domainContext.datasetDomain}</span>
              </p>
              <p>
                Idea domain: <span className="font-semibold">{marketData.domainContext.ideaDomain}</span>
              </p>
              <p>
                Data window: <span className="font-semibold">{dataWindowLabel}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Refreshing market analysis data...
        </div>
      )}
    </div>
  );
}
