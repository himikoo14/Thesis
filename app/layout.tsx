import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StatiCalcs",
  description: "Interactive calculators for learning and solving Statics of Rigid Bodies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-georgia antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
