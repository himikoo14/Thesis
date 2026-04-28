"use client";

import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 shadow dark:shadow-gray-700 border-b dark:border-gray-700 relative z-50">
      <div className="max-w-7xl mx-auto px-3 py-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:px-6 sm:py-4">

        {/* Logo + Title */}
        <Link
          href="/"
          className="flex items-center gap-2 hover:text-[#1848a0] dark:hover:text-blue-400 transition"
        >
          <Image
            src="/Logo.png"
            alt="Logo"
            width={36}
            height={36}
            className="object-contain sm:!w-[45px] sm:!h-[45px]"
          />
          <span className="font-bold text-[22px] sm:text-[30px] text-black dark:text-white whitespace-nowrap">
            Statics Calculator
          </span>
        </Link>

        {/* Nav — no wrap, compressed on small screens */}
        <nav
          className="flex items-center text-gray-700 dark:text-gray-300 text-[12px] sm:text-[18px]"
          style={{ gap: "5px" }}
        >
          <Link href="/" className="hover:text-[#1848a0] dark:hover:text-blue-400 whitespace-nowrap">Home</Link>
          <span className="text-gray-400 dark:text-gray-500 px-0.5">|</span>

          {/* Calculators Dropdown */}
          <div className="group relative">
            <button className="hover:text-[#1848a0] dark:hover:text-blue-400 whitespace-nowrap">
              Calculators ▾
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-52 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition z-50 text-[13px] sm:text-[16px]">
              <div className="flex flex-col p-2 text-gray-700 dark:text-gray-300">
                <Link href="/Introduction"      className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Chapter 1: Statics Modules</Link>
                <Link href="/2D-solver"         className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Chapter 2: Force Systems</Link>
                <Link href="/Equilibrium"       className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Chapter 3: Equilibrium</Link>
                <Link href="/Structures"        className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Chapter 4: Structures</Link>
                <Link href="/Distributed-Loads" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Chapter 5: Distributed Loads</Link>
              </div>
            </div>
          </div>

          <span className="text-gray-400 dark:text-gray-500 px-0.5">|</span>

          {/* Modules Dropdown */}
          <div className="group relative">
            <button className="hover:text-[#1848a0] dark:hover:text-blue-400 whitespace-nowrap">
              Modules ▾
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-52 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition z-50 text-[13px] sm:text-[16px]">
              <div className="flex flex-col p-2 text-gray-700 dark:text-gray-300">
                <Link href="/modules/FBD"            className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 1: Free Body Diagram</Link>
                <Link href="/modules/2D-Resultant"   className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 2: 2D Resultant</Link>
                <Link href="/modules/3D-Resultant"   className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 3: 3D Resultant</Link>
                <Link href="/modules/2D-Equilibrium" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 4: 2D Equilibrium</Link>
                <Link href="/modules/3D-Equilibrium" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 5: 3D Equilibrium</Link>
                <Link href="/modules/Truss"          className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 6: Truss Joint Method</Link>
                <Link href="/modules/MOIcentroidal"  className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 7: MOI Centroidal Axis</Link>
                <Link href="/modules/MOIcustom"      className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 8: MOI Custom Axis</Link>
              </div>
            </div>
          </div>

          <span className="text-gray-400 dark:text-gray-500 px-0.5">|</span>
          <Link href="/about" className="hover:text-[#1848a0] dark:hover:text-blue-400 whitespace-nowrap">About</Link>
        </nav>

      </div>
    </header>
  );
}