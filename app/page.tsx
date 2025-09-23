import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <main className="bg-gray-50 min-h-screen flex flex-col">
      <Header />a

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center py-12 bg-gray-50 flex-grow">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-black">
          StatiCalcs
        </h1>
        <p className="text-gray-600 mb-12">
          Interactive calculators for learning and solving Statics of Rigid Bodies.
        </p>

        {/* Chapter List */}
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-4 items-center">

            {/* Chapter 1 */}
            <p className="text-left text-black">
              Chapter 1: Introduction to Statics
            </p>
            <Link
              href="/Introduction"
              className="bg-blue-700 text-white px-4 py-2 rounded-md shadow hover:opacity-90 transition"
            >
              Introduction
            </Link>

            {/* Chapter 2 */}
            <p className="text-left text-black">
              Chapter 2: Force Systems
            </p>
            <Link
              href="/2D-solver"
              className="bg-blue-700 text-white px-4 py-2 rounded-md shadow hover:opacity-90 transition"
            >
              2D Resultant Solver
            </Link>

            {/* Chapter 3 */}
            <p className="text-left text-black">
              Chapter 3: Equilibrium
            </p>
            <Link
              href="/Equilibrium"
              className="bg-blue-700 text-white px-4 py-2 rounded-md shadow hover:opacity-90 transition"
            >
              Equilibrium Solver
            </Link>


            {/* Chapter 4 */}
            <p className="text-left text-black">
              Chapter 4: Structures
            </p>
            <Link
              href="/Structures"
              className="bg-blue-700 text-white px-4 py-2 rounded-md shadow hover:opacity-90 transition"
            >
              Truss Calculator
            </Link>

            {/* Chapter 5 */}
            <p className="text-left text-black">
              Chapter 5: Distributed Loads
            </p>
            <Link
              href="/Distributed-Loads"
              className="bg-blue-700 text-white px-4 py-2 rounded-md shadow hover:opacity-90 transition"
            >
              Structures Solver
            </Link>

            {/* Chapter 6 */}
            <p className="text-left text-black">
              Chapter 6: Friction
            </p>
            <button className="border-2 border-blue-700 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-700 hover:text-white transition">
              Coming Soon
            </button>

            {/* Chapter 7 */}
            <p className="text-left text-black">
              Chapter 7: Virtual Work
            </p>
            <button className="border-2 border-blue-700 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-700 hover:text-white transition">
              Coming Soon
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
