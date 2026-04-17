type AnalyzeIdeaPayload = {
  title: string;
  description: string;
  targetAudience: string;
  industry: string;
};

export type IdeaAnalysisResult = {
  feasibilityScore: number;
  marketDemand: number;
  competitionLevel: number;
  innovationScore: number;
  overallViability: number;
  status: "VALIDATED" | "REJECTED";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round1 = (value: number) => Math.round(value * 10) / 10;

const hashText = (value: string) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
};

const seeded = (seed: number, offset: number) => {
  const value = Math.sin(seed * 0.0001 + offset * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

export function analyzeIdeaPayload(
  payload: AnalyzeIdeaPayload,
): IdeaAnalysisResult {
  const combined = `${payload.title}|${payload.description}|${payload.targetAudience}|${payload.industry}`;
  const seed = hashText(combined);

  const titleWeight = clamp(payload.title.length / 90, 0, 1);
  const descriptionWeight = clamp(payload.description.length / 400, 0, 1);

  const feasibilityScore = round1(
    clamp(
      48 + seeded(seed, 1) * 40 + titleWeight * 6 + descriptionWeight * 8,
      35,
      96,
    ),
  );

  const marketDemand = round1(
    clamp(
      42 +
        seeded(seed, 2) * 45 +
        descriptionWeight * 12 +
        (payload.targetAudience === "b2b" ? 3 : 0),
      28,
      99,
    ),
  );

  const competitionLevel = round1(
    clamp(
      25 +
        seeded(seed, 3) * 65 +
        (payload.industry.toLowerCase().includes("ai") ? 6 : 0),
      10,
      98,
    ),
  );

  const innovationScore = round1(
    clamp(
      35 + seeded(seed, 4) * 55 + titleWeight * 12 + descriptionWeight * 10,
      18,
      99,
    ),
  );

  const overallViability = round1(
    clamp(
      feasibilityScore * 0.3 +
        marketDemand * 0.3 +
        innovationScore * 0.28 +
        (100 - competitionLevel) * 0.12,
      20,
      98,
    ),
  );

  return {
    feasibilityScore,
    marketDemand,
    competitionLevel,
    innovationScore,
    overallViability,
    status: overallViability >= 60 ? "VALIDATED" : "REJECTED",
  };
}

export function getOpportunityBucket(score: number) {
  if (score >= 80) {
    return "High Potential";
  }

  if (score >= 60) {
    return "Promising";
  }

  return "Needs Validation";
}
