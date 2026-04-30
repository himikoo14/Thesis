"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Header() {
  const [openDropdown, setOpenDropdown] = useState<null | "calculators" | "modules">(null);

  const toggle = (name: "calculators" | "modules") => {
    setOpenDropdown(prev => prev === name ? null : name);
  };

  const close = () => setOpenDropdown(null);

  return (
    <header className="bg-white dark:bg-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.1)] relative z-50">
      <div className="max-w-7xl mx-auto px-3 py-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:px-6 sm:py-4">

        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-2 hover:text-[#1848a0] dark:hover:text-blue-400 transition">
          <Image src="/Logo.png" alt="Logo" width={36} height={36} className="object-contain sm:!w-[45px] sm:!h-[45px]" />
          <span className="font-bold text-[22px] sm:text-[30px] text-black dark:text-white whitespace-nowrap">
            Statics Calculator
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center text-gray-700 dark:text-gray-300 text-[12px] sm:text-[18px]" style={{ gap: "5px" }}>
          <Link href="/" className="hover:text-[#1848a0] dark:hover:text-blue-400 whitespace-nowrap">Home</Link>
          <span className="text-gray-400 dark:text-gray-500 px-0.5">|</span>

          {/* Calculators Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggle("calculators")}
              className="hover:text-[#1848a0] dark:hover:text-blue-400 whitespace-nowrap"
            >
              Calculators ▾
            </button>
            {openDropdown === "calculators" && (
              <div className="fixed left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-80 sm:absolute bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg z-50 text-[13px] sm:text-[16px]">

                <div className="flex flex-col p-2 text-gray-700 dark:text-gray-300">
                  <Link onClick={close} href="/2D-solver?tab=2d" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">2D Resultant Force Calculator</Link>
                  <Link onClick={close} href="/2D-solver?tab=3d&subtab=coordinate" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">3D Resultant: Cartesian Vector</Link>
                  <Link onClick={close} href="/2D-solver?tab=3d&subtab=angles" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">3D Resultant: Azimuth-Elevation</Link>
                  <Link onClick={close} href="/Equilibrium?tab=concurrent" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Concurrent: Unknown Forces & Angles Calculator</Link>
                  <Link onClick={close} href="/Equilibrium?tab=nonconcurrent" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Non-Concurrent: Beam Analysis</Link>
                  <Link onClick={close} href="/Structures" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Truss Analysis Calculator</Link>
                  <Link onClick={close} href="/Distributed-Loads" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Moment of Inertia Calculator</Link>
                </div>
              </div>
            )}
          </div>

          <span className="text-gray-400 dark:text-gray-500 px-0.5">|</span>

          {/* Modules Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggle("modules")}
              className="hover:text-[#1848a0] dark:hover:text-blue-400 whitespace-nowrap"
            >
              Modules ▾
            </button>
            {openDropdown === "modules" && (
              <div className="fixed left-1/2 -translate-x-1/2 mt-2 w-72 sm:absolute bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg z-50 text-[13px] sm:text-[16px]">

                <div className="flex flex-col p-2 text-gray-700 dark:text-gray-300">
                  <Link onClick={close} href="/modules/FBD" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 1: Free Body Diagram</Link>
                  <Link onClick={close} href="/modules/2D-Resultant" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 2: 2D Resultant</Link>
                  <Link onClick={close} href="/modules/3D-Resultant" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 3: 3D Resultant</Link>
                  <Link onClick={close} href="/modules/2D-Equilibrium" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 4: 2D Equilibrium</Link>
                  <Link onClick={close} href="/modules/3D-Equilibrium" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 5: 3D Equilibrium</Link>
                  <Link onClick={close} href="/modules/Truss" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 6: Truss Joint Method</Link>
                  <Link onClick={close} href="/modules/MOIcentroidal" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 7: MOI Centroidal Axis</Link>
                  <Link onClick={close} href="/modules/MOIcustom" className="hover:text-[#1848a0] dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Module 8: MOI Custom Axis</Link>
                </div>
              </div>
            )}
          </div>

          <span className="text-gray-400 dark:text-gray-500 px-0.5">|</span>
          <Link href="/about" className="hover:text-[#1848a0] dark:hover:text-blue-400 whitespace-nowrap">About</Link>
        </nav>

      </div>
    </header>
  );
}