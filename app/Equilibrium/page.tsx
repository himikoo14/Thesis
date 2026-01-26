"use client";

import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

export default function EquilibriumPage() {
  const input =
    "w-16 rounded-md border border-gray-300 p-1 text-center text-[16px]";
  const redBtn =
    "bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600";
  const greenBtn =
    "bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700";

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10">
        {/* Title */}
        <h1 className="text-3xl font-bold mb-8">
          Moment of Inertia for Composite Shapes Calculator
        </h1>

        {/* Drawing Area */}
        <div className="bg-white border rounded-xl h-[280px] mb-6" />

        <p className="text-sm text-gray-700 mb-6">
          Note: The most lower left point of the composite shape should be at
          (0,0).
        </p>

        {/* Input Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Nodes */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Nodes</h3>

            {["A", "B", "C"].map((j) => (
              <div key={j} className="flex items-center gap-2 mb-2">
                <span className="w-16">Joint {j}</span>
                <input placeholder="x" className={input} />
                <input placeholder="y" className={input} />
                <button className={redBtn}>✕</button>
              </div>
            ))}

            <button className={`${greenBtn} w-full mt-3`}>
              + Add Joint
            </button>
          </div>

          {/* Round Shapes */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Round Shapes’ Joints</h3>

            <div className="flex flex-col gap-2 mb-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                No Round Shape
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                With Round Shape
              </label>
            </div>

            <div className="mb-2">
              <span className="block mb-1">Radius</span>
              <input className={`${input} w-full`} />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="w-16">Joint D</span>
              <select className="border rounded-md p-1">
                <option>circle</option>
                <option>semi-circle</option>
                <option>quarter-circle</option>
              </select>
            </div>

            <div className="flex gap-2 mb-3">
              <input placeholder="x" className={input} />
              <input placeholder="y" className={input} />
            </div>

            <button className={`${redBtn} w-full mb-2`}>
              – Remove Joint
            </button>
            <button className={`${greenBtn} w-full`}>
              + Add Joint
            </button>
          </div>

          {/* Members */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Nodes</h3>

            <div className="flex items-center gap-2 mb-2">
              <span className="w-24">Member AB joint</span>
              <input placeholder="x" className={input} />
              <input placeholder="y" className={input} />
              <button className={redBtn}>✕</button>
            </div>

            {["B", "C"].map((j) => (
              <div key={j} className="flex items-center gap-2 mb-2">
                <span className="w-24">Joint {j}</span>
                <input placeholder="x" className={input} />
                <input placeholder="y" className={input} />
                <button className={redBtn}>✕</button>
              </div>
            ))}

            <button className={`${greenBtn} w-full mt-3`}>
              + Add Joint
            </button>
          </div>
        </div>

        {/* Supports */}
        <div className="bg-white rounded-xl shadow p-4 mt-8 max-w-md">
          <h3 className="font-semibold mb-3">Supports</h3>

          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-2 mb-3">
              <span className="w-16">Node {n}</span>
              <input placeholder="x" className={input} />
              <input placeholder="y" className={input} />
              <select className="border rounded-md p-1">
                <option>Support Type</option>
                <option>Pinned</option>
                <option>Roller</option>
                <option>Fixed</option>
              </select>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
