"use client";

import { useState } from "react";
import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

type XY = { x: string; y: string };
type Shape = { type: string; radius: string; x: string; y: string };
type Support = { x: string; y: string; type: string };

export default function DistributedLoadPage() {
  /* ---------------- STATES ---------------- */
  const [nodes, setNodes] = useState<XY[]>([
    { x: "", y: "" },
    { x: "", y: "" },
    { x: "", y: "" },
  ]);

  const [shapes, setShapes] = useState<Shape[]>([
    { type: "circle", radius: "", x: "", y: "" },
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

  const [x, setX] = useState("");
  const [y, setY] = useState("");

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

        {/* ======================================================= */}
        {/*  TOP GRID — Nodes / Round Shapes / Sides               */}
        {/* ======================================================= */}
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

            {shapes.map((s, i) => (
              <div key={i} className="flex flex-col gap-3 mb-4">

                {/* Radius + Shape */}
                <div className="flex items-end gap-3">
                  <div>
                    <span className="block mb-1">Radius</span>
                    <input
                      placeholder="Radius"
                      value={s.radius}
                      onChange={(e) =>
                        update(shapes, setShapes, i, "radius", e.target.value)
                      }
                      className={input}
                    />
                  </div>

                  <div>
                    <span className="block mb-1">Shape</span>
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
                  </div>

                  {shapes.length > 1 && (
                    <button
                      onClick={() => remove(shapes, setShapes, i)}
                      className={`${redBtn} w-8 h-8 p-0 self-end`}
                    >
                      –
                    </button>
                  )}
                </div>


                {/* x */}
                <div className="flex items-center gap-2">
                  <span className="w-24">x-Axis</span>
                  <input
                    placeholder="x"
                    value={s.x}
                    onChange={(e) =>
                      update(shapes, setShapes, i, "x", e.target.value)
                    }
                    className={input}
                  />
                </div>

                {/* y */}
                <div className="flex items-center gap-2">
                  <span className="w-24">y-Axis</span>
                  <input
                    placeholder="y"
                    value={s.y}
                    onChange={(e) =>
                      update(shapes, setShapes, i, "y", e.target.value)
                    }
                    className={input}
                  />
                </div>

              </div>
            ))}

            <button
              onClick={() =>
                setShapes([
                  ...shapes,
                  { type: "circle", radius: "", x: "", y: "" },
                ])
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

        {/* ======================================================= */}
        {/*   ORIENTATION FIX — 3 PANELS SIDE BY SIDE               */}
        {/* ======================================================= */}
        <p className="text-sm text-gray-700 my-6">For Analysis.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* -------- Reference Axis -------- */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Reference Axis</h3>

            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" />
              Centroidal Axis
            </label>

            <label className="flex items-center gap-2 mb-3">
              <input type="checkbox" />
              Custom Axis
            </label>

            <div className="flex flex-col gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-24">x-Axis</span>
                <input placeholder="x" className={input} />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-24">y-Axis</span>
                <input placeholder="y" className={input} />
              </div>
            </div>
          </div>

          {/* -------- Shapes -------- */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Shapes</h3>

            {shapes.map((s, i) => (
              <div key={i} className="mb-3">

                <div className="flex items-center gap-2 mb-3">
                  <span className="w-14">Shape</span>
                  <select
                    value={s.type}
                    onChange={(e) =>
                      update(shapes, setShapes, i, "type", e.target.value)
                    }
                    className="border rounded-md p-1"
                  >
                    <option>Solid</option>
                    <option>Hollow</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <select className="border rounded-md p-1 w-28">
                    <option>unit A</option>
                  </select>

                  <select className="border rounded-md p-1 w-28">
                    <option>unit B</option>
                  </select>
                </div>

              </div>
            ))}

            <button className={`${greenBtn} w-full mt-2`}>
              + Add Shape
            </button>
          </div>

          {/* -------- Calculate -------- */}
          <div className="flex items-start justify-center md:justify-end w-full">
            <button
              className="w-full bg-blue-800 text-white py-3 rounded-lg font-semibold mb-6 hover:bg-blue-900 transition"
            >
              Calculate
            </button>
          </div>


        </div>
      </main>

      <Footer />
    </div>
  );
}
