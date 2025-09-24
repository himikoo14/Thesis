import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

export default function DeveloperPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#1848a0]">
            Developer Page
          </h1>
          <p className="text-gray-600 mt-4">
            This page is under construction.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
