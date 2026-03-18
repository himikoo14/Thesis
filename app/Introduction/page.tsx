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
          Modules for learning and solving Statics of Rigid Bodies.
        </p>

        {/* Module List */}
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-4 items-center">

            {/* Module 1 */}
            <p className="text-left text-black text-[18px] font-bold font-bold">Introduction to Statics</p>
            <Link
              href="/modules/Introduction"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Module 1
            </Link>

            {/* Module 2 */}
            <p className="text-left text-black text-[18px] font-bold font-bold">Free Body Diagram</p>
            <Link
              href="/modules/FBD"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Module 2
            </Link>

            {/* Module 3 */}
            <p className="text-left text-black text-[18px] font-bold font-bold">2D Resultant</p>
            <Link
              href="/modules/Resultant"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Module 3
            </Link>

            {/* Module 4 */}
            <p className="text-left text-black text-[18px] font-bold font-bold font-bold">3D Resultant</p>
            <Link
              href="/modules/Equilibrium"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Module 4
            </Link>

            {/* Module 5 */}
            <p className="text-left text-black text-[18px] font-bold font-bold font-bold">How to Solve Truss Using Method of Joints</p>
            <Link
              href="/modules/Truss"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Module 5
            </Link>

            {/* Module 6 */}
            <p className="text-left text-black text-[18px] font-bold font-bold font-bold">How to Solve MOI Centroidal Axis Problems</p>
            <Link
              href="/modules/MOIcentroidal"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Module 6
            </Link>

            {/* Module 7 */}
            <p className="text-left text-black text-[18px] font-bold font-bold font-bold">How to Solve MOI Custom Axis Problems</p>
            <Link
              href="/modules/MOIcustom"
              className="bg-[#008409] text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] transition text-[18px]"
            >
              Module 7
            </Link>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
