import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

export default function InfoPage() {
  return (
    <main className="h-screen overflow-y-scroll snap-y snap-mandatory bg-gray-50">
      <Header />

      {/* About Section */}
      <section className="h-screen flex items-center justify-center snap-start px-6 py-12">
        <div className="max-w-3xl text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-6">About StatiCalcs</h1>
          <p className="text-[18px] text-gray-700 leading-relaxed mb-6">
            <span className="font-bold">StatiCalc</span> is an interactive tool that helps
            engineering students practice statics problem-solving more effectively.
          </p>
          <p className="text-[18px] text-gray-700 leading-relaxed">
            Designed for MSU-Gensan students, it supplements classroom learning
            and encourages deeper understanding of statics principles.
          </p>
        </div>
      </section>

      {/* References Section */}
      <section className="h-screen flex items-center justify-center snap-start px-6 py-12">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            References <span className="text-gray-500 text-[16px] font-normal">(temporary text)</span>
          </h1>
          <ul className="space-y-4 text-[18px] text-gray-700 leading-relaxed">
            <li>Meriam, J. L., & Kraige, L. G. (2002). <em>Engineering mechanics: Statics</em> (5th ed.).</li>
            <li>Hibbeler, R. C. (2016). <em>Engineering mechanics: Statics</em> (14th ed.).</li>
            <li>Beer, F. P., et al. (2016). <em>Vector mechanics for engineers: Statics</em> (11th ed.).</li>
            <li>MSU-Gensan, Dept. of Civil Engineering. <em>Lecture notes on statics of rigid bodies.</em></li>
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  );
}
