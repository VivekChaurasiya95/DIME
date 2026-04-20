"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Tooltip, Cell } from "recharts";
import {
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Database,
  Bookmark,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DashboardOverview = {
  rangeDays: number;
  avg_novelty: number;
  avg_market_pain: number;
  avg_opportunity: number;
  total_ideas: number;
  top_keywords: string[];
  distribution: {
    high: number;
    promising: number;
    low: number;
  };
  stats: {
    ideasAnalyzed: number;
    marketOpps: number;
    datasetInsights: number;
    savedProjects: number;
  };
  opportunityMix: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    subtitle: string;
    type: "saved" | "insight" | "alert" | "analysis";
    timeAgo: string;
  }>;
  marketTrends: Array<{
    id: string;
    category: string;
    label: string;
    growth: number;
    sample: number;
    tag: string;
    color: string;
  }>;
  quickInsight: string;
};

const rangeOptions = [
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
];

const getRangeLabel = (value: string | null) =>
  rangeOptions.find((option) => option.value === value)?.label ??
  "Select range";

const mixColors = {
  high: "#ea580c",
  promising: "#8b5cf6",
  low: "#06b6d4",
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const [selectedRange, setSelectedRange] = useState("7");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await fetch(
          `/api/dashboard/overview?range=${selectedRange}`,
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to load dashboard data");
        }

        const payload = (await response.json()) as DashboardOverview;
        setOverview(payload);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load dashboard overview",
        );
        setOverview(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [selectedRange]);

  const opportunityMix = useMemo(() => {
    if (!overview) {
      return [] as Array<{ name: string; value: number; color: string }>;
    }

    return [
      {
        name: "High Potential",
        value: overview.distribution.high,
        color: mixColors.high,
      },
      {
        name: "Promising",
        value: overview.distribution.promising,
        color: mixColors.promising,
      },
      {
        name: "Needs Validation",
        value: overview.distribution.low,
        color: mixColors.low,
      },
    ];
  }, [overview]);

  const totalMix = useMemo(
    () => opportunityMix.reduce((sum, item) => sum + item.value, 0),
    [opportunityMix],
  );

  const averageNoveltyScore = overview?.avg_novelty ?? 0;
  const averageMarketPain = overview?.avg_market_pain ?? 0;
  const topProblemKeywords = overview?.top_keywords ?? [];

  const activityIcon = (
    type: DashboardOverview["recentActivity"][number]["type"],
  ) => {
    if (type === "analysis") {
      return {
        icon: FileText,
        colorClass: "bg-orange-50 text-[#ea580c]",
      };
    }

    if (type === "insight") {
      return {
        icon: Clock,
        colorClass: "bg-purple-50 text-[#8b5cf6]",
      };
    }

    if (type === "saved") {
      return {
        icon: Bookmark,
        colorClass: "bg-emerald-50 text-emerald-600",
      };
    }

    return {
      icon: AlertCircle,
      colorClass: "bg-rose-50 text-rose-600",
    };
  };

  return (
    <motion.div
      className="w-full max-w-[1400px] mx-auto flex flex-col min-[1700px]:flex-row gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Main Dashboard Content */}
      <div className="min-w-0 flex-1 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Idea Validation Overview
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Monitor novelty, market pain, and problem signals across analyzed
              ideas.
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/analyzer")}
            className="bg-[#ea580c] hover:bg-[#d04e0a] text-white font-bold h-11 px-6 rounded-lg shadow-sm shadow-orange-500/20"
          >
            + New Idea Analysis
          </Button>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="border-slate-200 shadow-sm rounded-xl h-full hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-5">
                <div className="mb-4 inline-flex rounded-lg bg-orange-50 p-2 text-[#ea580c]">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Average Novelty Score
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {isLoading ? "--" : averageNoveltyScore.toFixed(2)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Based on validated analyses in your workspace
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="border-slate-200 shadow-sm rounded-xl h-full hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-5">
                <div className="mb-4 inline-flex rounded-lg bg-amber-50 p-2 text-amber-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Average Market Pain
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {isLoading ? "--" : averageMarketPain.toFixed(2)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Estimated from dataset-backed demand signals
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="border-slate-200 shadow-sm rounded-xl h-full hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-5">
                <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-2 text-slate-700">
                  <Database className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Top Problem Keywords
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topProblemKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-orange-100 hover:text-orange-700 hover:border-orange-200 transition-colors"
                    >
                      {keyword}
                    </span>
                  ))}
                  {!isLoading && topProblemKeywords.length === 0 && (
                    <span className="text-xs font-medium text-slate-500">
                      No keywords yet
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="border-slate-200 shadow-sm rounded-xl h-full hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-5">
                <div className="mb-4 inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <Bookmark className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ideas Analyzed
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {isLoading ? "--" : (overview?.total_ideas ?? 0)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Total analyses across selected date range
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Lower Grid (Activity & Feed) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Opportunity Mix */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-slate-200 shadow-sm rounded-xl h-full hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold text-slate-900">
                  Opportunity Mix Analytics
                </CardTitle>
                <Select value={selectedRange} onValueChange={setSelectedRange}>
                  <SelectTrigger className="h-9 border-slate-200 bg-slate-50 text-sm text-slate-600">
                    <SelectValue placeholder="Select range">
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
              </CardHeader>
              <CardContent>
                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr] xl:items-center">
                  <div className="h-[280px] w-full flex items-center justify-center">
                    <PieChart width={280} height={280}>
                      <Pie
                        data={opportunityMix}
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={112}
                        dataKey="value"
                        stroke="none"
                        paddingAngle={4}
                      >
                        {opportunityMix.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          `${value} ideas`,
                          "Count",
                        ]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                    </PieChart>
                  </div>

                  <div className="space-y-3">
                    {opportunityMix.map((item) => {
                      const percentage =
                        totalMix > 0
                          ? Math.round((item.value / totalMix) * 100)
                          : 0;

                      return (
                        <div
                          key={item.name}
                          className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: item.color }}
                              ></span>
                              <p className="text-sm font-bold text-slate-800">
                                {item.name}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-slate-600">
                              {item.value} ideas
                            </p>
                          </div>

                          <div className="mt-2 h-2 rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: item.color,
                              }}
                            ></div>
                          </div>

                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {percentage}% of portfolio
                          </p>
                        </div>
                      );
                    })}

                    {!isLoading && opportunityMix.every((item) => item.value === 0) && (
                      <p className="text-sm font-medium text-slate-500">
                        No analyzed ideas available yet.
                      </p>
                    )}

                    {isLoading && (
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating analytics...
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants} className="h-full">
            <Card className="border-slate-200 shadow-sm rounded-xl flex flex-col h-full hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-900">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-6 flex-1">
                  {(overview?.recentActivity ?? []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm font-medium text-slate-500">
                      No recent activity yet. Start a new analysis to populate
                      your timeline.
                    </div>
                  ) : (
                    (overview?.recentActivity ?? []).map((activity) => {
                      const iconConfig = activityIcon(activity.type);
                      const Icon = iconConfig.icon;

                      return (
                        <div key={activity.id} className="flex gap-4">
                          <div className="mt-0.5">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${iconConfig.colorClass}`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {activity.title}
                            </h4>
                            <p className="text-sm text-slate-500 mt-0.5">
                              {activity.subtitle}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 font-medium">
                              {activity.timeAgo}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => router.push("/dashboard/workspace")}
                    className="text-sm font-bold text-[#ea580c] hover:text-[#d04e0a] transition-colors"
                  >
                    View All Activity
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Right Sidebar */}
      <motion.div
        variants={itemVariants}
        className="w-full min-[1700px]:w-80 space-y-6"
      >
        <h3 className="text-lg font-bold text-slate-900 px-1 pt-1">
          Market Trends
        </h3>

        {(overview?.marketTrends ?? []).map((trend) => (
          <motion.div
            key={trend.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              onClick={() =>
                router.push(
                  `/dashboard/market-analysis?industry=${encodeURIComponent(trend.category)}`,
                )
              }
              className="border-slate-200 shadow-sm rounded-xl overflow-hidden hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all duration-300 cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <span
                    className="text-xs font-bold tracking-wider uppercase"
                    style={{ color: trend.color }}
                  >
                    {trend.category}
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    {trend.tag}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-4">
                  {trend.label}
                </h4>

                <div className="space-y-4">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${trend.growth}%`,
                        backgroundColor: trend.color,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                    <span>Growth: {trend.growth}%</span>
                    <span>Sample: {trend.sample} ideas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        <h3 className="text-lg font-bold text-slate-900 px-1 pt-4">
          Quick Insights
        </h3>

        {/* Pro Tip Card */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card className="bg-[#ea580c] text-white border-none shadow-md shadow-orange-500/20 rounded-xl overflow-hidden relative hover:shadow-[0_0_20px_rgba(234,88,12,0.6)] transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-16 -mt-16"></div>
            <CardContent className="p-6 relative z-10">
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-200 mb-3 block">
                PRO TIP
              </span>
              <p className="font-semibold text-lg leading-snug mb-5">
                {overview?.quickInsight ?? "No insights available yet."}
              </p>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => router.push("/dashboard/market-analysis")}
                className="text-sm font-bold text-white underline underline-offset-4 hover:text-orange-100 transition-colors inline-flex items-center"
              >
                Read Insight
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
