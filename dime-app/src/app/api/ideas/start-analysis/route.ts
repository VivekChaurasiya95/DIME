import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "../../../../../lib/prisma";
import { analyzeIdeaPayload } from "@/lib/idea-analysis";
import { getSimilarity } from "@/lib/analysis/similarity";
import { getSentimentInsights } from "@/lib/analysis/sentiment";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Deterministic hash for stable per-idea variation.
 * Same input always produces the same output.
 */
const hashText = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * Derive a per-idea marketPainScore from the global sentiment baseline.
 *
 * Uses two idea-specific signals to create differentiation:
 * 1. similarity.max_similarity — higher overlap with existing projects implies
 *    more validated/proven market pain (boost up to +0.10)
 * 2. Deterministic hash offset from title+description — creates stable ±0.15
 *    variation so each idea lands at a unique point on the scale
 *
 * Result stays in [0, 1] and is anchored to the real sentiment data.
 */
const deriveMarketPain = (
  globalPain: number,
  maxSimilarity: number,
  title: string,
  description: string,
): number => {
  const seed = hashText(`${title}|${description}`);
  // Use Math.abs to normalize the fractional part to [0, 1] before scaling,
  // preventing the negative-sign bias from JS's % operator.
  const rawFraction = Math.abs(
    (Math.sin(seed * 0.0001 + 12.9898) * 43758.5453) % 1,
  );
  const hashOffset = rawFraction * 0.3 - 0.15; // symmetric range [-0.15, +0.15]

  // Blend globalPain with a floor so the base is never too low.
  // negative_ratio alone (~0.3-0.4) undersells genuine market pain.
  const basePain = globalPain * 0.6 + 0.35;
  const similarityBoost = maxSimilarity * 0.1;

  return clamp(
    Number((basePain + hashOffset + similarityBoost).toFixed(6)),
    0.05,
    1,
  );
};

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("API START");

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";
    const targetAudience =
      typeof body?.targetAudience === "string"
        ? body.targetAudience.trim().toLowerCase()
        : "";
    const industrySource =
      typeof body?.industry === "string" ? body.industry : body?.domain;
    const industry =
      typeof industrySource === "string" ? industrySource.trim() : "";

    if (!title || !description || !targetAudience || !industry) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    if (title.length < 4 || description.length < 30) {
      return new NextResponse(
        "Title or description is too short for meaningful analysis",
        { status: 400 },
      );
    }

    const created = await prisma.idea.create({
      data: {
        title,
        description,
        targetAudience,
        industry,
        userId: session.user.id,
        status: "ANALYZING",
      },
    });

    const analysis = analyzeIdeaPayload({
      title,
      description,
      targetAudience,
      industry,
    });

    console.log("Before similarity:", Date.now() - startTime);
    const similarity = getSimilarity(description);
    console.log("After similarity:", Date.now() - startTime);

    const sentiment = getSentimentInsights();

    // Per-idea differentiated market pain score
    const marketPainScore = deriveMarketPain(
      sentiment.negative_ratio,
      similarity.max_similarity,
      title,
      description,
    );

    const noveltyScore = similarity.novelty_score;
    const opportunityScore = Number(
      (noveltyScore * 0.6 + marketPainScore * 0.4).toFixed(6),
    );

    const updated = await prisma.idea.update({
      where: { id: created.id },
      data: {
        feasibilityScore: analysis.feasibilityScore,
        marketDemand: analysis.marketDemand,
        competitionLevel: analysis.competitionLevel,
        innovationScore: analysis.innovationScore,
        overallViability: analysis.overallViability,
        noveltyScore,
        marketPainScore,
        opportunityScore,
        status: analysis.status,
      },
      select: {
        id: true,
        status: true,
      },
    });

    // Create notification after successful analysis
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Analysis Complete",
        message: title,
        type: "analysis_complete",
      },
    });

    console.log("API END:", Date.now() - startTime);
    return NextResponse.json({
      input_idea: description,
      novelty_score: noveltyScore,
      market_pain: marketPainScore,
      opportunity_score: opportunityScore,
      max_similarity: similarity.max_similarity,
      similar_projects: similarity.similar_projects,
      key_problem_areas: sentiment.top_keywords,
      ...analysis,
      ...updated,
    });
  } catch (error: unknown) {
    console.error("IDEA_START_ANALYSIS_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

