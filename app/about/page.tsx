import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="max-w-3xl text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-6">
            About{" "}
            <span className="text-[#1848a0]">StatiCalcs</span>
          </h1>

          <p className="text-[18px] text-gray-700 leading-relaxed mb-6">
            <span className="font-bold">
              Stati<span className="text-[#1848a0]">Calcs</span>
            </span>{" "}
            is an interactive web-based learning tool created to support
            engineering students in their study of Statics of Rigid Bodies. It
            combines essential concepts with integrated calculators to help
            users practice problem-solving more effectively.
          </p>

<p className="text-[18px] text-gray-700 leading-relaxed">
  Designed specifically for engineering students of MSU-Gensan,{" "}
  <span className="font-bold">
    Stati<span className="text-[#1848a0]">Calcs</span>
  </span>{" "}
  serves as a supplementary academic tool that enhances classroom learning,
  encourages independent study, and fosters a deeper understanding of
  statics principles.
</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
