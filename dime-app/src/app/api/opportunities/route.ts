import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";

const normalize = (value: string | null) => (value ?? "").trim().toLowerCase();

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
      comparison,
      empty: items.length === 0,
    });
  } catch (error: unknown) {
    console.error("OPPORTUNITIES_GET_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
