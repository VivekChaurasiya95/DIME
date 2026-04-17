import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/server-auth";
import { DATASET_CATALOG } from "@/lib/dataset-catalog";

const normalize = (value: string | null) => (value ?? "").trim().toLowerCase();

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const search = normalize(url.searchParams.get("search"));
    const type = normalize(url.searchParams.get("type"));
    const sort = normalize(url.searchParams.get("sort")) || "relevance";
    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(
      parsePositiveInt(url.searchParams.get("pageSize"), 6),
      24,
    );

    const userDatasets = await prisma.userDataset.findMany({
      where: { userId: session.user.id },
    });

    const stateMap = new Map(
      userDatasets.map((item) => [item.datasetKey, item]),
    );

    let results = DATASET_CATALOG.map((dataset) => {
      const state = stateMap.get(dataset.key);
      return {
        ...dataset,
        isBookmarked: state?.isBookmarked ?? false,
        isImported: state?.isImported ?? false,
      };
    });

    if (type && type !== "all") {
      results = results.filter(
        (dataset) => dataset.type.toLowerCase() === type,
      );
    }

    if (search) {
      results = results.filter((dataset) => {
        const haystack =
          `${dataset.title} ${dataset.description}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    if (sort === "newest") {
      results = results
        .slice()
        .sort((a, b) => b.updated.localeCompare(a.updated));
    } else if (sort === "title") {
      results = results.slice().sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "size") {
      results = results.slice().sort((a, b) => b.size.localeCompare(a.size));
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return NextResponse.json({
      page,
      pageSize,
      total: results.length,
      hasMore: end < results.length,
      stats: {
        bookmarked: results.filter((dataset) => dataset.isBookmarked).length,
        imported: results.filter((dataset) => dataset.isImported).length,
      },
      items: results.slice(start, end),
    });
  } catch (error: unknown) {
    console.error("DATASETS_GET_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

type ActionPayload = {
  datasetKey?: string;
  action?: "bookmark" | "import";
  value?: boolean;
};

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as ActionPayload;
    const datasetKey = (body.datasetKey ?? "").trim();

    if (!datasetKey) {
      return new NextResponse("datasetKey is required", { status: 400 });
    }

    const catalogItem = DATASET_CATALOG.find((item) => item.key === datasetKey);

    if (!catalogItem) {
      return new NextResponse("Dataset not found", { status: 404 });
    }

    const existing = await prisma.userDataset.findUnique({
      where: {
        userId_datasetKey: {
          userId: session.user.id,
          datasetKey,
        },
      },
    });

    let nextBookmarked = existing?.isBookmarked ?? false;
    let nextImported = existing?.isImported ?? false;

    if (body.action === "bookmark") {
      nextBookmarked = body.value ?? !nextBookmarked;
    }

    if (body.action === "import") {
      nextImported = body.value ?? !nextImported;
    }

    const updated = await prisma.userDataset.upsert({
      where: {
        userId_datasetKey: {
          userId: session.user.id,
          datasetKey,
        },
      },
      create: {
        userId: session.user.id,
        datasetKey,
        isBookmarked: nextBookmarked,
        isImported: nextImported,
      },
      update: {
        isBookmarked: nextBookmarked,
        isImported: nextImported,
      },
    });

    return NextResponse.json({
      datasetKey,
      isBookmarked: updated.isBookmarked,
      isImported: updated.isImported,
    });
  } catch (error: unknown) {
    console.error("DATASETS_POST_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
