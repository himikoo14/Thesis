"use client";

import Link from "next/link";

type NavLink = { label: string; href: string };

interface FooterProps {
  links?: NavLink[];
}

export default function Footer({
  links = [
    { label: "About", href: "/about" },
    { label: "References", href: "/reference" },
    { label: "Developers", href: "/developers" },
  ],
}: FooterProps) {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t dark:border-gray-700 mt-auto relative z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 text-center text-gray-700 dark:text-gray-300">
        <div className="flex justify-center flex-wrap gap-x-2 gap-y-1">
          {links.map((link, idx) => (
            <span key={link.href} className="flex items-center text-[16px] sm:text-[18px]">
              <Link
                href={link.href}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                {link.label}
              </Link>
              {idx < links.length - 1 && (
                <span className="ml-2 text-gray-400 dark:text-gray-500">|</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}