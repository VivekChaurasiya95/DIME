import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/db";

type SummaryPayload = {
  rangeDays?: number;
  industry?: string;
  saveToNotes?: boolean;
};

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as SummaryPayload;
    const industry = (body.industry ?? "all").trim();

    const allIdeas = await prisma.idea.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const ideas =
      industry !== "all"
        ? allIdeas.filter(
            (idea) => idea.industry.toLowerCase() === industry.toLowerCase(),
          )
        : allIdeas;

    const total = ideas.length;
    const avgViability =
      total > 0
        ? Math.round(
            ideas.reduce(
              (sum, idea) => sum + (idea.overallViability ?? 50),
              0,
            ) / total,
          )
        : 0;
    const avgDemand =
      total > 0
        ? Math.round(
            ideas.reduce((sum, idea) => sum + (idea.marketDemand ?? 50), 0) /
              total,
          )
        : 0;
    const highPotential = ideas.filter(
      (idea) => (idea.overallViability ?? 0) >= 75,
    ).length;
    const rejected = ideas.filter((idea) => idea.status === "REJECTED").length;

    const summary =
      total === 0
        ? "No analyzed ideas found yet. Run Idea Analyzer on at least one concept to generate an evidence-backed market summary."
        : `Across ${total} analyzed ideas${industry !== "all" ? ` in ${industry}` : ""}, the average viability is ${avgViability}% with demand at ${avgDemand}%. ${highPotential} idea(s) are in high-potential territory, while ${rejected} require rework. Priority recommendation: focus the next sprint on top-demand segments and reduce competition risk in low-viability concepts.`;

    if (body.saveToNotes) {
      await prisma.note.create({
        data: {
          userId: session.user.id,
          title: `Market Summary${industry !== "all" ? ` - ${industry}` : ""}`,
          content: summary,
          category: "Market Research",
          tone: "blue",
          isPinned: true,
        },
      });
    }

    return NextResponse.json({
      summary,
      meta: {
        totalIdeas: total,
        averageViability: avgViability,
        averageDemand: avgDemand,
        highPotential,
      },
    });
  } catch (error: unknown) {
    console.error("MARKET_ANALYSIS_SUMMARY_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
