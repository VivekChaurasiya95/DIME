"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  SortDesc,
  Code,
  MessageSquare,
  BarChart,
  TrendingUp,
  HandMetal,
  Share2,
  Bookmark,
  Loader2,
  Database,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DatasetItem = {
  key: string;
  title: string;
  description: string;
  size: string;
  updated: string;
  type: "PUBLIC" | "PREMIUM";
  icon: "code" | "message" | "chart" | "trend" | "patent" | "stream";
  colorClass: string;
  isBookmarked: boolean;
  isImported: boolean;
};

type DatasetResponse = {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  stats: {
    bookmarked: number;
    imported: number;
  };
  items: DatasetItem[];
};

const defaultData: DatasetResponse = {
  page: 1,
  pageSize: 6,
  total: 0,
  hasMore: false,
  stats: {
    bookmarked: 0,
    imported: 0,
  },
  items: [],
};

const iconByType = {
  code: Code,
  message: MessageSquare,
  chart: BarChart,
  trend: TrendingUp,
  patent: HandMetal,
  stream: Share2,
} as const;

const typeFilterLabels: Record<string, string> = {
  all: "All Types",
  public: "PUBLIC",
  premium: "PREMIUM",
};

const datasetSortLabels: Record<string, string> = {
  relevance: "Relevance",
  title: "Title",
  newest: "Updated",
  size: "Size",
};

