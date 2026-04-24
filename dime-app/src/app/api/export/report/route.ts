import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "../../../../../lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ── colour palette ──────────────────────────────────────────────────────
const COLORS = {
  black: rgb(0.06, 0.09, 0.16), // #0f172a
  dark: rgb(0.12, 0.14, 0.22), // #1e293b
  mid: rgb(0.28, 0.33, 0.42), // #475569
  light: rgb(0.58, 0.64, 0.72), // #94a3b8
  accent: rgb(0.92, 0.35, 0.05), // #ea580c
  green: rgb(0.09, 0.64, 0.27), // #16a34a
  amber: rgb(0.85, 0.47, 0.02), // #d97706
  red: rgb(0.86, 0.15, 0.15), // #dc2626
  rule: rgb(0.89, 0.91, 0.94), // #e2e8f0
};

// ── helpers ─────────────────────────────────────────────────────────────

/** Wrap long text into lines that fit within `maxWidth` at the given font/size */
function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n/);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${currentLine} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }

  return lines;
}

/** Ensure y doesn't drop below a margin; add a page if necessary */
function ensureSpace(
  doc: PDFDocument,
  currentPage: ReturnType<PDFDocument["addPage"]>,
  y: number,
  needed: number,
  bottomMargin: number,
): { page: ReturnType<PDFDocument["addPage"]>; y: number } {
  if (y - needed < bottomMargin) {
    const newPage = doc.addPage([595.28, 841.89]); // A4
    return { page: newPage, y: 841.89 - 50 };
  }
  return { page: currentPage, y };
}

