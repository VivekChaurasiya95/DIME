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

type BackendMarketData = {
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  keywords: Array<{
    word: string;
    frequency: number;
  }>;
  dataset_split: {
    uber: number;
    instagram: number;
  };
  review_trend: Array<{
    month: string;
    count: number;
  }>;
  market_pain: number;
  insight_summary?: string;
};

type MarketApiPayload = Partial<BackendMarketData> & {
  charts?: {
    sentimentBreakdown?: Array<{ name: string; value: number }>;
    userComplaintClusters?: Array<{ cluster: string; count: number }>;
    demandTrend?: Array<{ month: string; value: number }>;
  };
};

const defaultMarketData: BackendMarketData = {
  sentiment_distribution: {
    positive: 54,
    neutral: 29,
    negative: 17,
  },
  keywords: [
    { word: "login", frequency: 64 },
    { word: "performance", frequency: 52 },
    { word: "pricing", frequency: 40 },
    { word: "navigation", frequency: 34 },
  ],
  dataset_split: {
    uber: 62,
    instagram: 38,
  },
  review_trend: [
    { month: "Jan", count: 280 },
    { month: "Feb", count: 326 },
    { month: "Mar", count: 301 },
    { month: "Apr", count: 359 },
  ],
  market_pain: 0.63,
  insight_summary:
    "Users frequently report login and performance issues, indicating moderate dissatisfaction in current solutions.",
};

const rangeOptions = [
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "365", label: "Last 12 Months" },
];

const getRangeLabel = (value: string | null) =>
  rangeOptions.find((option) => option.value === value)?.label ??
  "Choose range";

const sentimentColors: Record<string, string> = {
  Positive: "#22c55e",
  Neutral: "#f59e0b",
  Negative: "#ef4444",
};

const toBackendShape = (payload: MarketApiPayload): BackendMarketData => {
  const sentimentFromLegacy = payload.charts?.sentimentBreakdown;
  const keywordsFromLegacy = payload.charts?.userComplaintClusters;
  const trendFromLegacy = payload.charts?.demandTrend;

  const positive =
    payload.sentiment_distribution?.positive ??
    sentimentFromLegacy?.find((item) => item.name.toLowerCase() === "positive")
      ?.value ??
    defaultMarketData.sentiment_distribution.positive;
  const neutral =
    payload.sentiment_distribution?.neutral ??
    sentimentFromLegacy?.find((item) => item.name.toLowerCase() === "neutral")
      ?.value ??
    defaultMarketData.sentiment_distribution.neutral;
  const negative =
    payload.sentiment_distribution?.negative ??
    sentimentFromLegacy?.find((item) => item.name.toLowerCase() === "negative")
      ?.value ??
    defaultMarketData.sentiment_distribution.negative;

  const keywords =
    payload.keywords && payload.keywords.length > 0
      ? payload.keywords
      : keywordsFromLegacy && keywordsFromLegacy.length > 0
        ? keywordsFromLegacy.map((item) => ({
            word: item.cluster,
            frequency: item.count,
          }))
        : defaultMarketData.keywords;

  const reviewTrend =
    payload.review_trend && payload.review_trend.length > 0
      ? payload.review_trend
      : trendFromLegacy && trendFromLegacy.length > 0
        ? trendFromLegacy.map((item) => ({
            month: item.month,
            count: item.value,
          }))
        : defaultMarketData.review_trend;

  const marketPainRaw = payload.market_pain ?? defaultMarketData.market_pain;
  const marketPain = marketPainRaw > 1 ? marketPainRaw / 100 : marketPainRaw;

  return {
    sentiment_distribution: {
      positive,
      neutral,
      negative,
    },
    keywords,
    dataset_split: {
      uber: payload.dataset_split?.uber ?? defaultMarketData.dataset_split.uber,
      instagram:
        payload.dataset_split?.instagram ??
        defaultMarketData.dataset_split.instagram,
    },
    review_trend: reviewTrend,
    market_pain: Math.min(1, Math.max(0, marketPain)),
    insight_summary: payload.insight_summary,
  };
};

