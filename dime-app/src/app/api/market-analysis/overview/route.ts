import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";

type SentimentStatus = "positive" | "neutral" | "negative";

type TrendPoint = {
  label: string;
  date: Date;
};

const normalizeRangeDays = (rawValue: string | null) => {
  const parsed = Number(rawValue ?? 365);

  if (!Number.isFinite(parsed)) {
    return 365;
  }

  if (parsed <= 30) {
    return 30;
  }

  if (parsed <= 90) {
    return 90;
  }

  return 365;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 10) / 10;

const toMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short" });

const toSentimentStatus = (status: string): SentimentStatus => {
  if (status === "VALIDATED" || status === "SAVED") {
    return "positive";
  }

  if (status === "REJECTED") {
    return "negative";
  }

  return "neutral";
};

const buildTrendPoints = (rangeDays: number): TrendPoint[] => {
  const months = rangeDays >= 365 ? 12 : rangeDays >= 90 ? 6 : 3;
  const now = new Date();
  const points: TrendPoint[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    points.push({
      label: toMonthLabel(date),
      date,
    });
  }

  return points;
};

const percentChange = (startValue: number, endValue: number) => {
  if (startValue <= 0) {
    return endValue > 0 ? 100 : 0;
  }

  return round(((endValue - startValue) / startValue) * 100);
};

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const rangeDays = normalizeRangeDays(url.searchParams.get("range"));
    const industryFilter = (url.searchParams.get("industry") ?? "all").trim();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeDays);

    const ideasScoped = await prisma.idea.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "asc" },
    });

    const ideasAll =
      ideasScoped.length > 0
        ? ideasScoped
        : await prisma.idea.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "asc" },
          });

    const notes = await prisma.note.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const tasks = await prisma.workspaceTask.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const ideas =
      industryFilter !== "all"
        ? ideasAll.filter(
            (idea) =>
              idea.industry.toLowerCase() === industryFilter.toLowerCase(),
          )
        : ideasAll;

    const trendPoints = buildTrendPoints(rangeDays);

    const demandTrend = trendPoints.map((point, index) => {
      const monthIdeas = ideas.filter(
        (idea) =>
          idea.createdAt.getFullYear() === point.date.getFullYear() &&
          idea.createdAt.getMonth() === point.date.getMonth(),
      );

      if (monthIdeas.length === 0) {
        return {
          month: point.label,
          value: 40 + index * (rangeDays >= 365 ? 7 : 5),
        };
      }

      const avgDemand =
        monthIdeas.reduce((sum, idea) => sum + (idea.marketDemand ?? 55), 0) /
        monthIdeas.length;

      return {
        month: point.label,
        value: Math.round(clamp(avgDemand + monthIdeas.length * 3, 18, 130)),
      };
    });

    const industryMap = new Map<
      string,
      { count: number; totalCompetition: number; avgViability: number }
    >();

    for (const idea of ideas) {
      const key = idea.industry || "General";
      const current = industryMap.get(key) ?? {
        count: 0,
        totalCompetition: 0,
        avgViability: 0,
      };

      current.count += 1;
      current.totalCompetition += idea.competitionLevel ?? 45;
      current.avgViability += idea.overallViability ?? 50;

      industryMap.set(key, current);
    }

    const sectorCompetition =
      industryMap.size > 0
        ? [...industryMap.entries()]
            .map(([sector, metrics], index) => {
              const palette = [
                "#ea580c",
                "#f59e0b",
                "#14b8a6",
                "#8b5cf6",
                "#38bdf8",
              ];
              return {
                sector,
                value: Math.round(metrics.totalCompetition / metrics.count),
                color: palette[index % palette.length],
              };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        : [
            { sector: "AI", value: 58, color: "#ea580c" },
            { sector: "SaaS", value: 48, color: "#f59e0b" },
            { sector: "Data", value: 42, color: "#14b8a6" },
          ];

    const sentimentCounter = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    for (const idea of ideas) {
      sentimentCounter[toSentimentStatus(idea.status)] += 1;
    }

    const sentimentTotal = Math.max(
      1,
      sentimentCounter.positive +
        sentimentCounter.neutral +
        sentimentCounter.negative,
    );

    const sentimentBreakdown = [
      {
        name: "Positive",
        value: Math.round((sentimentCounter.positive / sentimentTotal) * 100),
        color: "#22c55e",
      },
      {
        name: "Neutral",
        value: Math.round((sentimentCounter.neutral / sentimentTotal) * 100),
        color: "#f59e0b",
      },
      {
        name: "Negative",
        value: Math.round((sentimentCounter.negative / sentimentTotal) * 100),
        color: "#ef4444",
      },
    ];

    const emergingSignals = ideas
      .slice()
      .sort((a, b) => (b.overallViability ?? 0) - (a.overallViability ?? 0))
      .slice(0, 3)
      .map((idea, index) => {
        const demand = idea.marketDemand ?? 50;
        const competition = idea.competitionLevel ?? 50;
        return {
          id: idea.id,
          title: idea.title,
          impact: demand >= 70 ? "High" : demand >= 55 ? "Medium" : "Low",
          growth: `+${Math.max(6, Math.round(demand / 3) + index)}% this quarter`,
          risk:
            competition >= 70 ? "High" : competition >= 50 ? "Moderate" : "Low",
        };
      });

    const monthlySentiment = trendPoints.map((point) => {
      const monthIdeas = ideas.filter(
        (idea) =>
          idea.createdAt.getFullYear() === point.date.getFullYear() &&
          idea.createdAt.getMonth() === point.date.getMonth(),
      );

      if (monthIdeas.length === 0) {
        return {
          month: point.label,
          positive: 50,
          neutral: 34,
          negative: 16,
        };
      }

      const monthCounter = { positive: 0, neutral: 0, negative: 0 };

      for (const idea of monthIdeas) {
        monthCounter[toSentimentStatus(idea.status)] += 1;
      }

      const total = Math.max(
        1,
        monthCounter.positive + monthCounter.neutral + monthCounter.negative,
      );

      return {
        month: point.label,
        positive: Math.round((monthCounter.positive / total) * 100),
        neutral: Math.round((monthCounter.neutral / total) * 100),
        negative: Math.round((monthCounter.negative / total) * 100),
      };
    });

    const complaintSeed = notes.length > 0 ? notes : [];
    const userComplaintClusters = [
      "Onboarding Friction",
      "Pricing Transparency",
      "Slow Dashboard Load",
      "Workflow Confusion",
      "Mobile UX Gaps",
    ].map((cluster, index) => {
      const noteMatch = complaintSeed.filter((note) =>
        `${note.title} ${note.content}`
          .toLowerCase()
          .includes(cluster.split(" ")[0].toLowerCase()),
      ).length;
      const backlog = tasks.filter((task) => task.status !== "DONE").length;
      const base = 45 + noteMatch * 18 + backlog * 2 + index * 4;
      return {
        cluster,
        count: Math.round(clamp(base, 20, 120)),
        severity: Math.round(clamp(base - 10 + index * 3, 18, 95)),
      };
    });

    const featureRequestClusters = [
      "Automation Rules",
      "AI Co-Author",
      "Integrations Hub",
      "Role Permissions",
      "Custom Reporting",
    ].map((feature, index) => {
      const viability =
        ideas.length > 0
          ? ideas.reduce(
              (sum, idea) => sum + (idea.overallViability ?? 55),
              0,
            ) / ideas.length
          : 60;
      return {
        feature,
        requests: Math.round(clamp(70 + ideas.length * 5 + index * 6, 20, 180)),
        feasibility: Math.round(clamp(viability - 5 + index * 2, 20, 96)),
      };
    });

    const trendingMarketProblems = Array.from({ length: 8 }).map((_, index) => {
      const rejectedIdeas = ideas.filter(
        (idea) => idea.status === "REJECTED",
      ).length;
      const baseSignal = 30 + index * 5 + rejectedIdeas * 2;
      return {
        week: `W${index + 1}`,
        signal: Math.round(clamp(baseSignal, 22, 95)),
        urgency: Math.round(clamp(baseSignal + 6, 30, 99)),
      };
    });

    const problemHighlights = ideas
      .slice()
      .sort((a, b) => (a.overallViability ?? 50) - (b.overallViability ?? 50))
      .slice(0, 3)
      .map((idea) => ({
        id: idea.id,
        title: idea.title,
        growth: `+${Math.max(10, Math.round((idea.marketDemand ?? 45) / 3))}% discussion volume`,
        impact: idea.targetAudience.toUpperCase(),
      }));

    const startValue = demandTrend[0]?.value ?? 0;
    const endValue = demandTrend[demandTrend.length - 1]?.value ?? 0;
    const demandMomentum = percentChange(startValue, endValue);

    const saturationIndex =
      sectorCompetition.length > 0
        ? Math.round(
            sectorCompetition.reduce((sum, item) => sum + item.value, 0) /
              sectorCompetition.length,
          )
        : 50;

    const opportunityScore =
      ideas.length > 0
        ? Math.round(
            ideas.reduce(
              (sum, idea) => sum + (idea.overallViability ?? 50),
              0,
            ) / ideas.length,
          )
        : 72;

    const negativeShare =
      sentimentBreakdown.find((item) => item.name === "Negative")?.value ?? 0;
    const riskRadar =
      negativeShare >= 35 || saturationIndex >= 75
        ? "High"
        : negativeShare >= 20 || saturationIndex >= 60
          ? "Medium"
          : "Low";

    const availableIndustries = [
      "all",
      ...Array.from(
        new Set(ideasAll.map((idea) => idea.industry.trim()).filter(Boolean)),
      ),
    ];

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      rangeDays,
      industry: industryFilter || "all",
      availableIndustries,
      stats: {
        demandMomentum,
        saturationIndex,
        opportunityScore,
        riskRadar,
      },
      charts: {
        demandTrend,
        sectorCompetition,
        sentimentBreakdown,
        emergingSignals,
        userSentimentAnalysis: monthlySentiment,
        userComplaintClusters,
        featureRequestClusters,
        trendingMarketProblems,
        problemHighlights,
      },
    });
  } catch (error: unknown) {
    console.error("MARKET_ANALYSIS_OVERVIEW_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