// ── main handler ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const ideaId = typeof body?.ideaId === "string" ? body.ideaId.trim() : "";

    if (!ideaId) {
      return new NextResponse("Missing ideaId", { status: 400 });
    }

    const idea = await prisma.idea.findFirst({
      where: { id: ideaId, userId: session.user.id },
    });

    if (!idea) {
      return new NextResponse("Idea not found", { status: 404 });
    }

    // ── compute labels ────────────────────────────────────────────────
    const novelty = idea.noveltyScore ?? 0;
    const marketPain = idea.marketPainScore ?? 0;
    const opportunity = idea.opportunityScore ?? 0;
    const feasibility = Math.round(idea.feasibilityScore ?? 52);

    const label = (v: number) =>
      v >= 0.7 ? "High" : v >= 0.4 ? "Moderate" : "Low";

    const noveltyLabel = label(novelty);
    const painLabel = label(marketPain);
    const opportunityLabel = label(opportunity);

    const interpretation =
      opportunity > 0.7
        ? "High Potential"
        : opportunity >= 0.4
          ? "Moderate Potential"
          : "Low Potential";

    const insightLine = `This idea shows ${painLabel.toLowerCase()} market demand with ${noveltyLabel.toLowerCase()} novelty.`;
    const insightDetail = `Opportunity Score is ${opportunity.toFixed(2)}, indicating ${opportunityLabel.toLowerCase()} potential for focused validation in ${idea.industry}.`;

    const generatedAt = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // ── build PDF ─────────────────────────────────────────────────────
    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595.28; // A4
    const PAGE_H = 841.89;
    const MARGIN_LEFT = 50;
    const MARGIN_RIGHT = 50;
    const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
    const BOTTOM_MARGIN = 60;

    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - 50;

    // ── helper: advance y with auto-pagination ────────────────────────
    const advance = (amount: number) => {
      const result = ensureSpace(doc, page, y, amount, BOTTOM_MARGIN);
      page = result.page;
      y = result.y;
    };

    // ── HEADER ────────────────────────────────────────────────────────
    // Brand
    page.drawText("DIME", {
      x: MARGIN_LEFT,
      y,
      size: 14,
      font: fontBold,
      color: COLORS.accent,
    });

    // Date — right-aligned
    const dateText = `Generated: ${generatedAt}`;
    const dateW = fontRegular.widthOfTextAtSize(dateText, 9);
    page.drawText(dateText, {
      x: PAGE_W - MARGIN_RIGHT - dateW,
      y: y + 2,
      size: 9,
      font: fontRegular,
      color: COLORS.light,
    });
    y -= 22;

    // Title
    page.drawText("Idea Analysis Report", {
      x: MARGIN_LEFT,
      y,
      size: 22,
      font: fontBold,
      color: COLORS.black,
    });
    y -= 14;

    // Accent rule
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_W - MARGIN_RIGHT, y },
      thickness: 2.5,
      color: COLORS.accent,
    });
    y -= 30;

    // ── SECTION: Idea Overview ────────────────────────────────────────
    const drawSectionTitle = (title: string) => {
      advance(30);
      page.drawText(title.toUpperCase(), {
        x: MARGIN_LEFT,
        y,
        size: 10,
        font: fontBold,
        color: COLORS.light,
      });
      y -= 6;
      page.drawLine({
        start: { x: MARGIN_LEFT, y },
        end: { x: PAGE_W - MARGIN_RIGHT, y },
        thickness: 0.5,
        color: COLORS.rule,
      });
      y -= 16;
    };

    drawSectionTitle("Idea Overview");

    // Idea title
    const titleLines = wrapText(idea.title, fontBold, 18, CONTENT_W);
    for (const line of titleLines) {
      advance(22);
      page.drawText(line, {
        x: MARGIN_LEFT,
        y,
        size: 18,
        font: fontBold,
        color: COLORS.black,
      });
      y -= 22;
    }
    y -= 4;

    // ── SECTION: Description ──────────────────────────────────────────
    drawSectionTitle("Description");

    const descLines = wrapText(idea.description, fontRegular, 11, CONTENT_W);
    for (const line of descLines) {
      advance(16);
      page.drawText(line, {
        x: MARGIN_LEFT,
        y,
        size: 11,
        font: fontRegular,
        color: COLORS.mid,
      });
      y -= 16;
    }
    y -= 6;

    // Meta row
    advance(16);
    const metaItems = [
      `Industry: ${idea.industry}`,
      `Target Audience: ${idea.targetAudience}`,
      `Status: ${idea.status}`,
    ];
    let metaX = MARGIN_LEFT;
    for (const item of metaItems) {
      page.drawText(item, {
        x: metaX,
        y,
        size: 9,
        font: fontRegular,
        color: COLORS.light,
      });
      metaX += fontRegular.widthOfTextAtSize(item, 9) + 28;
    }
    y -= 28;

    // ── SECTION: Analysis Scores ──────────────────────────────────────
    drawSectionTitle("Analysis Scores");

    const scores = [
      { label: "Novelty Score", value: novelty, tag: `${noveltyLabel} Differentiation` },
      { label: "Market Pain Score", value: marketPain, tag: `${painLabel} Urgency` },
      { label: "Opportunity Score", value: opportunity, tag: `${opportunityLabel} Potential` },
    ];

    const COL_W = (CONTENT_W - 20) / 3; // 3 columns with 10px gaps

    for (let i = 0; i < scores.length; i++) {
      const s = scores[i];
      const colX = MARGIN_LEFT + i * (COL_W + 10);

      advance(70);

      // Card background
      page.drawRectangle({
        x: colX,
        y: y - 58,
        width: COL_W,
        height: 68,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: COLORS.rule,
        borderWidth: 0.5,
      });

      // Label
      page.drawText(s.label.toUpperCase(), {
        x: colX + 10,
        y: y - 4,
        size: 8,
        font: fontBold,
        color: COLORS.light,
      });

      // Value
      page.drawText(s.value.toFixed(2), {
        x: colX + 10,
        y: y - 24,
        size: 22,
        font: fontBold,
        color: COLORS.black,
      });

      // Bar background
      const barY = y - 38;
      const barW = COL_W - 20;
      page.drawRectangle({
        x: colX + 10,
        y: barY,
        width: barW,
        height: 5,
        color: COLORS.rule,
      });
      // Bar fill
      page.drawRectangle({
        x: colX + 10,
        y: barY,
        width: barW * s.value,
        height: 5,
        color: COLORS.accent,
      });

      // Tag
      const tagColor =
        s.value >= 0.7 ? COLORS.green : s.value >= 0.4 ? COLORS.amber : COLORS.red;
      page.drawText(s.tag, {
        x: colX + 10,
        y: y - 52,
        size: 9,
        font: fontBold,
        color: tagColor,
      });
    }
    y -= 72;

    // Feasibility note
    advance(16);
    page.drawText(
      `Feasibility signal: ${feasibility}% based on project assumptions.  Opportunity = 0.6 × Novelty + 0.4 × Market Pain.`,
      { x: MARGIN_LEFT, y, size: 9, font: fontRegular, color: COLORS.light },
    );
    y -= 28;

    // ── SECTION: Interpretation ───────────────────────────────────────
    drawSectionTitle("Interpretation");

    advance(20);
    page.drawText(interpretation, {
      x: MARGIN_LEFT,
      y,
      size: 16,
      font: fontBold,
      color:
        opportunity > 0.7
          ? COLORS.green
          : opportunity >= 0.4
            ? COLORS.amber
            : COLORS.red,
    });
    y -= 28;

    // ── SECTION: Key Insight ──────────────────────────────────────────
    drawSectionTitle("Key Insight");

    // Box
    advance(56);
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: y - 42,
      width: CONTENT_W,
      height: 56,
      color: rgb(1, 0.97, 0.93), // #fff7ed
      borderColor: rgb(0.99, 0.84, 0.67), // #fed7aa
      borderWidth: 1.5,
    });

    page.drawText("ANALYSIS CONCLUSION", {
      x: MARGIN_LEFT + 14,
      y: y - 4,
      size: 8,
      font: fontBold,
      color: COLORS.accent,
    });

    const insightLines = wrapText(insightLine, fontRegular, 10, CONTENT_W - 28);
    let insightY = y - 20;
    for (const line of insightLines) {
      page.drawText(line, {
        x: MARGIN_LEFT + 14,
        y: insightY,
        size: 10,
        font: fontRegular,
        color: COLORS.dark,
      });
      insightY -= 14;
    }

    const detailLines = wrapText(insightDetail, fontRegular, 10, CONTENT_W - 28);
    for (const line of detailLines) {
      page.drawText(line, {
        x: MARGIN_LEFT + 14,
        y: insightY,
        size: 10,
        font: fontRegular,
        color: COLORS.dark,
      });
      insightY -= 14;
    }

    y = insightY - 10;

    // ── FOOTER ────────────────────────────────────────────────────────
    advance(30);
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_W - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: COLORS.rule,
    });
    y -= 14;

    const footerText =
      "DIME — Data-Driven Innovation & Market Exploration · Auto-generated report";
    const footerW = fontRegular.widthOfTextAtSize(footerText, 8);
    page.drawText(footerText, {
      x: (PAGE_W - footerW) / 2,
      y,
      size: 8,
      font: fontRegular,
      color: COLORS.light,
    });

    // ── serialize & return ────────────────────────────────────────────
    const pdfBytes = await doc.save();

    const filename = `${idea.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_analysis_report.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("EXPORT_REPORT_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
