"use client";

import Link from "next/link";
import Header from "../components/Header";

export default function Solver2D() {
  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen">
      {/* Navbar */}
      < Header />

      {/* Title */}
      <div className="text-center my-10">
        <h1 className="text-3xl font-bold">2D Resultant Force Calculator</h1>
      </div>

      {/* Force Setup */}
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
        <h2 className="text-lg font-semibold">Force setup</h2>
        <p className="text-sm text-gray-600">
          Enter the number of forces, their magnitudes, and directions. Angles are measured from the positive x-axis.
        </p>

        {/* Number of forces */}
        <div>
          <label className="block text-sm font-medium">Number of forces</label>
          <input
            type="number"
            className="w-full mt-1 rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Force inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Force 1</label>
            <div className="flex space-x-2 mt-1">
              <input type="number" placeholder="Value" className="w-full rounded-lg border-gray-300" />
              <select className="rounded-lg border-gray-300">
                <option>kN</option>
                <option>N</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Angle 1</label>
            <div className="flex space-x-2 mt-1">
              <input type="number" placeholder="Value" className="w-full rounded-lg border-gray-300" />
              <select className="rounded-lg border-gray-300">
                <option>deg</option>
                <option>rad</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Force 2</label>
            <input type="number" className="w-full mt-1 rounded-lg border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium">Angle 2</label>
            <input type="number" className="w-full mt-1 rounded-lg border-gray-300" />
          </div>

          <div>
            <label className="block text-sm font-medium">Force 3</label>
            <input type="number" className="w-full mt-1 rounded-lg border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium">Angle 3</label>
            <input type="number" className="w-full mt-1 rounded-lg border-gray-300" />
          </div>
        </div>
      </div>

      {/* FBD Section */}
      <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl shadow p-6">
        <button className="w-full flex justify-between items-center font-semibold">
          Free Body Diagram (FBD)
          <span className="text-gray-500">▼</span>
        </button>
      </div>

      {/* Resultant Force */}
      <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">Resultant Force</h2>

        <div>
          <label className="block text-sm font-medium">Horizontal component</label>
          <input type="text" className="w-full mt-1 rounded-lg border-gray-300" />
        </div>

        <div>
          <label className="block text-sm font-medium">Vertical component</label>
          <input type="text" className="w-full mt-1 rounded-lg border-gray-300" />
        </div>

        <div>
          <label className="block text-sm font-medium">Magnitude of resultant force</label>
          <input type="text" className="w-full mt-1 rounded-lg border-gray-300" />
        </div>

        <div>
          <label className="block text-sm font-medium">Direction of resultant force</label>
          <input type="text" className="w-full mt-1 rounded-lg border-gray-300" />
        </div>
      </div>

      {/* Solution Section */}
      <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl shadow p-6">
        <button className="w-full flex justify-between items-center font-semibold">
          Solution
          <span className="text-gray-500">▼</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-600 mt-10 py-6">
        <Link href="/about" className="mx-2 hover:text-black">About</Link> |
        <Link href="/references" className="mx-2 hover:text-black">References</Link> |
        <Link href="/contact" className="mx-2 hover:text-black">Contact</Link> |
        <Link href="/developer" className="mx-2 hover:text-black">Developer</Link>
      </footer>
    </div>
  );
}
