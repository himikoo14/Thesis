import Footer from "<Ian>/components/Footer";
import Header from "<Ian>/components/Header";

export default function DeveloperPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header />

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <h1 className="text-[50px] font-bold text-[#1848a0]">Equilibrium Calculator</h1>
        <p className="text-[30px] text-gray-600 mt-4">
          This page is under construction.
        </p>
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
