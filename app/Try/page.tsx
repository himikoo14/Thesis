import Link from "next/link";
import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

export default function HomePage() {
  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col relative">
      <div />
      <Header />

      {/* Landing Page */}
      <section className="flex flex-col items-center text-center py-12 bg-gray-50 dark:bg-gray-900 flex-grow">

        <h1 className="text-[20px] xs:text-[80px] font-bold mb-2 text-black dark:text-white">
          Stati
          <span className="text-[#1848a0] dark:text-blue-400">
            Calcs
          </span>
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-12 text-[18px]">
          Interactive calculators for learning and solving Statics of Rigid Bodies.
        </p>

        {/* Chapter List */}
        <div className="w-full max-w-2xl px-4 xs:px-0">

          {/* BELOW 400px — flex row layout */}
          <div className="flex flex-col xs:hidden">

            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <p className="text-black dark:text-white text-[13px] font-bold max-w-[140px] leading-snug">
                Chapter 1: Modules to Statics
              </p>
              <Link href="/Introduction" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
                Statics Modules
              </Link>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <p className="text-black dark:text-white text-[13px] font-bold max-w-[140px] leading-snug">
                Chapter 2: Force Systems
              </p>
              <Link href="/2D-solver" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
                Resultant Force Calculator
              </Link>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <p className="text-black dark:text-white text-[13px] font-bold max-w-[140px] leading-snug">
                Chapter 3: Equilibrium
              </p>
              <Link href="/Equilibrium" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
                Equilibrium Calculator
              </Link>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <p className="text-black dark:text-white text-[13px] font-bold max-w-[140px] leading-snug">
                Chapter 4: Structures
              </p>
              <Link href="/Structures" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
                Truss Calculator
              </Link>
            </div>

            <div className="flex items-center justify-between py-3">
              <p className="text-black dark:text-white text-[13px] font-bold max-w-[140px] leading-snug">
                Chapter 5: Distributed Loads
              </p>
              <Link href="/Distributed-Loads" className="bg-[#1848a0] dark:bg-blue-600 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
                Structures Calculator
              </Link>
            </div>

          </div>

          {/* 400px AND ABOVE — original grid layout */}
          <div className="hidden xs:grid grid-cols-2 gap-4 items-center">

            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 1: Modules to Statics
            </p>
            <Link href="/Introduction" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Statics Modules
            </Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 2: Force Systems
            </p>
            <Link href="/2D-solver" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Resultant Force Calculator
            </Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 3: Equilibrium
            </p>
            <Link href="/Equilibrium" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Equilibrium Calculator
            </Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 4: Structures
            </p>
            <Link href="/Structures" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Truss Calculator
            </Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">
              Chapter 5: Distributed Loads
            </p>
            <Link href="/Distributed-Loads" className="bg-[#1848a0] dark:bg-blue-600 text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] dark:hover:bg-blue-700 transition text-[18px]">
              Structures Calculator
            </Link>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}