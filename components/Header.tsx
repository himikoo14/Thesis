"use client";

import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-white shadow relative z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Logo + Title */}
        <Link
          href="/"
          className="flex items-center gap-3 justify-center sm:justify-start hover:text-[#1848a0] transition"
        >
          <Image
            src="/Logo.png"
            alt="Logo"
            width={45}
            height={45}
            className="object-contain"
          />
          <span className="font-bold text-[30px] text-black">
            Statics Calculator
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center space-x-6 text-gray-700 relative text-[18px]">
          <Link href="/" className="hover:text-[#1848a0]">Home</Link>
          <span>|</span>

          {/* Topics Dropdown */}
          <div className="group relative">
            <button className="hover:text-[#1848a0]">Topics ▾</button>
            <div
              className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white border rounded-lg shadow-lg 
                opacity-0 group-hover:opacity-100 invisible group-hover:visible transition text-[18px]"
            >
              <div className="flex flex-col p-2 text-gray-700">
                <Link href="/Introduction" className="hover:text-[#1848a0] p-2">
                  Chapter 1: Introduction to Statics
                </Link>
                <Link href="/2D-solver" className="hover:text-[#1848a0] p-2">
                  Chapter 2: Force Systems
                </Link>
                <Link href="/Equilibrium" className="hover:text-[#1848a0] p-2">
                  Chapter 3: Equilibrium
                </Link>
                <Link href="/Structures" className="hover:text-[#1848a0] p-2">
                  Chapter 4: Structures
                </Link>
                <Link href="/Distributed-Loads" className="hover:text-[#1848a0] p-2">
                  Chapter 5: Distributed Loads
                </Link>
              </div>
            </div>
          </div>

          <span>|</span>

          {/* Module Dropdown */}
          <div className="group relative">
            <button className="hover:text-[#1848a0]">Modules ▾</button>
            <div
              className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white border rounded-lg shadow-lg 
                opacity-0 group-hover:opacity-100 invisible group-hover:visible transition text-[18px]"
            >
              <div className="flex flex-col p-2 text-gray-700">
                <Link href="/modules/Introduction" className="hover:text-[#1848a0] p-2">
                  Module 1: Introduction to Statics
                </Link>
                <Link href="/modules/FBD" className="hover:text-[#1848a0] p-2">
                  Module 2: Free Body Diagram
                </Link>
                <Link href="/modules/2D-Resultant" className="hover:text-[#1848a0] p-2">
                  Module 3: 2D Resultant
                </Link>
                <Link href="/modules/3D-Resultant" className="hover:text-[#1848a0] p-2">
                  Module 4: 3D Resultant
                </Link>
                <Link href="/modules/2D-Equilibrium" className="hover:text-[#1848a0] p-2">
                  Module 5: 2D Equilibrium
                </Link>
                <Link href="/modules/3D-Equilibrium" className="hover:text-[#1848a0] p-2">
                  Module 6: 3D Equilibrium
                </Link>
                <Link href="/modules/Truss" className="hover:text-[#1848a0] p-2">
                  Module 7: Truss Joint Method
                </Link>
                <Link href="/modules/MOIcentroidal" className="hover:text-[#1848a0] p-2">
                  Module 8: MOI Centroidal Axis
                </Link>
                <Link href="/modules/MOIcustom" className="hover:text-[#1848a0] p-2">
                  Module 9: MOI Custom Axis
                </Link>
              </div>
            </div>
          </div>

          <span>|</span>
          <Link href="/about" className="hover:text-[#1848a0]">About</Link>
        </nav>

        {/* Mobile Navigation */}
        <nav className="flex flex-col sm:hidden items-center gap-2 text-gray-700 text-[18px]">
          <Link href="/" className="hover:text-[#1848a0]">Home</Link>

          <details className="w-full">
            <summary className="cursor-pointer text-center hover:text-[#1848a0]">
              Modules
            </summary>
            <div className="flex flex-col mt-2 gap-2">
              <Link href="/Introduction" className="hover:text-[#1848a0] p-2">
                Module 1: Introduction to Statics
              </Link>
              <Link href="/2D-solver" className="hover:text-[#1848a0] p-2">
                Module 2: Force Systems
              </Link>
              <Link href="/Equilibrium" className="hover:text-[#1848a0] p-2">
                Module 3: Equilibrium
              </Link>
              <Link href="/Structures" className="hover:text-[#1848a0] p-2">
                Module 4: Structures
              </Link>
              <Link href="/Distributed-Loads" className="hover:text-[#1848a0] p-2">
                Module 5: Distributed Loads
              </Link>
            </div>
          </details>

          <Link href="/about" className="hover:text-[#1848a0]">About</Link>
        </nav>
      </div>
    </header>
  );
}
