import Link from "next/link";
import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

export default function HomePage() {
  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
      <Header />

      {/* Landing Page - large screens */}
      <section className="hidden sm:flex flex-col items-center text-center py-12 bg-gray-50 dark:bg-gray-900 flex-grow">
        <h1 className="text-[20px] md:text-[80px] font-bold mb-2 text-black dark:text-white">
          Stati
          <span className="text-[#008409] dark:text-green-400">
            Calcs
          </span>
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-12 text-[18px]">
          Modules for learning and solving Statics of Rigid Bodies.
        </p>

        {/* Module List */}
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 gap-4 items-center">

            <p className="text-left text-black dark:text-white text-[18px] font-bold">Module 1: Free Body Diagram</p>
            <Link href="/modules/FBD" className="bg-[#008409] dark:bg-green-700 text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] dark:hover:bg-green-800 transition text-[18px]">Module 1</Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">Module 2: 2D Resultant</p>
            <Link href="/modules/2D-Resultant" className="bg-[#008409] dark:bg-green-700 text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] dark:hover:bg-green-800 transition text-[18px]">Module 2</Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">Module 3: 3D Resultant</p>
            <Link href="/modules/3D-Resultant" className="bg-[#008409] dark:bg-green-700 text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] dark:hover:bg-green-800 transition text-[18px]">Module 3</Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">Module 4: 2D Equilibrium</p>
            <Link href="/modules/2D-Equilibrium" className="bg-[#008409] dark:bg-green-700 text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] dark:hover:bg-green-800 transition text-[18px]">Module 4</Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">Module 5: 3D Equilibrium</p>
            <Link href="/modules/3D-Equilibrium" className="bg-[#008409] dark:bg-green-700 text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] dark:hover:bg-green-800 transition text-[18px]">Module 5</Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">Module 6: Truss Joint Method</p>
            <Link href="/modules/Truss" className="bg-[#008409] dark:bg-green-700 text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] dark:hover:bg-green-800 transition text-[18px]">Module 6</Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">Module 7: Moment of Inertia about Centroidal Axes</p>
            <Link href="/modules/MOIcentroidal" className="bg-[#008409] dark:bg-green-700 text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] dark:hover:bg-green-800 transition text-[18px]">Module 7</Link>

            <p className="text-left text-black dark:text-white text-[18px] font-bold">Module 8: Moment of Inertia about Custom Axes</p>
            <Link href="/modules/MOIcustom" className="bg-[#008409] dark:bg-green-700 text-white px-6 py-3 rounded-md shadow hover:bg-[#15711b] dark:hover:bg-green-800 transition text-[18px]">Module 8</Link>

          </div>
        </div>
      </section>

      {/* Landing Page - small screens */}
      <section className="flex sm:hidden flex-col items-center text-center py-12 bg-gray-50 dark:bg-gray-900 flex-grow px-4">
        <h1 className="text-[50px] font-bold mb-2 text-black dark:text-white">
          Stati<span className="text-[#008409] dark:text-green-400">Calcs</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-12 text-[13px]">
          Modules for learning and solving <br /> Statics of Rigid Bodies.
        </p>

  <div className="w-full max-w-2xl px-9">          
    {(
            [
              { label: ["Module 1:", "Free Body Diagram"],             href: "/modules/FBD",            short: "Module 1" },
              { label: ["Module 2:", "2D Resultant"],                  href: "/modules/2D-Resultant",   short: "Module 2" },
              { label: ["Module 3:", "3D Resultant"],                  href: "/modules/3D-Resultant",   short: "Module 3" },
              { label: ["Module 4:", "2D Equilibrium"],                href: "/modules/2D-Equilibrium", short: "Module 4" },
              { label: ["Module 5:", "3D Equilibrium"],                href: "/modules/3D-Equilibrium", short: "Module 5" },
              { label: ["Module 6:", "Truss Joint Method"],            href: "/modules/Truss",          short: "Module 6" },
              { label: ["Module 7:", "MOI Centroidal Axes"],           href: "/modules/MOIcentroidal",  short: "Module 7" },
              { label: ["Module 8:", "MOI Custom Axes"],               href: "/modules/MOIcustom",      short: "Module 8" },
            ] as { label: [string, string]; href: string; short: string }[]
          ).map(({ label, href, short }) => (
            <div key={href} className="flex items-center justify-center gap-2 py-3">
              <p className="text-left text-black dark:text-white text-[13px] font-bold w-[140px] leading-snug">
                {label[0]}<br />{label[1]}
              </p>
              <Link href={href} className="bg-[#008409] dark:bg-green-700 text-white py-2 rounded-md text-[12px] font-medium text-center w-40">
                {short}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}