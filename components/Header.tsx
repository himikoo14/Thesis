"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-3 justify-center sm:justify-start hover:text-blue-600 transition">
          <div className="w-10 h-10 border-2 border-black rounded-full" />
          <span className="font-bold text-xl text-black">Statics Calculator</span>
        </Link>


        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center space-x-6 text-gray-700 relative">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span>|</span>

          {/* Topics Dropdown */}
          <div className="group relative">
            <button className="hover:text-blue-600">Topics ▾</button>
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white border rounded-lg shadow-lg 
                opacity-0 group-hover:opacity-100 invisible group-hover:visible transition">
              <div className="flex flex-col p-2 text-sm text-gray-700">
                <Link href="/Introduction" className="hover:text-blue-600 p-2">
                  Chapter 1: Introduction to Statics
                </Link>
                <Link href="/2D-solver" className="hover:text-blue-600 p-2">
                  Chapter 2: Force Systems
                </Link>
                <Link href="/Equilibrium" className="hover:text-blue-600 p-2">
                  Chapter 3: Equilibrium
                </Link>
                <Link href="/Structures" className="hover:text-blue-600 p-2">
                  Chapter 4: Structures
                </Link>
                <Link href="/Distributed-Loads" className="hover:text-blue-600 p-2">
                  Chapter 5: Distributed Loads
                </Link>
                <Link href="/Comming-soon" className="hover:text-blue-600 p-2">
                  Chapter 6: Friction
                </Link>
                <Link href="/Comming-soon" className="hover:text-blue-600 p-2">
                  Chapter 7: Virtual Work
                </Link>
              </div>
            </div>
          </div>

          <span>|</span>
          <Link href="/about" className="hover:text-blue-600">
            About
          </Link>
        </nav>

        {/* Mobile Navigation */}
        <nav className="flex flex-col sm:hidden items-center gap-2 text-gray-700">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>

          {/* Topics (collapsible for mobile) */}
          <details className="w-full">
            <summary className="cursor-pointer text-center hover:text-blue-600">
              Topics
            </summary>
            <div className="flex flex-col mt-2 gap-2 text-sm">
              <Link href="/topics/ch1" className="hover:text-blue-600">
                Chapter 1: Introduction to Statics
              </Link>
              <Link href="/2D-solver" className="hover:text-blue-600 p-2">
                Chapter 2: Force Systems
              </Link>
              <Link href="/Equilibrium" className="hover:text-blue-600 p-2">
                Chapter 3: Equilibrium
              </Link>
              <Link href="/Structures" className="hover:text-blue-600 p-2">
                Chapter 4: Structures
              </Link>
              <Link href="/Distributed-Loads" className="hover:text-blue-600 p-2">
                Chapter 5: Distributed Loads
              </Link>
              <Link href="/Comming-soon" className="hover:text-blue-600 p-2">
                Chapter 6: Friction
              </Link>
              <Link href="/Comming-soon" className="hover:text-blue-600 p-2">
                Chapter 7: Virtual Work
              </Link>
            </div>
          </details>

          <Link href="/about" className="hover:text-blue-600">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
