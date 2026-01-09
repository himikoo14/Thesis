"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

type Support = { x: string; y: string; type: "Pinned" | "Roller" };
type Node = { x: string; y: string };
type Force = { node: string; magnitude: string; angle: string };

// Generic object type for handleChange
type GenericObject = Record<string, any>;

export default function TrussSolverUI() {
  // State
  const [supports, setSupports] = useState<Support[]>([
    { x: "", y: "", type: "Pinned" },
    { x: "", y: "", type: "Roller" },
  ]);
  const [nodes, setNodes] = useState<Node[]>([{ x: "", y: "" }]);
  const [forces, setForces] = useState<Force[]>([{ node: "", magnitude: "", angle: "" }]);

  // Common input class
  const inputClass =
    "w-full mt-1 rounded-lg border border-gray-300 text-[18px] p-2 outline-none focus:outline-none focus:ring-0";
  const redButtonClass =
    "px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-[18px]";
  const greenButtonClass =
    "px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-[18px]";

  // ===== Generic handlers (typed) =====
  const handleChange = <T extends GenericObject>(
    arr: T[],
    setArr: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
    field: keyof T,
    value: T[keyof T]
  ) => {
    const newArr = [...arr];
    newArr[index][field] = value;
    setArr(newArr);
  };

  const addItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, template: T) =>
    setArr([...arr, template]);

  const removeItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number) =>
    setArr(arr.filter((_, i) => i !== index));

  // ===== JSX (unchanged except handler calls remain the same) =====
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-grow px-6 py-10 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Truss Calculator</h1>
        <h2 className="text-xl font-semibold text-center mb-6">Real-Time Free Body Diagram</h2>

        {/* FBD Placeholder */}
        <div className="bg-white border rounded-xl shadow h-[420px] flex items-center justify-center mb-8">
          <svg width="360" height="360">
            <line x1="180" y1="20" x2="180" y2="340" stroke="gray" />
            <line x1="20" y1="180" x2="340" y2="180" stroke="gray" />
            <text x="350" y="185" fontSize="14">x</text>
            <text x="185" y="15" fontSize="14">y</text>
          </svg>
        </div>

        {/* Input Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Supports */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Supports</h3>
            {supports.map((s, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                  <label className="block font-medium text-[18px]">Node {i + 1}</label>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="x"
                    value={s.x}
                    onChange={(e) => handleChange(supports, setSupports, i, "x", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="y"
                    value={s.y}
                    onChange={(e) => handleChange(supports, setSupports, i, "y", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <select
                    value={s.type}
                    onChange={(e) => handleChange(supports, setSupports, i, "type", e.target.value)}
                    className={inputClass}
                  >
                    <option>Pinned</option>
                    <option>Roller</option>
                  </select>
                </div>
                {supports.length > 1 && (
                  <button onClick={() => removeItem(supports, setSupports, i)} className={redButtonClass}>–</button>
                )}
              </div>
            ))}
            <button
              onClick={() => addItem(supports, setSupports, { x: "", y: "", type: "Pinned" })}
              className={greenButtonClass}
            >
              + Add Support
            </button>
          </div>

          {/* Nodes */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-xl font-semibold mb-2">Nodes</h3>
            {nodes.map((n, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                  <label className="block font-medium text-[18px]">Node {i + 1}</label>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="x"
                    value={n.x}
                    onChange={(e) => handleChange(nodes, setNodes, i, "x", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="y"
                    value={n.y}
                    onChange={(e) => handleChange(nodes, setNodes, i, "y", e.target.value)}
                    className={inputClass}
                  />
                </div>
                {nodes.length > 1 && (
                  <button onClick={() => removeItem(nodes, setNodes, i)} className={redButtonClass}>–</button>
                )}
              </div>
            ))}
            <button onClick={() => addItem(nodes, setNodes, { x: "", y: "" })} className={greenButtonClass}>
              + Add Node
            </button>
          </div>

          {/* Forces */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Forces</h3>
            {forces.map((f, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                {["node", "kN", "angle"].map((field) => (
                  <div className="flex-1" key={field}>
                    <label className="block font-medium text-[18px]">
                      {field.charAt(0).toUpperCase() + field.slice(1)} {i + 1}
                      {field === "angle" ? " (°)" : ""}
                    </label>
                    <input
                      type="number"
                      value={f[field as keyof Force]}
                      onChange={(e) => handleChange(forces, setForces, i, field as keyof Force, e.target.value)}
                      placeholder={field}
                      className={inputClass}
                    />
                  </div>
                ))}
                {forces.length > 1 && (
                  <button onClick={() => removeItem(forces, setForces, i)} className={redButtonClass}>–</button>
                )}
              </div>
            ))}
            <button
              onClick={() => addItem(forces, setForces, { node: "", magnitude: "", angle: "" })}
              className={greenButtonClass}
            >
              + Add Force
            </button>
          </div>
        </div>

        {/* Calculate */}
        <button className="w-full bg-blue-800 text-white py-3 rounded-lg text-[17px] font-semibold hover:bg-blue-900 transition mb-6">
          Calculate
        </button>

        {/* Solution */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-xl font-semibold">Solution</h3>
        </div>
      </main>
      <Footer />
    </div>
  );
}