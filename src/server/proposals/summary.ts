import type { ProposalAcceptance } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import type { AcceptanceSnapshot } from "./types";

const brand = {
  ink: rgb(0.05, 0.09, 0.14),
  muted: rgb(0.36, 0.43, 0.52),
  line: rgb(0.82, 0.87, 0.91),
  panel: rgb(0.95, 0.98, 0.99),
  accent: rgb(0.35, 0.86, 0.78),
  accentDark: rgb(0.06, 0.41, 0.37),
};

export async function buildAcceptanceSummaryPdf(
  acceptance: ProposalAcceptance,
) {
  const snapshot = acceptance.proposalSnapshot as AcceptanceSnapshot;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const logo = await loadLogo(pdf);
  const pageSize: [number, number] = [612, 792];
  const margin = 48;
  let page = pdf.addPage(pageSize);
  let y = 736;

  const money = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: snapshot.currency.toUpperCase(),
    }).format(cents / 100);

  const addPage = () => {
    page = pdf.addPage(pageSize);
    y = 736;
    drawFooter(page, regular);
  };

  const ensureSpace = (height: number) => {
    if (y - height < 72) addPage();
  };

  const text = (
    value: string,
    x: number,
    size: number,
    font = regular,
    color = brand.ink,
  ) => {
    page.drawText(value, { x, y, size, font, color });
    y -= size + 7;
  };

  drawHeader(page, bold, regular, logo);
  drawFooter(page, regular);

  y = 626;
  page.drawText("Proposal Acceptance Certificate", {
    x: margin,
    y,
    size: 30,
    font: bold,
    color: brand.ink,
  });
  y -= 38;
  page.drawText(snapshot.proposalTitle, {
    x: margin,
    y,
    size: 16,
    font: regular,
    color: brand.muted,
  });
  y -= 34;

  drawInfoGrid(page, bold, regular, [
    ["Client", snapshot.clientOrganization],
    ["Proposal", snapshot.proposalNumber],
    ["Version", snapshot.proposalVersionLabel],
    ["Accepted", formatDate(snapshot.acceptedAt)],
    ["Signatory", snapshot.signatory.fullName],
    ["Total Investment", money(snapshot.totalCents)],
  ]);
  y = 424;

  ensureSpace(110);
  drawSectionTitle(page, "Acceptance", margin, y, bold);
  y -= 28;
  for (const line of wrapText(
    "The signatory accepted the proposal scope, payment schedule, and terms using the typed signature recorded below. This document was generated from the stored immutable acceptance snapshot.",
    regular,
    10.5,
    500,
  )) {
    text(line, margin, 10.5, regular, brand.muted);
  }

  y -= 10;
  drawSignatureBlock(page, bold, regular, snapshot, y);
  y -= 112;

  drawSection("Executive Summary", snapshot.executiveSummary);
  drawSection("Scope of Work", snapshot.scopeOfWork);
  drawListSection("Deliverables", snapshot.deliverables);
  drawPaymentSection(snapshot.paymentSchedule, money);
  drawSection("Terms", snapshot.terms);
  drawVerificationSection(acceptance, mono, regular, bold);

  return pdf.save();

  function drawSection(title: string, body: string) {
    ensureSpace(92);
    drawSectionTitle(page, title, margin, y, bold);
    y -= 24;
    for (const line of wrapText(body, regular, 10.5, 500)) {
      text(line, margin, 10.5, regular, brand.muted);
    }
    y -= 12;
  }

  function drawListSection(title: string, items: string[]) {
    ensureSpace(90 + items.length * 18);
    drawSectionTitle(page, title, margin, y, bold);
    y -= 24;
    for (const item of items) {
      page.drawCircle({
        x: margin + 3,
        y: y + 4,
        size: 2.2,
        color: brand.accent,
      });
      text(item, margin + 14, 10.5, regular, brand.muted);
    }
    y -= 12;
  }

  function drawPaymentSection(
    items: AcceptanceSnapshot["paymentSchedule"],
    formatter: (cents: number) => string,
  ) {
    ensureSpace(100 + items.length * 24);
    drawSectionTitle(page, "Investment", margin, y, bold);
    y -= 28;
    page.drawRectangle({
      x: margin,
      y: y - 62,
      width: 240,
      height: 74,
      color: brand.panel,
      borderColor: brand.line,
      borderWidth: 1,
    });
    page.drawText("Total investment", {
      x: margin + 16,
      y: y - 8,
      size: 9,
      font: bold,
      color: brand.muted,
    });
    page.drawText(formatter(snapshot.totalCents), {
      x: margin + 16,
      y: y - 40,
      size: 24,
      font: bold,
      color: brand.ink,
    });

    let rowY = y + 2;
    for (const item of items) {
      page.drawText(item.label, {
        x: 330,
        y: rowY,
        size: 10,
        font: bold,
        color: brand.ink,
      });
      page.drawText(formatter(item.amountCents), {
        x: 512 - bold.widthOfTextAtSize(formatter(item.amountCents), 10),
        y: rowY,
        size: 10,
        font: bold,
        color: brand.ink,
      });
      rowY -= 24;
    }
    y -= 98;
  }

  function drawVerificationSection(
    record: ProposalAcceptance,
    monoFont: typeof mono,
    bodyFont: typeof regular,
    titleFont: typeof bold,
  ) {
    ensureSpace(142);
    drawSectionTitle(page, "Verification", margin, y, titleFont);
    y -= 25;
    text("Proposal content hash", margin, 9, bodyFont, brand.muted);
    for (const line of wrapText(record.proposalContentHash, monoFont, 8, 500)) {
      text(line, margin, 8, monoFont, brand.ink);
    }
    y -= 8;
    text("Acceptance payload hash", margin, 9, bodyFont, brand.muted);
    for (const line of wrapText(
      record.acceptancePayloadHash,
      monoFont,
      8,
      500,
    )) {
      text(line, margin, 8, monoFont, brand.ink);
    }
  }
}

