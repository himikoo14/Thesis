export default function Solver3D() {
  return (
    <main className="bg-gray-50 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-black rounded-full" />
            <span className="font-bold text-xl text-black">Statix Calculator</span>
          </div>

          <nav className="flex items-center space-x-6 text-gray-700">
            <a href="/" className="hover:text-blue-600">Home</a>
            <span>|</span>
            <a href="/2D-solver" className="hover:text-blue-600">2D Solver</a>
            <span>|</span>
            <a href="/3D-solver" className="hover:text-blue-600 font-semibold">3D Solver</a>
            <span>|</span>
            <a href="/about" className="hover:text-blue-600">About</a>
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <section className="flex flex-col items-center text-center py-12 flex-grow">
        <h1 className="text-3xl md:text-4xl font-bold mb-10 text-black">
          3D Resultant Force Calculator
        </h1>

        <div className="max-w-3xl w-full space-y-6 text-left">
          {/* Force Setup */}
          <div className="bg-white shadow rounded-xl p-6">
            <h2 className="text-lg font-bold mb-2 text-black">Force setup</h2>
            <p className="text-gray-600 text-sm mb-4">
              Enter the number of forces, their magnitudes, and directions. Angles are measured from the positive x-axis.
            </p>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Number of forces"
                className="w-full border rounded-md px-3 py-2"
              />
              <input
                type="text"
                placeholder="Force 1"
                className="w-full border rounded-md px-3 py-2"
              />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" placeholder="θx" className="border rounded-md px-3 py-2" />
                <input type="number" placeholder="θy" className="border rounded-md px-3 py-2" />
                <input type="number" placeholder="θz" className="border rounded-md px-3 py-2" />
              </div>
            </div>
          </div>

          {/* Free Body Diagram */}
          <div className="bg-white shadow rounded-xl p-6">
            <h2 className="text-lg font-bold mb-2 text-black">Free Body Diagram (FBD)</h2>
            <div className="border border-dashed border-gray-400 rounded-md h-40 flex items-center justify-center text-gray-500">
              Diagram Placeholder
            </div>
          </div>

          {/* Resultant Force */}
          <div className="bg-white shadow rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 text-black">Resultant Force</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Horizontal component" className="w-full border rounded-md px-3 py-2" />
              <input type="text" placeholder="Vertical component" className="w-full border rounded-md px-3 py-2" />
              <input type="text" placeholder="Magnitude of resultant force" className="w-full border rounded-md px-3 py-2" />
              <input type="text" placeholder="Direction of resultant force" className="w-full border rounded-md px-3 py-2" />
            </div>
          </div>

          {/* Solution */}
          <div className="bg-white shadow rounded-xl p-6">
            <h2 className="text-lg font-bold mb-2 text-black">Solution</h2>
            <div className="text-gray-600 text-sm">
              Step-by-step solution will appear here...
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-gray-700">
          <a href="/about" className="hover:text-blue-600">About</a> |{" "}
          <a href="/references" className="hover:text-blue-600">References</a> |{" "}
          <a href="/contact" className="hover:text-blue-600">Contact</a> |{" "}
          <a href="/developer" className="hover:text-blue-600">Developer</a>
        </div>
      </footer>
    </main>
  );
}
