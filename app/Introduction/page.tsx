import Link from "next/link";
import Header from "<Ian>/components/Header"; 
import Footer from "<Ian>/components/Footer";

export default function HomePage() {
  return (
    <main className="bg-gray-50 min-h-screen flex flex-col">
      <Header />

      {/* Landing Page*/}
      <section className="flex flex-col items-center text-center py-12 bg-gray-50 flex-grow">
        <h1 className="text-[20px] md:text-[80px] font-bold mb-2 text-black">
          Stati
          <span className="text-[#008409]">
            Calcs
          </span>
        </h1>
        <p className="text-gray-600 mb-12 text-[18px]">
          Interactive calculators for learning and solving Statics of Rigid Bodies.
        </p>

        {/* Module List */}
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-4 items-center">

            {/* Module 1 */}
            <p className="text-left text-black text-[18px] font-bold font-bold">Module 1: Introduction to Statics</p>
            <Link
              href="/Introduction"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Module 1
            </Link>

            {/* Module 2 */}
            <p className="text-left text-black text-[18px] font-bold font-bold">Module 2: Force Systems</p>
            <Link
              href="/2D-solver"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Resultant Force  Calculator
            </Link>

            {/* Module 3 */}
            <p className="text-left text-black text-[18px] font-bold font-bold">Module 3: Equilibrium</p>
            <Link
              href="/Equilibrium"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Equilibrium Calculator
            </Link>

            {/* Module 4 */}
            <p className="text-left text-black text-[18px] font-bold font-bold font-bold">Module 4: Structures</p>
            <Link
              href="/Structures"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Truss Calculator
            </Link>

            {/* Module 5 */}
            <p className="text-left text-black text-[18px] font-bold font-bold font-bold">Module 5: Distributed Loads</p>
            <Link
              href="/Distributed-Loads"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Structures Calculator
            </Link>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
