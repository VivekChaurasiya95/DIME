"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Download, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OpportunityDriver = {
  type: string;
  text: string;
  level: "strong" | "moderate" | "risk" | "low";
};

type OpportunityItem = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  industry: string;
  status: string;
  roi: number;
  excerpt: string;
  state: "selected" | "regular";
  drivers: OpportunityDriver[];
};

type OpportunityResponse = {
  industries: string[];
  statuses: string[];
  items: OpportunityItem[];
  comparison: Array<{
    id: string;
    name: string;
    roi: number;
  }>;
  empty: boolean;
};

type MatrixPoint = {
  id: string;
  name: string;
  feasibility: number;
  opportunityScore: number;
  novelty: number;
  marketPain: number;
  color: string;
  excerpt: string;
};

const fallback: OpportunityResponse = {
  industries: ["all"],
  statuses: ["all"],
  items: [],
  comparison: [],
  empty: true,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseDemandFromDrivers = (drivers: OpportunityDriver[]) => {
  const marketDriver = drivers.find(
    (driver) => driver.type === "Market Readiness",
  );
  const match = marketDriver?.text.match(/(\d+)%/);
  return match ? Number(match[1]) : 55;
};

const complexityAdjustment: Record<string, number> = {
  low: 10,
  medium: 0,
  high: -12,
};

const teamSizeAdjustment: Record<string, number> = {
  solo: -8,
  small: 2,
  medium: 8,
  startup: 12,
};

const complexityLabels: Record<string, string> = {
  low: "Low Complexity",
  medium: "Medium Complexity",
  high: "High Complexity",
};

const teamSizeLabels: Record<string, string> = {
  solo: "Solo Team",
  small: "Small Team (2-5)",
  medium: "Medium Team (6-15)",
  startup: "Startup Team (15+)",
};

export default function OpportunityMatrixPage() {
  const [industry, setIndustry] = useState("all");
  const [status, setStatus] = useState("all");
  const [complexity, setComplexity] = useState("medium");
  const [teamSize, setTeamSize] = useState("small");
  const [data, setData] = useState<OpportunityResponse>(fallback);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    setChartReady(true);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const query = new URLSearchParams({ industry, status });
      const response = await fetch(`/api/opportunities?${query.toString()}`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to load opportunities");
      }

      const payload = (await response.json()) as OpportunityResponse;
      setData(payload);
      setSelectedId((prev) => prev ?? payload.items[0]?.id ?? null);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load opportunity matrix right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [industry, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const matrixPoints = useMemo(() => {
    const basePoints = data.items.map((item) => {
      const novelty = clamp(Math.round(item.radius * 2), 0, 100);
      const marketPain = clamp(parseDemandFromDrivers(item.drivers), 0, 100);
      const opportunityScore = Math.round(novelty * 0.6 + marketPain * 0.4);
      const feasibility = clamp(
        Math.round(
          item.x +
            complexityAdjustment[complexity] +
            teamSizeAdjustment[teamSize],
        ),
        0,
        100,
      );

      return {
        id: item.id,
        name: item.name,
        feasibility,
        opportunityScore,
        novelty,
        marketPain,
        color: item.color,
        excerpt: item.excerpt,
      };
    });

    if (basePoints.length > 0) {
      return basePoints;
    }

    const sampleFeasibility = clamp(
      58 + complexityAdjustment[complexity] + teamSizeAdjustment[teamSize],
      0,
      100,
    );

    return [
      {
        id: "sample-point",
        name: "Sample Idea",
        feasibility: sampleFeasibility,
        opportunityScore: 64,
        novelty: 66,
        marketPain: 61,
        color: "#ea580c",
        excerpt: "Add a real idea analysis to replace this sample point.",
      },
    ];
  }, [complexity, data.items, teamSize]);

  const selectedPoint: MatrixPoint | null = useMemo(() => {
    return (
      matrixPoints.find((point) => point.id === selectedId) ??
      matrixPoints[0] ??
      null
    );
  }, [matrixPoints, selectedId]);

  const exportMatrix = () => {
    const content = JSON.stringify(
      {
        industry,
        status,
        complexity,
        teamSize,
        points: matrixPoints,
        formula: "opportunity_score = 0.6 * novelty + 0.4 * market_pain",
      },
      null,
      2,
    );

    const blob = new Blob([content], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "opportunity-matrix.json";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="app-page grid grid-cols-1 gap-6 min-[1700px]:grid-cols-[1.7fr_360px] animate-fade-in">
      <div className="flex min-w-0 flex-col">
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="h-10 w-[180px] rounded-lg border-slate-200 bg-white text-sm font-semibold text-slate-700">
              <SelectValue placeholder="Industry">
                {(value: string | null) => {
                  if (!value || value === "all") {
                    return "All Industries";
                  }

                  return value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {data.industries.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "all" ? "All Industries" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-[180px] rounded-lg border-slate-200 bg-white text-sm font-semibold text-slate-700">
              <SelectValue placeholder="Status">
                {(value: string | null) => {
                  if (!value || value === "all") {
                    return "All Statuses";
                  }

                  return value.toUpperCase();
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {data.statuses.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "all" ? "All Statuses" : item.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={complexity} onValueChange={setComplexity}>
            <SelectTrigger className="h-10 w-[180px] rounded-lg border-slate-200 bg-white text-sm font-semibold text-slate-700">
              <SelectValue placeholder="Complexity">
                {(value: string | null) =>
                  value
                    ? (complexityLabels[value] ?? "Complexity")
                    : "Complexity"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Complexity</SelectItem>
              <SelectItem value="medium">Medium Complexity</SelectItem>
              <SelectItem value="high">High Complexity</SelectItem>
            </SelectContent>
          </Select>

          <Select value={teamSize} onValueChange={setTeamSize}>
            <SelectTrigger className="h-10 w-[180px] rounded-lg border-slate-200 bg-white text-sm font-semibold text-slate-700">
              <SelectValue placeholder="Team Size">
                {(value: string | null) =>
                  value ? (teamSizeLabels[value] ?? "Team Size") : "Team Size"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solo">Solo Team</SelectItem>
              <SelectItem value="small">Small Team (2-5)</SelectItem>
              <SelectItem value="medium">Medium Team (6-15)</SelectItem>
              <SelectItem value="startup">Startup Team (15+)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={exportMatrix}
            variant="outline"
            className="h-10 rounded-lg border-slate-200 text-slate-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Matrix
          </Button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </div>
        )}

        <div className="relative flex min-h-[540px] flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Opportunity Matrix
              </h2>
              <p className="text-sm text-slate-500">
                X-axis: Feasibility | Y-axis: Opportunity Score
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void loadData()}
              className="h-9 rounded-lg border-slate-200 text-slate-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          <div className="relative min-h-[420px] w-full flex-1">
            {chartReady ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 30, left: 18 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="feasibility"
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="opportunityScore"
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "4 4" }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Scatter
                    data={matrixPoints}
                    onClick={(point: { payload?: MatrixPoint }) => {
                      const id = point?.payload?.id;
                      if (id) {
                        setSelectedId(id);
                      }
                    }}
                    shape={(props: {
                      cx: number;
                      cy: number;
                      fill: string;
                      payload: MatrixPoint;
                    }) => {
                      const { cx, cy, fill, payload } = props;
                      const active = payload.id === selectedPoint?.id;
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={active ? 9 : 6}
                            fill={fill}
                          />
                          {active && (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={15}
                              fill="none"
                              stroke={fill}
                              strokeWidth={2}
                              opacity={0.5}
                            />
                          )}
                        </g>
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col space-y-5 min-[1700px]:max-w-sm">
        <h3 className="px-1 pt-1 text-lg font-bold text-slate-900">
          Selected Idea
        </h3>

        {!selectedPoint && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Analyze ideas to populate your opportunity matrix.
          </div>
        )}

        {selectedPoint && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="text-lg font-bold text-slate-900">
                {selectedPoint.name}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {selectedPoint.excerpt}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Opportunity Formula
              </p>
              <p className="text-sm text-slate-700">
                opportunity_score = 0.6 x novelty + 0.4 x market pain
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Novelty</p>
                  <p className="font-semibold text-slate-900">
                    {selectedPoint.novelty}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Market Pain</p>
                  <p className="font-semibold text-slate-900">
                    {selectedPoint.marketPain}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Feasibility</p>
                  <p className="font-semibold text-slate-900">
                    {selectedPoint.feasibility}
                  </p>
                </div>
                <div className="rounded-lg bg-orange-50 p-2">
                  <p className="text-xs text-[#c2410c]">Opportunity Score</p>
                  <p className="font-semibold text-[#c2410c]">
                    {selectedPoint.opportunityScore}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
