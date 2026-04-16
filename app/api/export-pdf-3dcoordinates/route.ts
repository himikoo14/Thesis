import puppeteer from "puppeteer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.evaluateOnNewDocument((payload) => {
    localStorage.setItem("coordinatePdfData", payload);
  }, JSON.stringify(body));

  await page.goto(
    "http://localhost:3000/print/resultant-3dcoordinate",
    {
      waitUntil: "networkidle0",
    }
  );

  await page.emulateMediaType("screen");

  await new Promise((resolve) => setTimeout(resolve, 2000));

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
      "Content-Disposition":
        'attachment; filename="coordinate-solution.pdf"',
    },
  });
}