import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col relative">
      <div />
      <Header />

      {/* Landing Page */}
      <section className="flex flex-col items-center text-center py-4 bg-gray-50 dark:bg-gray-900 flex-grow px-3">

        <h1 className="text-[36px] sm:text-[56px] md:text-[80px] font-bold mb-1 text-black dark:text-white leading-none">
          Stati
          <span className="text-[#1848a0] dark:text-blue-400">
            Calcs
          </span>
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-4 text-[12px] sm:text-[15px] md:text-[18px] px-2 max-w-sm">
          Interactive calculators for learning and solving Statics of Rigid Bodies.
        </p>

        {/* Chapter List */}
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-x-2 gap-y-2 items-center">

            {/* Chapter 1 */}
            <p className="text-left text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight pr-1">
              Chapter 1: Modules to Statics
            </p>
            <Link href="/Introduction" className="bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
              Statics Modules
            </Link>

            {/* Chapter 2 */}
            <p className="text-left text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight pr-1">
              Chapter 2: Force Systems
            </p>
            <Link href="/2D-solver" className="bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
              Resultant Force Calculator
            </Link>

            {/* Chapter 3 */}
            <p className="text-left text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight pr-1">
              Chapter 3: Equilibrium
            </p>
            <Link href="/Equilibrium" className="bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
              Equilibrium Calculator
            </Link>

            {/* Chapter 4 */}
            <p className="text-left text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight pr-1">
              Chapter 4: Structures
            </p>
            <Link href="/Structures" className="bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
              Truss Calculator
            </Link>

            {/* Chapter 5 */}
            <p className="text-left text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight pr-1">
              Chapter 5: Distributed Loads
            </p>
            <Link href="/Distributed-Loads" className="bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
              Structures Calculator
            </Link>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}