export default function MarketInsightsPage() {
  const [rangeDays, setRangeDays] = useState("365");
  const [industry, setIndustry] = useState("all");
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([
    "all",
  ]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [marketData, setMarketData] =
    useState<BackendMarketData>(defaultMarketData);
  const [isSampledData, setIsSampledData] = useState(false);
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

      const response = await fetch(
        `/api/market-analysis/overview?${query.toString()}`,
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to load market analysis data");
      }

      const payload = (await response.json()) as MarketApiPayload & {
        availableIndustries?: string[];
      };

      setMarketData(toBackendShape(payload));
      setAvailableIndustries(payload.availableIndustries ?? ["all"]);
      setIsSampledData(
        !payload.review_trend ||
          payload.review_trend.length === 0 ||
          !payload.keywords ||
          payload.keywords.length === 0,
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load market analysis right now.",
      );
      setMarketData(defaultMarketData);
      setIsSampledData(true);
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
        value: marketData.sentiment_distribution.positive,
        color: sentimentColors.Positive,
      },
      {
        name: "Neutral",
        value: marketData.sentiment_distribution.neutral,
        color: sentimentColors.Neutral,
      },
      {
        name: "Negative",
        value: marketData.sentiment_distribution.negative,
        color: sentimentColors.Negative,
      },
    ],
    [marketData.sentiment_distribution],
  );

  const topKeywords = useMemo(
    () =>
      [...marketData.keywords]
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 8),
    [marketData.keywords],
  );

  const datasetDistributionData = useMemo(
    () => [
      {
        name: "Uber",
        value: marketData.dataset_split.uber,
        color: "#0ea5e9",
      },
      {
        name: "Instagram",
        value: marketData.dataset_split.instagram,
        color: "#f97316",
      },
    ],
    [marketData.dataset_split],
  );

  const marketPainPercent = Math.round(marketData.market_pain * 100);

  const getIndustryLabel = (value: string | null) => {
    if (!value || value === "all") {
      return "All Industries";
    }

    return value;
  };

  const summaryText = useMemo(() => {
    if (
      marketData.insight_summary &&
      marketData.insight_summary.trim().length > 0
    ) {
      return marketData.insight_summary;
    }

    const top = topKeywords
      .slice(0, 2)
      .map((item) => item.word)
      .join(" and ");
    const sentimentTilt =
      marketData.sentiment_distribution.negative >= 25
        ? "elevated dissatisfaction"
        : "moderate dissatisfaction";

    return `Users frequently report ${top || "usability and reliability"} issues, indicating ${sentimentTilt} in current solutions.`;
  }, [
    marketData.insight_summary,
    marketData.sentiment_distribution.negative,
    topKeywords,
  ]);

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="app-title">Market Analysis</h1>
          <p className="app-subtitle">
            A data-backed view of sentiment, user pain points, review activity,
            and market pain.
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
              User Sentiment Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              {chartsReady ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <PieChart>
                    <Pie
                      data={sentimentChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={94}
                      paddingAngle={2}
                    >
                      {sentimentChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {sentimentChartData.map((item) => (
                <div
                  key={item.name}
                  className="rounded-lg bg-slate-50 p-2 text-center"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {item.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {item.value}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              Top User Pain Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              {chartsReady ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <BarChart
                    data={topKeywords}
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
                      dataKey="word"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={120}
                      tick={{ fill: "#334155", fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}`, "Frequency"]}
                    />
                    <Bar
                      dataKey="frequency"
                      fill="#ea580c"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 min-[1700px]:grid-cols-2">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              Review Activity Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSampledData && (
              <p className="mb-3 text-xs font-medium text-slate-500">
                Based on sampled review data
              </p>
            )}
            <div className="h-[280px] w-full">
              {chartsReady ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <LineChart
                    data={marketData.review_trend}
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
                      formatter={(value: number) => [`${value}`, "Reviews"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#2563eb" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              Data Source Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              {chartsReady ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <PieChart>
                    <Pie
                      data={datasetDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={80}
                    >
                      {datasetDistributionData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {datasetDistributionData.map((item) => (
                <div
                  key={item.name}
                  className="rounded-lg bg-slate-50 p-2 text-center"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.name}
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {item.value}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 min-[1700px]:grid-cols-2">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              Overall Market Pain Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="text-4xl font-bold text-slate-900">
                {marketData.market_pain.toFixed(2)}
              </p>
              <p className="text-sm font-semibold text-slate-500">
                {marketPainPercent}%
              </p>
            </div>
            <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#ea580c] transition-all"
                style={{ width: `${marketPainPercent}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Higher score indicates stronger unresolved user pain in current
              market offerings.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-lg font-bold text-slate-900">
              Insight Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-slate-700">
              {summaryText}
            </p>
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
