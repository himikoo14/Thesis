// app/api/export-pdf-truss/route.ts
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { nodeLabel } from "../../../lib/truss";

function fmt(v: number) {
  return Math.abs(v) < 1e-6 ? "0.00" : v.toFixed(2);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { supports, members, forces, resultRows, solution } = body;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW = 210, PH = 297, M = 18, CW = PW - M * 2, MAXY = PH - 22;
  let y = 0;

  const guard = (need: number) => {
    if (y + need > MAXY) { pdf.addPage(); y = M; }
  };

  // ── Header bar ──────────────────────────────────────────────────────────
  pdf.setFillColor(24, 72, 160);
  pdf.rect(0, 0, PW, 10, "F");
  y = 18;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(24, 72, 160);
  pdf.text("Truss Calculator — Solution", M, y);
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    M, y
  );
  y += 5;

  pdf.setDrawColor(220, 228, 245);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, PW - M, y);
  y += 9;

  // ── Member Forces table ─────────────────────────────────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(20, 20, 20);
  pdf.text("Member Forces", M, y);
  y += 8;

  const tol = 1e-6;
  for (let i = 0; i < solution.memberForces.length; i++) {
    const f: number = solution.memberForces[i];
    const lS = nodeLabel(members[i].start);
    const lE = nodeLabel(members[i].end);
    const type = Math.abs(f) < tol ? "Zero-force" : f > 0 ? "Tension" : "Compression";
    const sign = f > 0 ? "+" : "";

    guard(10);
    pdf.setFillColor(245, 248, 255);
    pdf.roundedRect(M, y - 5, CW, 9, 2, 2, "F");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(50, 50, 50);
    pdf.text(`Member ${lS}${lE}`, M + 4, y);

    const color: [number, number, number] =
      Math.abs(f) < tol ? [120, 120, 120] : f > 0 ? [37, 99, 235] : [220, 38, 38];
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...color);
    pdf.text(`${sign}${fmt(f)} kN  (${type})`, PW - M - 4, y, { align: "right" });
    y += 11;
  }

  y += 4;

  // ── Support Reactions ───────────────────────────────────────────────────
  guard(20);
  pdf.setDrawColor(220, 228, 245);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, PW - M, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(20, 20, 20);
  pdf.text("Support Reactions", M, y);
  y += 8;

  for (const r of solution.reactions) {
    if (Math.abs(r.x) < tol && Math.abs(r.y) < tol) continue;
    const lbl = nodeLabel(r.node);
    const sType = r.node < supports.length ? supports[r.node].type : "";

    guard(18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(50, 50, 50);
    pdf.text(`Joint ${lbl}  (${sType})`, M + 4, y);
    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(37, 99, 235);
    if (Math.abs(r.x) > tol) {
      pdf.text(`  R${lbl}x = ${fmt(r.x)} kN`, M + 4, y);
      y += 6;
    }
    if (Math.abs(r.y) > tol) {
      pdf.text(`  R${lbl}y = ${fmt(r.y)} kN`, M + 4, y);
      y += 6;
    }
    y += 2;
  }

  y += 4;

  // ── Step-by-step (text lines only — skip FBD diagrams) ─────────────────
  guard(20);
  pdf.setDrawColor(220, 228, 245);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, PW - M, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(20, 20, 20);
  pdf.text("Step-by-Step Solution", M, y);
  y += 9;

  for (const line of solution.lines as any[]) {
    switch (line.kind) {
      case "heading":
        guard(12);
        y += 2;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(24, 72, 160);
        pdf.text(line.text, M, y);
        y += 8;
        break;

      case "subheading":
        guard(10);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(55, 65, 81);
        pdf.text(line.text, M, y);
        y += 7;
        break;

      case "text":
        guard(8);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        const wrapped = pdf.splitTextToSize(line.text as string, CW);
        pdf.text(wrapped, M, y);
        y += wrapped.length * 6 + 2;
        break;

      case "eq":
      case "result": {
        // Render LaTeX as readable plain text — strip common LaTeX commands
        guard(8);
        const plain = (line.tex as string)
          .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
          .replace(/\\left|\\right|\\cdot/g, "")
          .replace(/\\text\{([^}]+)\}/g, "$1")
          .replace(/\{|\}/g, "")
          .replace(/\\\\/g, "  ")
          .replace(/\\[a-zA-Z]+/g, "")
          .trim();

        if (line.kind === "result") {
          pdf.setFillColor(240, 244, 255);
          pdf.roundedRect(M, y - 4, CW, 9, 2, 2, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(24, 72, 160);
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(50, 50, 50);
        }
        pdf.setFontSize(10);
        const eqWrapped = pdf.splitTextToSize(plain, CW - 8);
        pdf.text(eqWrapped, M + 4, y);
        y += eqWrapped.length * 6 + 4;
        break;
      }

      case "warn":
        guard(8);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(220, 38, 38);
        pdf.text(line.text, M, y);
        y += 7;
        break;

      case "jointFBD":
        guard(8);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`[FBD — Joint ${String.fromCharCode(65 + line.joint)} — see on-screen diagram]`, M, y);
        y += 7;
        break;

      case "spacer":
        y += 4;
        break;
    }
  }

  // ── Page numbers + footer bar ────────────────────────────────────────────
  const total = pdf.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    pdf.setPage(pg);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${pg} of ${total}`, PW - M, PH - 8, { align: "right" });
    pdf.setFillColor(24, 72, 160);
    pdf.rect(0, PH - 4, PW, 4, "F");
  }

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="truss-solution.pdf"',
    },
  });
}