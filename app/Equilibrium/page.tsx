"use client";

import { useState } from "react";
import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

type XY = { x: string; y: string };
type Shape = { type: string; x: string; y: string };
type Support = { x: string; y: string; type: string };

export default function EquilibriumPage() {
  /* ---------------- STATES ---------------- */
  const [nodes, setNodes] = useState<XY[]>([
    { x: "", y: "" },
    { x: "", y: "" },
    { x: "", y: "" },
  ]);

  const [shapes, setShapes] = useState<Shape[]>([
    { type: "circle", x: "", y: "" },
  ]);

  const [sides, setSides] = useState<XY[]>([
    { x: "", y: "" },
    { x: "", y: "" },
    { x: "", y: "" },
  ]);

  const [supports, setSupports] = useState<Support[]>([
    { x: "", y: "", type: "Pinned" },
    { x: "", y: "", type: "Roller" },
  ]);

  /* ---------------- STYLES ---------------- */
  const input =
    "w-16 rounded-md border border-gray-300 p-1 text-center text-[16px]";
  const redBtn =
    "bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600";
  const greenBtn =
    "bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700";

  /* ---------------- HELPERS ---------------- */
  const update = <T,>(
    arr: T[],
    setArr: (v: T[]) => void,
    i: number,
    key: keyof T,
    value: string
  ) => {
    const copy = [...arr];
    copy[i][key] = value as any;
    setArr(copy);
  };

  const remove = <T,>(arr: T[], setArr: (v: T[]) => void, i: number) => {
    if (arr.length > 1) {
      setArr(arr.filter((_, idx) => idx !== i));
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Moment of Inertia for Composite Shapes Calculator
        </h1>


        <div className="bg-white border rounded-xl h-[280px] mb-6" />

        <p className="text-sm text-gray-700 mb-6">
          Note: The most lower left point of the composite shape should be at (0,0).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* -------- Nodes -------- */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Nodes</h3>

            {nodes.map((n, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="w-16">
                  Joint {String.fromCharCode(65 + i)}
                </span>

                <input
                  placeholder="x"
                  value={n.x}
                  onChange={(e) =>
                    update(nodes, setNodes, i, "x", e.target.value)
                  }
                  className={input}
                />
                <input
                  placeholder="y"
                  value={n.y}
                  onChange={(e) =>
                    update(nodes, setNodes, i, "y", e.target.value)
                  }
                  className={input}
                />

                {nodes.length > 1 && (
                  <button
                    onClick={() => remove(nodes, setNodes, i)}
                    className={redBtn}
                  >
                    –
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setNodes([...nodes, { x: "", y: "" }])}
              className={`${greenBtn} w-full mt-3`}
            >
              + Add Joint
            </button>
          </div>

          {/* -------- Round Shapes -------- */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Round Shapes’ Joints</h3>

            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" />
              No Round Shape
            </label>

            <label className="flex items-center gap-2 mb-3">
              <input type="checkbox" />
              With Round Shape
            </label>

            <span className="block mb-1">Radius</span>
            <div className="flex items-center gap-2 mb-3">
              <input
                placeholder="radius"
                className={input}
              />
            </div>

            {shapes.map((s, i) => (
              <div key={i} className="flex items-center gap-2 mb-3">
                <span className="w-16">Shape</span>

                <select
                  value={s.type}
                  onChange={(e) =>
                    update(shapes, setShapes, i, "type", e.target.value)
                  }
                  className="border rounded-md p-1"
                >
                  <option>circle</option>
                  <option>semi-circle</option>
                  <option>quarter-circle</option>
                </select>

                <input
                  placeholder="x"
                  value={s.x}
                  onChange={(e) =>
                    update(shapes, setShapes, i, "x", e.target.value)
                  }
                  className={input}
                />
                <input
                  placeholder="y"
                  value={s.y}
                  onChange={(e) =>
                    update(shapes, setShapes, i, "y", e.target.value)
                  }
                  className={input}
                />

                {shapes.length > 1 && (
                  <button
                    onClick={() => remove(shapes, setShapes, i)}
                    className={redBtn}
                  >
                    –
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() =>
                setShapes([...shapes, { type: "circle", x: "", y: "" }])
              }
              className={`${greenBtn} w-full`}
            >
              + Add Shape
            </button>
          </div>


          {/* -------- Sides -------- */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Sides</h3>

            {sides.map((s, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="w-24">
                  Side {String.fromCharCode(65 + i)}
                </span>

                <input
                  placeholder="x"
                  value={s.x}
                  onChange={(e) =>
                    update(sides, setSides, i, "x", e.target.value)
                  }
                  className={input}
                />
                <input
                  placeholder="y"
                  value={s.y}
                  onChange={(e) =>
                    update(sides, setSides, i, "y", e.target.value)
                  }
                  className={input}
                />

                {sides.length > 1 && (
                  <button
                    onClick={() => remove(sides, setSides, i)}
                    className={redBtn}
                  >
                    –
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setSides([...sides, { x: "", y: "" }])}
              className={`${greenBtn} w-full mt-3`}
            >
              + Add Side
            </button>
          </div>
        </div>

        {/* -------- Supports -------- */}
        <div className="bg-white rounded-xl shadow p-4 mt-8 max-w-md">
          <h3 className="font-semibold mb-3">Supports</h3>

          {supports.map((s, i) => (
            <div key={i} className="flex items-center gap-2 mb-3">
              <span className="w-16">Node {i + 1}</span>

              <input
                placeholder="x"
                value={s.x}
                onChange={(e) =>
                  update(supports, setSupports, i, "x", e.target.value)
                }
                className={input}
              />
              <input
                placeholder="y"
                value={s.y}
                onChange={(e) =>
                  update(supports, setSupports, i, "y", e.target.value)
                }
                className={input}
              />

              <select
                value={s.type}
                onChange={(e) =>
                  update(supports, setSupports, i, "type", e.target.value)
                }
                className="border rounded-md p-1"
              >
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
