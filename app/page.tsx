import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <main className="bg-gray-100 min-h-screen flex flex-col">
      < Header />
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center py-16 bg-gray-100 flex-grow">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-black">
          Statics of Rigid Bodies Calculator
        </h1>
        <p className="text-gray-600 mb-10">
          Solve resultants of concurrent force systems in 2D and 3D with ease
        </p>

        {/* Solver Buttons */}
        <div className="flex flex-col gap-4">
          <Link
            href="/2D-solver"
            className="bg-blue-700 text-white px-6 py-3 rounded-md shadow-lg hover:translate-y-1 transition font-semibold"
          >
            2D Resultant Solver
          </Link>
          <Link
            href="/3D-solver"
            className="bg-blue-700 text-white px-6 py-3 rounded-md shadow-lg hover:translate-y-1 transition font-semibold"
          >
            3D Resultant Solver
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h2 className="text-xl font-semibold mb-4 text-black">About the calculator</h2>
        <p className="text-gray-700">
          This website is an academic tool designed to assist engineering students in
          solving statics problems. It provides calculators for both 2D and 3D concurrent
          force systems, allowing users to input forces and instantly compute the resultant
          magnitude, direction, and components. With this tool, learning becomes more
          interactive and efficient.
        </p>
      </section>
      < Footer />
    </main>
  );
}
