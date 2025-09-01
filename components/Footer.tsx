"use client";

import Link from "next/link";

type NavLink = { label: string; href: string };

interface FooterProps {
  links?: NavLink[];
}

export default function Footer({
  links = [
    { label: "About", href: "/about" },
    { label: "References", href: "/references" },
    { label: "Contact", href: "/contact" },
    { label: "Developer", href: "/developer" },
  ],
}: FooterProps) {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-4 text-center text-gray-700">
        {links.map((link, idx) => (
          <span key={link.href}>
            <Link href={link.href} className="hover:text-blue-600">
              {link.label}
            </Link>
            {idx < links.length - 1 && " | "}
          </span>
        ))}
      </div>
    </footer>
  );
}
