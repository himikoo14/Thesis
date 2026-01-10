"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

/* ===================== TYPES ===================== */

type Support = {
  x: string;
  y: string;
  type: "Pinned" | "Roller";
};

type Node = {
  x: string;
  y: string;
};

type Member = {
  start: number; // index in allNodes
  end: number;   // index in allNodes
};

type Force = {
  node: number;  // index in allNodes
  magnitude: string;
  angle: string;
};

type GenericObject = Record<string, any>;

/* ===================== COMPONENT ===================== */

export default function TrussSolverUI() {
  /* ---------- STATE ---------- */
  const [supports, setSupports] = useState<Support[]>([
    { x: "", y: "", type: "Pinned" },
    { x: "", y: "", type: "Roller" },
  ]);

  const [nodes, setNodes] = useState<Node[]>([{ x: "", y: "" }]);

  const [members, setMembers] = useState<Member[]>([
    { start: 0, end: 1 },
  ]);

  const [forces, setForces] = useState<Force[]>([
    { node: 0, magnitude: "", angle: "" },
  ]);

  /* ---------- DERIVED NODES ---------- */
  const allNodes: Node[] = [...supports.map((s) => ({ x: s.x, y: s.y })), ...nodes];

  /* ---------- STYLES ---------- */
  const inputClass =
    "w-full mt-1 rounded-lg border border-gray-300 text-[18px] p-2 outline-none focus:ring-0";

  const redButtonClass =
    "w-10 px-2 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-600 text-[20px]";

  const greenButtonClass =
    "px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-[18px]";

  /* ---------- GENERIC HANDLERS ---------- */
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

  const addItem = <T,>(
    arr: T[],
    setArr: React.Dispatch<React.SetStateAction<T[]>>,
    template: T
  ) => setArr([...arr, template]);

  const removeItem = <T,>(
    arr: T[],
    setArr: React.Dispatch<React.SetStateAction<T[]>>,
    index: number
  ) => setArr(arr.filter((_, i) => i !== index));

  /* ===================== JSX ===================== */
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main className="flex-grow px-6 py-10 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Truss Calculator</h1>
        <h2 className="text-xl font-semibold text-center mb-6">
          Real-Time Free Body Diagram
        </h2>

        {/* FBD */}
        <div className="bg-white border rounded-xl shadow h-[420px] flex items-center justify-center mb-8">
          <svg width="360" height="360">
            <line x1="180" y1="20" x2="180" y2="340" stroke="gray" />
            <line x1="20" y1="180" x2="340" y2="180" stroke="gray" />
            <text x="350" y="185">x</text>
            <text x="185" y="15">y</text>
          </svg>
        </div>

        {/* INPUT PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* SUPPORTS */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Supports</h3>

            {supports.map((s, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-end mb-2">
                <span className="font-medium text-[18px]">Node {i + 1}</span>

                <input
                  type="number"
                  placeholder="x"
                  value={s.x}
                  onChange={(e) =>
                    handleChange(supports, setSupports, i, "x", e.target.value)
                  }
                  className={inputClass}
                />

                <input
                  type="number"
                  placeholder="y"
                  value={s.y}
                  onChange={(e) =>
                    handleChange(supports, setSupports, i, "y", e.target.value)
                  }
                  className={inputClass}
                />

                <select
                  value={s.type}
                  onChange={(e) =>
                    handleChange(supports, setSupports, i, "type", e.target.value)
                  }
                  className={inputClass}
                >
                  <option>Pinned</option>
                  <option>Roller</option>
                </select>

                {supports.length > 1 && (
                  <button
                    onClick={() => removeItem(supports, setSupports, i)}
                    className={redButtonClass}
                  >
                    –
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() =>
                addItem(supports, setSupports, { x: "", y: "", type: "Pinned" })
              }
              className={greenButtonClass}
            >
              + Add Support
            </button>
          </div>

          {/* NODES SECTION (Nodes + Supports combined) */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Nodes</h3>

            {nodes.map((n, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <span className="font-medium text-[18px]">
                  Node {supports.length + i + 1}
                </span>

                <input
                  type="number"
                  placeholder="x"
                  value={n.x}
                  onChange={(e) =>
                    handleChange(nodes, setNodes, i, "x", e.target.value)
                  }
                  className={inputClass}
                />

                <input
                  type="number"
                  placeholder="y"
                  value={n.y}
                  onChange={(e) =>
                    handleChange(nodes, setNodes, i, "y", e.target.value)
                  }
                  className={inputClass}
                />

                {nodes.length > 1 && (
                  <button
                    onClick={() => removeItem(nodes, setNodes, i)}
                    className={redButtonClass}
                  >
                    –
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => addItem(nodes, setNodes, { x: "", y: "" })}
              className={greenButtonClass}
            >
              + Add Node
            </button>
          </div>

          {/* MEMBERS */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Members</h3>

            {/* Label Row */}
            <div className="grid grid-cols-4 gap-2 items-end mb-2">
              <span className="text-[16px] font-medium text-gray-700"> </span>
              <span className="text-[16px] font-medium text-gray-700">Start Node</span>
              <span className="text-[16px] font-medium text-gray-700">End Node</span>
              <span className="text-[16px] font-medium text-gray-700"> </span>
            </div>

            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <span className="font-medium text-[18px]">Member {i + 1}</span>

                <select
                  value={m.start}
                  onChange={(e) =>
                    handleChange(members, setMembers, i, "start", Number(e.target.value))
                  }
                  className={inputClass}
                >
                  {allNodes.map((_, idx) => (
                    <option key={idx} value={idx}>
                      Node {idx + 1}
                    </option>
                  ))}
                </select>

                <select
                  value={m.end}
                  onChange={(e) =>
                    handleChange(members, setMembers, i, "end", Number(e.target.value))
                  }
                  className={inputClass}
                >
                  {allNodes.map((_, idx) => (
                    <option key={idx} value={idx}>
                      Node {idx + 1}
                    </option>
                  ))}
                </select>

                {members.length > 1 ? (
                  <button
                    onClick={() => removeItem(members, setMembers, i)}
                    className={redButtonClass}
                  >
                    –
                  </button>
                ) : (
                  <div /> // empty placeholder to keep grid alignment
                )}
              </div>
            ))}

            <button
              onClick={() => addItem(members, setMembers, { start: 0, end: 0 })}
              className={greenButtonClass}
            >
              + Add Member
            </button>
          </div>


          {/* FORCES */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Forces</h3>

            {forces.map((f, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <select
                  value={f.node}
                  onChange={(e) =>
                    handleChange(forces, setForces, i, "node", Number(e.target.value))
                  }
                  className={inputClass}
                >
                  {allNodes.map((_, idx) => (
                    <option key={idx} value={idx}>
                      Node {idx + 1}
                    </option>
                  ))}
                </select>

                <input
                  placeholder="kN"
                  value={f.magnitude}
                  onChange={(e) =>
                    handleChange(forces, setForces, i, "magnitude", e.target.value)
                  }
                  className={inputClass}
                />

                <input
                  placeholder="deg"
                  value={f.angle}
                  onChange={(e) =>
                    handleChange(forces, setForces, i, "angle", e.target.value)
                  }
                  className={inputClass}
                />

                {forces.length > 1 && (
                  <button
                    onClick={() => removeItem(forces, setForces, i)}
                    className={redButtonClass}
                  >
                    –
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() =>
                addItem(forces, setForces, { node: 0, magnitude: "", angle: "" })
              }
              className={greenButtonClass}
            >
              + Add Force
            </button>
          </div>
        </div>

        <button className="w-full bg-blue-800 text-white py-3 rounded-lg font-semibold mb-6">
          Calculate
        </button>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-xl font-semibold">Solution</h3>
        </div>
      </main>

      <Footer />
    </div>
  );
}
