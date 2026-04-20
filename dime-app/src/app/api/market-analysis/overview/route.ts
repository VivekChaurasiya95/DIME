import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";
import { getSentimentInsights } from "@/lib/analysis/sentiment";

type MarketIssue = {
  issue: string;
  mentions: number;
  share_percent: number;
  primary_sources: string[];
};

type SourceDistribution = {
  source: string;
  reviews: number;
  share_percent: number;
};

type FeedbackVolumePoint = {
  month: string;
  total_reviews: number;
  negative_reviews: number;
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

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const inferIdeaDomain = (industries: string[]): string => {
  if (industries.length === 0) {
    return "unclassified";
  }

  const frequency = new Map<string, number>();

  for (const industry of industries) {
    const key = industry.trim().toLowerCase();
    if (!key) {
      continue;
    }

    frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }

  const top = [...frequency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return top ?? "unclassified";
};

const datasetMatchesIdeaDomain = (ideaDomain: string, datasetDomain: string) => {
  const idea = ideaDomain.toLowerCase();
  const dataset = datasetDomain.toLowerCase();

  const mobileSignals = ["app", "consumer", "social", "transport", "ride"];
  const ideaLooksMobile = mobileSignals.some((signal) => idea.includes(signal));
  const datasetLooksMobile = dataset.includes("mobile") || dataset.includes("app");

  if (ideaLooksMobile && datasetLooksMobile) {
    return true;
  }

  return idea === dataset;
};

const filterTimelineByRange = (
  timeline: FeedbackVolumePoint[],
  rangeDays: number,
): FeedbackVolumePoint[] => {
  if (timeline.length === 0) {
    return [];
  }

  const months = rangeDays >= 365 ? 12 : rangeDays >= 90 ? 6 : 3;
  return timeline.slice(-months);
};

const buildInsightSummary = (params: {
  isDomainAligned: boolean;
  ideaDomain: string;
  datasetDomain: string;
  topIssues: MarketIssue[];
  negativePercent: number;
}): string => {
  const { isDomainAligned, ideaDomain, datasetDomain, topIssues, negativePercent } =
    params;

  if (!isDomainAligned) {
    return `Current dataset reflects ${datasetDomain} and may not fully represent your idea domain (${ideaDomain}). Use this as directional market context, not direct validation.`;
  }

  const issueLead = topIssues
    .slice(0, 2)
    .map((issue) => `${issue.issue} (${issue.mentions} mentions)`)
    .join(" and ");

  if (issueLead) {
    return `${issueLead} are the most repeated complaints in this domain dataset, with ${negativePercent.toFixed(1)}% negative feedback overall.`;
  }

  return `Dataset feedback is currently ${negativePercent.toFixed(1)}% negative, but no recurring issue cluster was strong enough to rank in the top set.`;
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

    const ideas =
      industryFilter !== "all"
        ? ideasAll.filter(
            (idea) =>
              idea.industry.toLowerCase() === industryFilter.toLowerCase(),
          )
        : ideasAll;

    const availableIndustries = [
      "all",
      ...Array.from(
        new Set(ideasAll.map((idea) => idea.industry.trim()).filter(Boolean)),
      ),
    ];

    const sentiment = getSentimentInsights();
    const filteredTimeline = filterTimelineByRange(
      sentiment.review_volume_timeline,
      rangeDays,
    );

    const negativePercent = sentiment.sentiment_distribution.negative;
    const issueConcentration =
      sentiment.top_issues.length > 0
        ? sentiment.top_issues
            .slice(0, 3)
            .reduce((sum, issue) => sum + issue.share_percent, 0) /
          Math.min(3, sentiment.top_issues.length)
        : 0;

    const marketPainScore = clamp01(
      sentiment.negative_ratio * 0.7 + (issueConcentration / 100) * 0.3,
    );

    const ideaDomain = inferIdeaDomain(ideas.map((idea) => idea.industry));
    const datasetDomain = sentiment.dataset_domain;
    const isDomainAligned = datasetMatchesIdeaDomain(ideaDomain, datasetDomain);

    const summary = buildInsightSummary({
      isDomainAligned,
      ideaDomain,
      datasetDomain,
      topIssues: sentiment.top_issues,
      negativePercent,
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      rangeDays,
      industry: industryFilter || "all",
      availableIndustries,
      context_banner:
        "This analysis reflects trends from existing datasets and may not fully represent new or emerging idea domains.",
      sentiment_overview: {
        total_reviews: sentiment.total_reviews,
        sources: sentiment.sources,
        positive_percent: sentiment.sentiment_distribution.positive,
        neutral_percent: sentiment.sentiment_distribution.neutral,
        negative_percent: sentiment.sentiment_distribution.negative,
        explanation:
          "This reflects sentiment of existing products in this domain, not your idea.",
      },
      top_reported_issues: sentiment.top_issues.map((item) => ({
        category: item.issue,
        count: item.mentions,
        share_percent: item.share_percent,
        primary_sources: item.primary_sources,
      })),
      review_volume_timeline: filteredTimeline,
      source_distribution: sentiment.dataset_distribution,
      market_pain_signal: {
        score_0_to_1: Number(marketPainScore.toFixed(6)),
        score_percent: Number((marketPainScore * 100).toFixed(2)),
        explanation:
          "Derived from frequency and intensity of negative user feedback.",
        scale: {
          low: "0-0.3",
          moderate: "0.3-0.7",
          high: "0.7-1",
        },
      },
      domain_context: {
        dataset_domain: datasetDomain,
        idea_domain: ideaDomain,
        is_aligned: isDomainAligned,
      },
      insight_summary: summary,
      data_window: sentiment.data_window,
    });
  } catch (error: unknown) {
    console.error("MARKET_ANALYSIS_OVERVIEW_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
