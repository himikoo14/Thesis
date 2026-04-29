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
        
        <h1 className="text-[20px] md:text-[80px] font-bold mb-2 text-black dark:text-white">
          Stati
          <span className="text-[#1848a0] dark:text-blue-400">
            Calcs
          </span>
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-12 text-[18px]">
          Interactive calculators for learning and solving Statics of Rigid Bodies.
        </p>

        {/* Chapter List */}
        <div className="w-full max-w-2xl">

        </div>
      </section>

      <Footer />
    </main>
  );
}