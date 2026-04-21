import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import { getSimilarity } from "@/lib/analysis/similarity";

/**
 * POST /api/export/pdf
 *
 * Lightweight PDF-ready HTML export for idea analysis.
 * Returns the rendered HTML directly (Content-Type: text/html) so the
 * client can open it in a new tab and use the browser's native Print → Save
 * as PDF flow.  This serves as a Puppeteer-free fallback for environments
 * where headless Chromium is unavailable.
 *
 * Request body: { ideaId: string }
 */
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

    const similarity = getSimilarity(idea.description);

    const novelty = idea.noveltyScore ?? 0;
    const marketPain = idea.marketPainScore ?? 0;
    const opportunity = idea.opportunityScore ?? 0;
    const feasibility = Math.round(idea.feasibilityScore ?? 52);

    const noveltyLabel =
      novelty >= 0.7 ? "High" : novelty >= 0.4 ? "Moderate" : "Low";
    const painLabel =
      marketPain >= 0.7 ? "High" : marketPain >= 0.4 ? "Moderate" : "Low";
    const opportunityLabel =
      opportunity >= 0.7 ? "High" : opportunity >= 0.4 ? "Moderate" : "Low";

    const similarProjects = (similarity.similar_projects ?? []).slice(0, 5);

    const insightSummary = `${idea.title} shows ${noveltyLabel.toLowerCase()} differentiation against nearby projects and a ${painLabel.toLowerCase()} user pain signal. Opportunity Score is ${opportunity.toFixed(2)}, indicating ${opportunityLabel.toLowerCase()} potential for focused validation in ${idea.industry}.`;

    const generatedAt = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(idea.title)} — DIME Analysis Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1e293b;
    background: #fff;
    padding: 48px 52px;
    line-height: 1.6;
  }
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 3px solid #ea580c;
    padding-bottom: 20px;
    margin-bottom: 32px;
  }
  .header h1 { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
  .header .brand { font-size: 14px; font-weight: 700; color: #ea580c; letter-spacing: 2px; }
  .header .date { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .section { margin-bottom: 28px; }
  .section-title {
    font-size: 13px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 12px;
    padding-bottom: 6px; border-bottom: 1px solid #e2e8f0;
  }
  .idea-title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
  .idea-description { font-size: 14px; color: #475569; line-height: 1.7; }
  .meta-row { display: flex; gap: 32px; margin-top: 12px; }
  .meta-item { font-size: 12px; color: #64748b; }
  .meta-item strong { color: #334155; font-weight: 600; }
  .scores-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .score-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; background: #f8fafc; }
  .score-card .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; }
  .score-card .value { font-size: 32px; font-weight: 800; color: #0f172a; }
  .score-card .bar { height: 6px; border-radius: 3px; background: #e2e8f0; margin-top: 12px; overflow: hidden; }
  .score-card .bar-fill { height: 100%; border-radius: 3px; background: #ea580c; }
  .score-card .interpretation { font-size: 12px; font-weight: 600; margin-top: 8px; }
  .interpretation-high { color: #16a34a; }
  .interpretation-moderate { color: #d97706; }
  .interpretation-low { color: #dc2626; }
  .similar-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .similar-table th { background: #f1f5f9; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; padding: 10px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  .similar-table td { font-size: 13px; color: #334155; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .similar-table tr:last-child td { border-bottom: none; }
  .similarity-badge { display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 20px; padding: 2px 10px; font-size: 12px; font-weight: 600; color: #475569; }
  .insight-box { border: 2px solid #fed7aa; border-radius: 10px; padding: 20px; background: linear-gradient(135deg, #fff7ed 0%, #fff 100%); }
  .insight-box .insight-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #ea580c; margin-bottom: 8px; }
  .insight-box p { font-size: 14px; color: #334155; line-height: 1.7; font-weight: 500; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
  @media print {
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 24px; text-align: right;">
    <button onclick="window.print()" style="cursor:pointer; background:#ea580c; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:700; font-size:13px;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="brand">DIME</div>
      <h1>Idea Analysis Report</h1>
    </div>
    <div style="text-align: right;">
      <div class="date">Generated: ${generatedAt}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Idea Overview</div>
    <div class="idea-title">${escapeHtml(idea.title)}</div>
    <div class="idea-description">${escapeHtml(idea.description)}</div>
    <div class="meta-row">
      <div class="meta-item"><strong>Industry:</strong> ${escapeHtml(idea.industry)}</div>
      <div class="meta-item"><strong>Target Audience:</strong> ${escapeHtml(idea.targetAudience)}</div>
      <div class="meta-item"><strong>Status:</strong> ${escapeHtml(idea.status)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Analysis Scores</div>
    <div class="scores-grid">
      <div class="score-card">
        <div class="label">Novelty Score</div>
        <div class="value">${novelty.toFixed(2)}</div>
        <div class="bar"><div class="bar-fill" style="width: ${(novelty * 100).toFixed(0)}%"></div></div>
        <div class="interpretation interpretation-${noveltyLabel.toLowerCase()}">${noveltyLabel} Differentiation</div>
      </div>
      <div class="score-card">
        <div class="label">Market Pain</div>
        <div class="value">${marketPain.toFixed(2)}</div>
        <div class="bar"><div class="bar-fill" style="width: ${(marketPain * 100).toFixed(0)}%"></div></div>
        <div class="interpretation interpretation-${painLabel.toLowerCase()}">${painLabel} Urgency</div>
      </div>
      <div class="score-card">
        <div class="label">Opportunity Score</div>
        <div class="value">${opportunity.toFixed(2)}</div>
        <div class="bar"><div class="bar-fill" style="width: ${(opportunity * 100).toFixed(0)}%"></div></div>
        <div class="interpretation interpretation-${opportunityLabel.toLowerCase()}">${opportunityLabel} Potential</div>
      </div>
    </div>
    <div style="margin-top: 12px; font-size: 12px; color: #64748b;">
      Feasibility signal: ${feasibility}% based on project assumptions.
      Opportunity = 0.6 × Novelty + 0.4 × Market Pain.
    </div>
  </div>

  ${
    similarProjects.length > 0
      ? `
  <div class="section">
    <div class="section-title">Similar Projects (${similarProjects.length})</div>
    <table class="similar-table">
      <thead>
        <tr>
          <th style="width: 15%;">Type</th>
          <th>Description</th>
          <th style="width: 15%;">Similarity</th>
        </tr>
      </thead>
      <tbody>
        ${similarProjects
          .map(
            (p: {
              Name: string;
              Description: string;
              "Similarity Score": number;
              type?: string;
            }) => `
        <tr>
          <td>${p.type === "idea" ? "Similar Idea" : "GitHub Project"}</td>
          <td>${escapeHtml(p.Description)}</td>
          <td><span class="similarity-badge">${p["Similarity Score"].toFixed(2)}</span></td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>`
      : ""
  }

  <div class="section">
    <div class="section-title">Key Insight Summary</div>
    <div class="insight-box">
      <div class="insight-label">Analysis Conclusion</div>
      <p>${escapeHtml(insightSummary)}</p>
    </div>
  </div>

  <div class="footer">
    DIME — Data-Driven Innovation &amp; Market Exploration · This report was auto-generated from the DIME analysis pipeline.
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    console.error("EXPORT_PDF_HTML_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
