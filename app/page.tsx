import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <main className="bg-gray-50 min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center py-12 bg-gray-50 flex-grow">
        <h1 className="text-[20px] md:text-[50px] font-bold mb-2 text-black">
          Stati
          <span className="text-[#1848a0]">
            Calcs
          </span>
        </h1>
        <p className="text-gray-600 mb-12 text-[18px]">
          Interactive calculators for learning and solving Statics of Rigid Bodies.
        </p>

        {/* Chapter List */}
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-4 items-center">

            {/* Chapter 1 */}
            <p className="text-left text-black text-[18px]">Chapter 1: Introduction to Statics</p>
            <Link
              href="/Introduction"
              className="bg-[#1848a0] text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] transition text-[18px]"
            >
              Introduction
            </Link>

            {/* Chapter 2 */}
            <p className="text-left text-black text-[18px]">Chapter 2: Force Systems</p>
            <Link
              href="/2D-solver"
              className="bg-[#1848a0] text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] transition text-[18px]"
            >
              2D Resultant Solver
            </Link>

            {/* Chapter 3 */}
            <p className="text-left text-black text-[18px]">Chapter 3: Equilibrium</p>
            <Link
              href="/Equilibrium"
              className="bg-[#1848a0] text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] transition text-[18px]"
            >
              Equilibrium Solver
            </Link>

            {/* Chapter 4 */}
            <p className="text-left text-black text-[18px]">Chapter 4: Structures</p>
            <Link
              href="/Structures"
              className="bg-[#1848a0] text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] transition text-[18px]"
            >
              Truss Calculator
            </Link>

            {/* Chapter 5 */}
            <p className="text-left text-black text-[18px]">Chapter 5: Distributed Loads</p>
            <Link
              href="/Distributed-Loads"
              className="bg-[#1848a0] text-white px-6 py-3 rounded-md shadow hover:bg-[#163d8a] transition text-[18px]"
            >
              Structures Solver
            </Link>

            {/* Chapter 6 */}
            <p className="text-left text-black text-[18px]">Chapter 6: Friction</p>
            <button className="border-2 border-[#1848a0] text-[#1848a0] px-6 py-3 rounded-md hover:bg-[#163d8a] hover:text-white transition text-[18px]">
              Coming Soon
            </button>

            {/* Chapter 7 */}
            <p className="text-left text-black text-[18px]">Chapter 7: Virtual Work</p>
            <button className="border-2 border-[#1848a0] text-[#1848a0] px-6 py-3 rounded-md hover:bg-[#163d8a] hover:text-white transition text-[18px]">
              Coming Soon
            </button>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