export function buildAcceptanceSummaryHtml(acceptance: ProposalAcceptance) {
  const snapshot = acceptance.proposalSnapshot as AcceptanceSnapshot;
  const money = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: snapshot.currency.toUpperCase(),
    }).format(cents / 100);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Proposal Acceptance Summary</title>
  <style>
    body { font-family: Arial, sans-serif; color: #101820; margin: 40px; line-height: 1.5; }
    h1, h2 { color: #07111f; }
    section { margin: 28px 0; }
    .meta { color: #536173; }
    .hash { font-family: monospace; overflow-wrap: anywhere; }
    @media print { body { margin: 24px; } }
  </style>
</head>
<body>
  <h1>Ghost AI Solutions</h1>
  <p class="meta">Proposal Acceptance Summary</p>
  <section>
    <h2>${escapeHtml(snapshot.clientOrganization)}</h2>
    <p><strong>${escapeHtml(snapshot.proposalTitle)}</strong></p>
    <p>Proposal ${escapeHtml(snapshot.proposalNumber)} · ${escapeHtml(snapshot.proposalVersionLabel)}</p>
  </section>
  <section><h2>Summary</h2><p>${escapeHtml(snapshot.executiveSummary)}</p></section>
  <section><h2>Scope</h2><p>${escapeHtml(snapshot.scopeOfWork)}</p></section>
  <section><h2>Deliverables</h2><ul>${snapshot.deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
  <section><h2>Investment</h2><p>${money(snapshot.totalCents)}</p></section>
  <section><h2>Payment Schedule</h2><ul>${snapshot.paymentSchedule.map((item) => `<li>${escapeHtml(item.label)}: ${money(item.amountCents)}</li>`).join("")}</ul></section>
  <section><h2>Terms</h2><p>${escapeHtml(snapshot.terms)}</p></section>
  <section>
    <h2>Signatory</h2>
    <p>${escapeHtml(snapshot.signatory.fullName)} · ${escapeHtml(snapshot.signatory.title)} · ${escapeHtml(snapshot.signatory.email)}</p>
    <p>Accepted at ${escapeHtml(new Date(snapshot.acceptedAt).toLocaleString())}</p>
    <p>Typed signature: ${escapeHtml(snapshot.signatory.typedSignature)}</p>
  </section>
  <section>
    <h2>Verification</h2>
    <p>Proposal content hash:</p><p class="hash">${acceptance.proposalContentHash}</p>
    <p>Acceptance payload hash:</p><p class="hash">${acceptance.acceptancePayloadHash}</p>
    <p>This document was generated from the stored immutable acceptance snapshot, not the mutable live proposal record.</p>
  </section>
</body>
</html>`;
}

function drawHeader(
  page: PDFPage,
  bold: PDFFont,
  regular: PDFFont,
  logo: PDFImage | null,
) {
  page.drawRectangle({
    x: 0,
    y: 682,
    width: 612,
    height: 110,
    color: brand.ink,
  });
  if (logo) {
    const width = 154;
    const height = width * (logo.height / logo.width);
    page.drawImage(logo, { x: 42, y: 706, width, height });
  } else {
    page.drawCircle({ x: 74, y: 735, size: 22, color: brand.accent });
    page.drawText("G", {
      x: 61,
      y: 720,
      size: 30,
      font: bold,
      color: brand.ink,
    });
    page.drawText("GHOST AI SOLUTIONS", {
      x: 112,
      y: 744,
      size: 13,
      font: bold,
      color: rgb(1, 1, 1),
    });
  }
  page.drawText("Client Portal Acceptance Record", {
    x: logo ? 214 : 112,
    y: 724,
    size: 10,
    font: regular,
    color: rgb(0.72, 0.8, 0.88),
  });
  page.drawText("Verified proposal acceptance", {
    x: 386,
    y: 735,
    size: 10,
    font: bold,
    color: brand.accent,
  });
}

async function loadLogo(pdf: PDFDocument) {
  try {
    const logoBytes = await readFile(
      path.join(process.cwd(), "public", "ghost-ai-logo.png"),
    );
    return pdf.embedPng(logoBytes);
  } catch {
    return null;
  }
}

function drawFooter(page: PDFPage, regular: PDFFont) {
  page.drawLine({
    start: { x: 48, y: 44 },
    end: { x: 564, y: 44 },
    thickness: 0.5,
    color: brand.line,
  });
  page.drawText("Ghost AI Solutions", {
    x: 48,
    y: 28,
    size: 8,
    font: regular,
    color: brand.muted,
  });
  page.drawText("Generated from immutable acceptance data", {
    x: 374,
    y: 28,
    size: 8,
    font: regular,
    color: brand.muted,
  });
}

function drawInfoGrid(
  page: PDFPage,
  bold: PDFFont,
  regular: PDFFont,
  rows: Array<[string, string]>,
) {
  const x = 48;
  const y = 450;
  page.drawRectangle({
    x,
    y,
    width: 516,
    height: 112,
    color: brand.panel,
    borderColor: brand.line,
    borderWidth: 1,
  });
  rows.forEach(([label, value], index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const cellX = x + 18 + column * 166;
    const cellY = y + 76 - row * 48;
    page.drawText(label.toUpperCase(), {
      x: cellX,
      y: cellY + 18,
      size: 7.5,
      font: bold,
      color: brand.accentDark,
    });
    page.drawText(value.slice(0, 34), {
      x: cellX,
      y: cellY,
      size: 10,
      font: regular,
      color: brand.ink,
    });
  });
}

function drawSectionTitle(
  page: PDFPage,
  title: string,
  x: number,
  y: number,
  bold: PDFFont,
) {
  page.drawText(title, { x, y, size: 15, font: bold, color: brand.ink });
  page.drawLine({
    start: { x, y: y - 8 },
    end: { x: 564, y: y - 8 },
    thickness: 0.8,
    color: brand.line,
  });
}

function drawSignatureBlock(
  page: PDFPage,
  bold: PDFFont,
  regular: PDFFont,
  snapshot: AcceptanceSnapshot,
  y: number,
) {
  page.drawRectangle({
    x: 48,
    y: y - 88,
    width: 516,
    height: 92,
    color: rgb(1, 1, 1),
    borderColor: brand.line,
    borderWidth: 1,
  });
  page.drawText(snapshot.signatory.typedSignature, {
    x: 68,
    y: y - 34,
    size: 20,
    font: bold,
    color: brand.ink,
  });
  page.drawLine({
    start: { x: 68, y: y - 48 },
    end: { x: 286, y: y - 48 },
    thickness: 0.8,
    color: brand.line,
  });
  page.drawText(
    `${snapshot.signatory.fullName} | ${snapshot.signatory.title} | ${snapshot.signatory.email}`,
    { x: 68, y: y - 66, size: 9, font: regular, color: brand.muted },
  );
  page.drawText(`Accepted ${formatDate(snapshot.acceptedAt)}`, {
    x: 360,
    y: y - 66,
    size: 9,
    font: regular,
    color: brand.muted,
  });
}

function wrapText(
  value: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
