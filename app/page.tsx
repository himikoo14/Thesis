import Link from "next/link";
import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

export default function HomePage() {
  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col relative">
      <div />
      <Header />

      {/* Landing Page */}
<section className="hidden sm:flex flex-col items-center text-center py-12 bg-gray-50 dark:bg-gray-900 flex-grow">
        <h1 className="text-[20px] md:text-[80px] font-bold mb-2 text-black dark:text-white">
          Stati
          <span className="text-[#1848a0] dark:text-blue-400">
            Calcs
          </span>
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-12 text-[18px]">
          Interactive calculators for learning and solving Statics of Rigid Bodies. ow
        </p>

        {/* Chapter List */}
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-4 items-center">

            {/* Chapter 1 */}
            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 1: Modules to Statics
            </p>
            <Link href="/Introduction" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Statics Modules
            </Link>

            {/* Chapter 2 */}
            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 2: Force Systems
            </p>
            <Link href="/2D-solver" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Resultant Force Calculator
            </Link>

            {/* Chapter 3 */}
            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 3: Equilibrium
            </p>
            <Link href="/Equilibrium" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Equilibrium Calculator
            </Link>

            {/* Chapter 4 */}
            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 4: Structures
            </p>
            <Link href="/Structures" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Truss Calculator
            </Link>

            {/* Chapter 5 */}
            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 5: Distributed Loads
            </p>
            <Link href="/Distributed-Loads" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Structures Calculator
            </Link>

          </div>
        </div>
      </section>

{/* Landing Page for small screens - below 400px only */}
<section className="flex sm:hidden flex-col items-center text-center py-12 bg-gray-50 dark:bg-gray-900 flex-grow">
  <h1 className="text-[50px] font-bold mb-2 text-black dark:text-white">
    Stati
    <span className="text-[#1848a0] dark:text-blue-400">
      Calcs
    </span>
  </h1>

  <p className="text-gray-600 dark:text-gray-300 mb-12 text-[13px]">
    Interactive calculators for learning and solving <br /> Statics of Rigid Bodies.
  </p>

  <div className="w-full max-w-2xl px-15">
    <div className="flex flex-col">

      <div className="flex items-center justify-center gap-2 py-3">
        <p className="text-left text-black dark:text-white text-[13px] font-bold w-[140px] leading-snug">
          Chapter 1: <br /> Modules to Statics
        </p>
        <Link href="/Introduction" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
          Statics Modules
        </Link>
      </div>

      <div className="flex items-center justify-center gap-2 py-3">
        <p className="text-left text-black dark:text-white text-[13px] font-bold w-[140px] leading-snug">
          Chapter 2: <br /> Force Systems
        </p>
        <Link href="/2D-solver" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
          Resultant Force <br />Calculator
        </Link>
      </div>

      <div className="flex items-center justify-center gap-2 py-3">
        <p className="text-left text-black dark:text-white text-[13px] font-bold w-[140px] leading-snug">
          Chapter 3: <br /> Equilibrium
        </p>
        <Link href="/Equilibrium" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
          Equilibrium Calculator
        </Link>
      </div>

      <div className="flex items-center justify-center gap-2 py-3">
        <p className="text-left text-black dark:text-white text-[13px] font-bold w-[140px] leading-snug">
          Chapter 4: <br /> Structures
        </p>
        <Link href="/Structures" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
          Truss Calculator
        </Link>
      </div>

      <div className="flex items-center justify-center gap-2 py-3">
        <p className="text-left text-black dark:text-white text-[13px] font-bold w-[140px] leading-snug">
          Chapter 5: <br /> Distributed Loads
        </p>
        <Link href="/Distributed-Loads" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
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