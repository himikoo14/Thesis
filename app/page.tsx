import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col relative">
      <div />
      <Header />

      {/* Landing Page */}
      <section className="flex flex-col items-center justify-evenly text-center bg-gray-50 dark:bg-gray-900 flex-grow px-4">

        <div>
          <h1 className="text-[36px] sm:text-[56px] md:text-[80px] font-bold mb-1 text-black dark:text-white leading-none">
            Stati
            <span className="text-[#1848a0] dark:text-blue-400">
              Calcs
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-[12px] sm:text-[15px] md:text-[18px] px-2 max-w-sm mx-auto">
            Interactive calculators for learning and solving Statics of Rigid Bodies.
          </p>
        </div>

        {/* Chapter List */}
        <div className="w-full max-w-xs">
          <div className="flex flex-col gap-2">

            {/* Chapter 1 */}
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight">
                Chapter 1: Modules to Statics
              </p>
              <Link href="/Introduction" className="w-full bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
                Statics Modules
              </Link>
            </div>

            {/* Chapter 2 */}
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight">
                Chapter 2: Force Systems
              </p>
              <Link href="/2D-solver" className="w-full bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
                Resultant Force Calculator
              </Link>
            </div>

            {/* Chapter 3 */}
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight">
                Chapter 3: Equilibrium
              </p>
              <Link href="/Equilibrium" className="w-full bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
                Equilibrium Calculator
              </Link>
            </div>

            {/* Chapter 4 */}
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight">
                Chapter 4: Structures
              </p>
              <Link href="/Structures" className="w-full bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
                Truss Calculator
              </Link>
            </div>

            {/* Chapter 5 */}
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-black dark:text-white text-[11px] sm:text-[14px] md:text-[18px] font-bold leading-tight">
                Chapter 5: Distributed Loads
              </p>
              <Link href="/Distributed-Loads" className="w-full bg-[#1848a0] dark:bg-blue-600 text-white px-2 py-1.5 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[10px] sm:text-[13px] md:text-[18px] text-center leading-tight">
                Structures Calculator
              </Link>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}