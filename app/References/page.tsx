import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

export default function ReferencesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            References{" "}
            <span className="text-gray-500 text-[16px] font-normal">
              (temporary text)
            </span>
          </h1>

          <ul className="space-y-4 text-[18px] text-gray-700 leading-relaxed">
            <li>
              Meriam, J. L., & Kraige, L. G. (2002).{" "}
              <em>Engineering mechanics: Statics</em> (5th ed.). John Wiley & Sons.
            </li>
            <li>
              Hibbeler, R. C. (2016).{" "}
              <em>Engineering mechanics: Statics</em> (14th ed.). Pearson Education.
            </li>
            <li>
              Beer, F. P., Johnston, E. R., Mazurek, D. F., Eisenberg, E. R., & Cornwell, P. J. (2016).{" "}
              <em>Vector mechanics for engineers: Statics</em> (11th ed.). McGraw-Hill Education.
            </li>
            <li>
              Mindanao State University – General Santos, Department of Civil Engineering. (n.d.).{" "}
              <em>Lecture notes and handouts on statics of rigid bodies.</em> Unpublished instructional materials.
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