export default function DatasetExplorerPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DatasetItem[]>([]);
  const [payload, setPayload] = useState<DatasetResponse>(defaultData);
  const [preview, setPreview] = useState<DatasetItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchDatasets = useCallback(
    async (targetPage: number, append: boolean) => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: "6",
          search: debouncedQuery,
          type: typeFilter,
          sort: sortBy,
        });

        const response = await fetch(`/api/datasets?${params.toString()}`);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to load datasets");
        }

        const data = (await response.json()) as DatasetResponse;
        setPayload(data);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load dataset explorer right now.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedQuery, sortBy, typeFilter],
  );

  useEffect(() => {
    void fetchDatasets(page, page > 1);
  }, [fetchDatasets, page]);

  const totalImportedVisible = useMemo(
    () => items.filter((item) => item.isImported).length,
    [items],
  );

  const mutateDatasetState = async (
    datasetKey: string,
    action: "bookmark" | "import",
    value?: boolean,
  ) => {
    try {
      setIsActionLoading(`${action}-${datasetKey}`);

      const response = await fetch("/api/datasets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datasetKey,
          action,
          value,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update dataset state");
      }

      const state = (await response.json()) as {
        datasetKey: string;
        isBookmarked: boolean;
        isImported: boolean;
      };

      setItems((prev) =>
        prev.map((item) =>
          item.key === state.datasetKey
            ? {
                ...item,
                isBookmarked: state.isBookmarked,
                isImported: state.isImported,
              }
            : item,
        ),
      );
      setPayload((prev) => ({
        ...prev,
        stats: {
          bookmarked:
            action === "bookmark"
              ? Math.max(
                  0,
                  prev.stats.bookmarked + (state.isBookmarked ? 1 : -1),
                )
              : prev.stats.bookmarked,
          imported:
            action === "import"
              ? Math.max(0, prev.stats.imported + (state.isImported ? 1 : -1))
              : prev.stats.imported,
        },
      }));
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update dataset state.",
      );
    } finally {
      setIsActionLoading(null);
    }
  };

  const importVisibleDatasets = async () => {
    const pending = items.filter((item) => !item.isImported).slice(0, 3);

    if (pending.length === 0) {
      setErrorMessage("All visible datasets are already imported.");
      return;
    }

    for (const dataset of pending) {
      await mutateDatasetState(dataset.key, "import", true);
    }
  };

  return (
    <div className="app-page relative z-0 space-y-6 pb-12 animate-fade-in">
      <div className="-mt-2 mb-2 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            suppressHydrationWarning
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search datasets, categories or keywords..."
            className="h-12 w-full rounded-xl border border-orange-200 bg-orange-50/20 pl-10 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20"
          />
        </div>
        <Button
          onClick={() => void importVisibleDatasets()}
          className="ml-0 h-11 whitespace-nowrap rounded-xl bg-[#ea580c] px-6 font-bold text-white shadow-sm shadow-orange-500/20 hover:bg-[#d04e0a] md:ml-2"
        >
          <Database className="mr-2 h-4 w-4" />
          Import Dataset
        </Button>
      </div>

      <div className="mb-2 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 className="app-title mb-1">Dataset Explorer</h1>
          <p className="app-subtitle mt-0">
            Access curated datasets for deeper market analysis and idea
            validation.
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Imported now: {payload.stats.imported} total, {totalImportedVisible}{" "}
            visible
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[150px]">
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white font-bold text-slate-700">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type">
                  {(value: string | null) =>
                    value ? (typeFilterLabels[value] ?? "Type") : "Type"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="public">PUBLIC</SelectItem>
                <SelectItem value="premium">PREMIUM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[170px]">
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value ?? "relevance");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white font-bold text-slate-700">
                <SortDesc className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort">
                  {(value: string | null) =>
                    value ? (datasetSortLabels[value] ?? "Sort") : "Sort"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="newest">Updated</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((dataset) => {
          const Icon = iconByType[dataset.icon];
          const bookmarkLoading = isActionLoading === `bookmark-${dataset.key}`;
          const importLoading = isActionLoading === `import-${dataset.key}`;

          return (
            <Card
              key={dataset.key}
              className="rounded-2xl border-slate-200 shadow-sm transition-all duration-300 hover:border-orange-300 hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="mb-6 flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${dataset.colorClass}`}
                  >
                    <Icon className="h-5 w-5 text-slate-100" />
                  </div>
                  <Badge
                    variant="secondary"
                    className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-widest ${
                      dataset.type === "PUBLIC"
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-50"
                        : "bg-blue-50 text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {dataset.type}
                  </Badge>
                </div>

                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {dataset.title}
                </h3>
                <p className="mb-6 line-clamp-2 h-10 text-sm font-medium text-slate-500">
                  {dataset.description}
                </p>

                <div className="mb-6 flex items-center gap-6">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      SIZE
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {dataset.size}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      UPDATED
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {dataset.updated}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <Button
                    onClick={() => setPreview(dataset)}
                    className="h-11 rounded-xl bg-[#ea580c] font-bold text-white shadow-sm hover:bg-[#d04e0a]"
                  >
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      void mutateDatasetState(dataset.key, "bookmark")
                    }
                    disabled={bookmarkLoading}
                    className="h-11 w-11 shrink-0 rounded-xl border-slate-200 text-slate-400 hover:text-slate-600"
                  >
                    {bookmarkLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Bookmark
                        className={`h-5 w-5 ${dataset.isBookmarked ? "fill-current text-[#ea580c]" : "opacity-40"}`}
                      />
                    )}
                  </Button>
                </div>

                <Button
                  onClick={() =>
                    void mutateDatasetState(
                      dataset.key,
                      "import",
                      !dataset.isImported,
                    )
                  }
                  disabled={importLoading}
                  variant="outline"
                  className="mt-3 h-10 w-full rounded-xl border-orange-200 bg-orange-50/40 font-bold text-[#ea580c] hover:bg-orange-100"
                >
                  {importLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="mr-2 h-4 w-4" />
                  )}
                  {dataset.isImported ? "Imported" : "Import"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {items.length === 0 && !isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
          No datasets found for current filters.
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Button
          variant="outline"
          disabled={!payload.hasMore || isLoading}
          onClick={() => setPage((prev) => prev + 1)}
          className="h-12 rounded-xl border-orange-100 bg-orange-50/50 px-8 font-bold text-[#ea580c] hover:bg-orange-100 disabled:opacity-50"
        >
          {isLoading && page > 1 ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {payload.hasMore ? "Load more datasets" : "No more datasets"}
        </Button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {preview.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {preview.description}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setPreview(null)}
                className="h-9 rounded-lg border-slate-200"
              >
                Close
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Dataset Size
                </p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {preview.size}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Refresh Cycle
                </p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {preview.updated}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  void mutateDatasetState(
                    preview.key,
                    "bookmark",
                    !preview.isBookmarked,
                  )
                }
                className="h-10 rounded-lg border-slate-200"
              >
                {preview.isBookmarked ? "Unbookmark" : "Bookmark"}
              </Button>
              <Button
                onClick={() =>
                  void mutateDatasetState(
                    preview.key,
                    "import",
                    !preview.isImported,
                  )
                }
                className="h-10 rounded-lg bg-[#ea580c] text-white hover:bg-[#d04e0a]"
              >
                {preview.isImported ? "Imported" : "Import to Workspace"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
