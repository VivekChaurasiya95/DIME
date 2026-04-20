import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";

const normalize = (value: string | null) => (value ?? "").trim().toLowerCase();

type ComplexityLevel = "low" | "medium" | "high";
type TeamSizeLevel = "solo" | "small" | "large";
type TimelineLevel = "lt1m" | "m1to3" | "gt3m";
type FamiliarityLevel = "beginner" | "intermediate" | "expert";

const colorFromScore = (score: number) => {
  if (score >= 80) {
    return "#10b981";
  }

  if (score >= 60) {
    return "#ea580c";
  }

  if (score >= 45) {
    return "#4f46e5";
  }

  return "#94a3b8";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const complexityWeights: Record<ComplexityLevel, number> = {
  low: 30,
  medium: 20,
  high: 10,
};

const teamWeights: Record<TeamSizeLevel, number> = {
  solo: 10,
  small: 20,
  large: 30,
};

const timelineWeights: Record<TimelineLevel, number> = {
  lt1m: 10,
  m1to3: 20,
  gt3m: 30,
};

const familiarityWeights: Record<FamiliarityLevel, number> = {
  beginner: 10,
  intermediate: 20,
  expert: 30,
};

const inferComplexity = (competitionLevel: number): ComplexityLevel => {
  if (competitionLevel >= 70) {
    return "high";
  }

  if (competitionLevel >= 45) {
    return "medium";
  }

  return "low";
};

const inferTeamSize = (description: string): TeamSizeLevel => {
  const length = description.trim().length;

  if (length > 240) {
    return "large";
  }

  if (length > 110) {
    return "small";
  }

  return "solo";
};

const inferTimeline = (status: string): TimelineLevel => {
  const normalized = status.trim().toLowerCase();

  if (normalized === "draft") {
    return "lt1m";
  }

  if (normalized === "analyzing") {
    return "m1to3";
  }

  return "gt3m";
};

const inferFamiliarity = (innovationScore: number): FamiliarityLevel => {
  if (innovationScore >= 70) {
    return "expert";
  }

  if (innovationScore >= 45) {
    return "intermediate";
  }

  return "beginner";
};

const computeFeasibility = (
  complexity: ComplexityLevel,
  teamSize: TeamSizeLevel,
  timeline: TimelineLevel,
  familiarity: FamiliarityLevel,
): number => {
  const rawScore =
    complexityWeights[complexity] +
    teamWeights[teamSize] +
    timelineWeights[timeline] +
    familiarityWeights[familiarity];

  // Raw range is 40..120. Normalize to 0..100.
  return Math.round(clamp(((rawScore - 40) / 80) * 100, 0, 100));
};

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const industry = normalize(url.searchParams.get("industry"));
    const status = normalize(url.searchParams.get("status"));

    const ideas = await prisma.idea.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const filteredIdeas = ideas.filter((idea) => {
      if (
        industry &&
        industry !== "all" &&
        idea.industry.toLowerCase() !== industry
      ) {
        return false;
      }

      if (status && status !== "all" && idea.status.toLowerCase() !== status) {
        return false;
      }

      return true;
    });

    const computed = filteredIdeas.map((idea) => {
      const noveltyScore = clamp((idea.innovationScore ?? 50) / 100, 0, 1);
      const marketPain = clamp((idea.marketDemand ?? 50) / 100, 0, 1);
      const opportunityScore = Number(
        (0.6 * noveltyScore + 0.4 * marketPain).toFixed(6),
      );

      const complexity = inferComplexity(idea.competitionLevel ?? 50);
      const teamSize = inferTeamSize(idea.description);
      const timeline = inferTimeline(idea.status);
      const familiarity = inferFamiliarity(idea.innovationScore ?? 50);
      const feasibilityScore = computeFeasibility(
        complexity,
        teamSize,
        timeline,
        familiarity,
      );

      return {
        id: idea.id,
        title: idea.title,
        feasibility_score: feasibilityScore,
        opportunity_score: opportunityScore,
        novelty_score: noveltyScore,
        market_pain: marketPain,
      };
    });

    const items = filteredIdeas.map((idea) => {
      const feasibility = Math.round(idea.feasibilityScore ?? 52);
      const viability = Math.round(idea.overallViability ?? 55);
      const marketDemand = Math.round(idea.marketDemand ?? 50);
      const competition = Math.round(idea.competitionLevel ?? 50);
      const innovation = Math.round(idea.innovationScore ?? 50);
      const roi = Math.max(
        35,
        Math.round(viability * 2.8 + marketDemand - competition),
      );

      return {
        id: idea.id,
        name: idea.title,
        x: feasibility,
        y: viability,
        color: colorFromScore(viability),
        radius: Math.max(24, Math.min(58, Math.round(innovation / 2))),
        industry: idea.industry,
        status: idea.status,
        roi,
        excerpt: idea.description,
        state: viability >= 75 ? "selected" : "regular",
        drivers: [
          {
            type: "Market Readiness",
            text: `Demand score ${marketDemand}% in ${idea.industry}`,
            level: marketDemand >= 70 ? "strong" : "moderate",
          },
          {
            type: "Technical Feasibility",
            text: `Implementation feasibility at ${feasibility}%`,
            level: feasibility >= 65 ? "strong" : "moderate",
          },
          {
            type: "Competition Risk",
            text: `Competition pressure ${competition}%`,
            level: competition >= 70 ? "risk" : "low",
          },
        ],
      };
    });

    const comparison = items
      .slice()
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        name: item.name,
        roi: item.roi,
      }));

    const industries = [
      "all",
      ...Array.from(
        new Set(ideas.map((idea) => idea.industry.trim()).filter(Boolean)),
      ),
    ];

    return NextResponse.json({
      industries,
      statuses: ["all", "draft", "analyzing", "validated", "rejected", "saved"],
      items,
      computed,
      comparison,
      empty: items.length === 0,
    });
  } catch (error: unknown) {
    console.error("OPPORTUNITIES_GET_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
