"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-black rounded-full" />
          <span className="font-bold text-xl text-black">Statics Calculator</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-6 text-gray-700">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span>|</span>
          <Link href="/2D-solver" className="hover:text-blue-600">
            2D Solver
          </Link>
          <span>|</span>
          <Link href="/3D-solver" className="hover:text-blue-600">
            3D Solver
          </Link>
          <span>|</span>
          <Link href="/about" className="hover:text-blue-600">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
