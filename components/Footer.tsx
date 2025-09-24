"use client";

import Link from "next/link";

type NavLink = { label: string; href: string };

interface FooterProps {
  links?: NavLink[];
}

export default function Footer({
  links = [
    { label: "About", href: "/about" },
    { label: "References", href: "/References" },
    { label: "Contact", href: "/Contacts" },
    { label: "Developer", href: "/Developer" },
  ],
}: FooterProps) {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-4 text-center text-gray-700 text-[18px]">
        {/* Desktop: horizontal links with | separator */}
        <div className="hidden sm:flex justify-center flex-wrap gap-4">
          {links.map((link, idx) => (
            <span key={link.href} className="flex items-center text-[18px]">
              <Link href={link.href} className="hover:text-blue-600">
                {link.label}
              </Link>
              {idx < links.length - 1 && (
                <span className="mx-2 text-gray-400">|</span>
              )}
            </span>
          ))}
        </div>

        {/* Mobile: stacked links */}
        <div className="flex flex-col sm:hidden gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-blue-600 text-[18px]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
