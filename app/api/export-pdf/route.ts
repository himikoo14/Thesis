import puppeteer from "puppeteer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const encoded = encodeURIComponent(JSON.stringify(body));

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    "http://localhost:3000";

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.goto(
    `${baseUrl}/print/resultant?data=${encoded}`,
    {
      waitUntil: "networkidle0",
    }
  );

  await page.emulateMediaType("screen");

  await page.addStyleTag({
    content: `
      [data-next-badge-root],
      nextjs-portal,
      #__next-build-watcher,
      [class*="issue"],
      [class*="Issue"],
      [class*="badge"],
      [style*="position: fixed"],
      [style*="position:fixed"] {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "16mm",
      right: "16mm",
      bottom: "16mm",
      left: "16mm",
    },
  });

  await browser.close();

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="resultant-2d-solution.pdf"',
    },
  });
}