"use client";

import { useState } from "react";
import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";
import CircularInputs from "<Ian>/components/CircularInputs";
import ShapeCanvas from "<Ian>/components/ShapeCanvas";
import { computeMOI } from "../../lib/MOIEngine";

/* ================= TYPES ================= */
type XY = { x: string; y: string };

type ShapeType =
  | "Polygon"
  | "Circle"
  | "Semi-circle-1"
  | "Semi-circle-2"
  | "Quarter-circle-1"
  | "Quarter-circle-2"
  | "Quarter-circle-3"
  | "Quarter-circle-4";

type ShapeData = {
  type: ShapeType;
  hollow: "Hollow" | "Solid";
  isOpen: boolean; // ✅ NEW

  // polygon
  nodes: XY[];
  sides: { a: number; b: number }[];

  // circular
  radius: string;
  x: string;
  y: string;
};

export default function DistributedLoadPage() {
  /* ================= STATES ================= */

  const [axisType, setAxisType] = useState<"Centroidal" | "Custom">("Centroidal");
  const [axisX, setAxisX] = useState("");
  const [axisY, setAxisY] = useState("");

  const [shapes, setShapes] = useState<ShapeData[]>([
    {
      type: "Polygon",
      hollow: "Hollow",
      isOpen: true,
      nodes: [
        { x: "", y: "" },
        { x: "", y: "" },
      ],
      sides: [{ a: 0, b: 1 }],
      radius: "",
      x: "",
      y: "",
    },
  ]);

  const [result, setResult] = useState<{
    area: number;
    centroidX: number;
    centroidY: number;
    Ix: number;
    Iy: number;
  } | null>(null);

  // ================= NUMBER FORMATTER =================
  const formatNumber = (num: number) => {
    const rounded = Number(num.toFixed(3));
    return Number.isInteger(rounded) ? rounded : rounded;
  };

  // TEMP placeholder function (so the button works)
  const calculateResultant = () => {
    const computed = computeMOI(shapes);

    let Ix = computed.Ix;
    let Iy = computed.Iy;

    if (axisType === "Custom") {
      const customX = Number(axisX);
      const customY = Number(axisY);

      const dx = computed.centroidX - customX;
      const dy = computed.centroidY - customY;

      Ix = Ix + computed.area * dy * dy;
      Iy = Iy + computed.area * dx * dx;
    }

    setResult({
      area: computed.area,
      centroidX: computed.centroidX,
      centroidY: computed.centroidY,
      Ix,
      Iy,
    });
  };


  const handleAddShape = () => {
    setShapes(prev => [
      ...prev,
      {
        type: "Polygon",
        hollow: "Hollow",
        isOpen: true, // ✅ new card opens
        nodes: [
          { x: "", y: "" },
          { x: "", y: "" },
        ],
        sides: [{ a: 0, b: 1 }],
        radius: "",
        x: "",
        y: "",
      },
    ]);
  };


  const handleRemoveShape = (index: number) => {
    if (shapes.length === 1) return;
    setShapes(prev => prev.filter((_, i) => i !== index));
  };

  // ================= GLOBAL JOINT LABEL (A, B ... Z, AA, AB ...) =================
  const getJointLabel = (shapeIndex: number, nodeIndex: number) => {
    let count = 0;

    // Count joints from previous shapes
    for (let i = 0; i < shapeIndex; i++) {
      count += shapes[i].nodes.length;
    }

    let globalIndex = count + nodeIndex;

    // Convert number → Excel-style letters
    let label = "";
    globalIndex += 1; // make it 1-based

    while (globalIndex > 0) {
      const remainder = (globalIndex - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      globalIndex = Math.floor((globalIndex - 1) / 26);
    }

    return label;
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Moment of Inertia for Composite Shapes Calculator
        </h1>

        {/* Canvas */}
        <ShapeCanvas shapes={shapes} />



        <p className="text-sm text-gray-700 mb-4">
          <span className="font-semibold">Note:</span> The most lower left point
          of the composite shape should be at (0,0).
        </p>

        <div className="flex items-start gap-6 flex-wrap">
          {/* LEFT COLUMN: Reference Axis + Calculate */}
          <div className="flex flex-col w-[300px] shrink-0">

            {/* Reference Axis */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-3">Reference Axis</h3>

              {/* Axis Type Dropdown */}
              <select
                value={axisType}
                onChange={e => setAxisType(e.target.value as "Centroidal" | "Custom")}
                className="w-full rounded bg-white px-3 py-2 mb-4 focus:outline-none focus:ring-0"
              >
                <option value="Centroidal">Centroidal Axis</option>
                <option value="Custom">Custom Axis</option>
              </select>

              {/* Custom Axis Inputs */}
              {axisType === "Custom" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-20">x-Axis</span>
                    <input
                      value={axisX}
                      onChange={e => setAxisX(e.target.value)}
                      placeholder="x"
                      className="w-full rounded bg-gray-100 px-3 py-1 focus:outline-none focus:ring-0"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-20">y-Axis</span>
                    <input
                      value={axisY}
                      onChange={e => setAxisY(e.target.value)}
                      placeholder="y"
                      className="w-full rounded bg-gray-100 px-3 py-1 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Calculate Button (Under Axis) */}
            <div className="mt-4">
              <button
                onClick={calculateResultant}
                className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition text-[18px]"
              >
                Calculate
              </button>
            </div>

            {result && (
              <div className="mt-6 bg-white rounded-xl shadow p-4">
                <h3 className="font-semibold mb-3">Results</h3>

                <p>Area: {formatNumber(result.area)}</p>

                <p>
                  Centroid: (
                  {formatNumber(result.centroidX)},{" "}
                  {formatNumber(result.centroidY)}
                  )
                </p>

                <p>Ix: {formatNumber(result.Ix)}</p>
                <p>Iy: {formatNumber(result.Iy)}</p>


              </div>
            )}

          </div>

          {/* -------- Shape Cards -------- */}
          <div className="flex flex-wrap gap-6 flex-1">
            {shapes.map((shape, index) => {
              const isCircular = shape.type !== "Polygon";

              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow px-6 py-4 w-[340px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Shape {index + 1}</h3>

                    <button
                      onClick={() => handleRemoveShape(index)}
                      className="w-8 h-8 bg-red-500 text-white rounded-lg font-bold"
                    >
                      –
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const copy = [...shapes];
                      copy[index].isOpen = !copy[index].isOpen;
                      setShapes(copy);
                    }}
                    className="w-full flex justify-between bg-green-600 text-white px-4 py-2 rounded-lg"
                  >
                    Options
                    <span
                      className={`transition-transform ${shape.isOpen ? "rotate-180" : ""
                        }`}
                    >
                      ▼
                    </span>
                  </button>


                  {
                    shape.isOpen && (
                      <div className="mt-4 space-y-4">
                        {/* Shape Type */}
                        <select
                          value={shape.type}
                          onChange={e => {
                            const copy = [...shapes];
                            copy[index].type = e.target.value as ShapeType;
                            setShapes(copy);
                          }}
                          className="w-full rounded px-3 py-1"
                        >
                          <option value="Polygon">Polygon</option>
                          <option value="Circle">Circle</option>
                          <option value="Semi-circle-1">Semi-circle-1</option>
                          <option value="Semi-circle-2">Semi-circle-2</option>
                          <option value="Semi-circle-3">Semi-circle-3</option>
                          <option value="Semi-circle-4">Semi-circle-4</option>
                          <option value="Quarter-circle-1">Quarter-circle-1</option>
                          <option value="Quarter-circle-2">Quarter-circle-2</option>
                          <option value="Quarter-circle-3">Quarter-circle-3</option>
                          <option value="Quarter-circle-4">Quarter-circle-4</option>
                        </select>

                        {/* Hollow / Solid */}
                        <select
                          value={shape.hollow}
                          onChange={e => {
                            const copy = [...shapes];
                            copy[index].hollow =
                              e.target.value as "Hollow" | "Solid";
                            setShapes(copy);
                          }}
                          className="w-full rounded px-3 py-1"
                        >
                          <option>Hollow</option>
                          <option>Solid</option>
                        </select>
                        {shape.type === "Polygon" && (
                          <div className="space-y-5">

                            {/* ===== Joints ===== */}
                            <div>
                              <h4 className="font-semibold mb-2">Joints</h4>

                              {shape.nodes.map((node, i) => (
                                <div key={i} className="flex items-center gap-2 mb-2">
                                  <span className="w-16">Joint {getJointLabel(index, i)}</span>

                                  <input
                                    placeholder="x"
                                    value={node.x}
                                    onChange={e => {
                                      const copy = [...shapes];
                                      copy[index].nodes[i].x = e.target.value;
                                      setShapes(copy);
                                    }}
                                    className="w-20 rounded bg-gray-100 px-2 py-1 focus:outline-none focus:ring-0"
                                  />

                                  <input
                                    placeholder="y"
                                    value={node.y}
                                    onChange={e => {
                                      const copy = [...shapes];
                                      copy[index].nodes[i].y = e.target.value;
                                      setShapes(copy);
                                    }}
                                    className="w-20 rounded bg-gray-100 px-2 py-1 focus:outline-none focus:ring-0"
                                  />

                                  <button
                                    onClick={() => {
                                      if (shape.nodes.length <= 2) return;

                                      const copy = [...shapes];
                                      copy[index].nodes.splice(i, 1);

                                      // remove sides connected to this joint
                                      copy[index].sides = copy[index].sides.filter(
                                        s => s.a !== i && s.b !== i
                                      );

                                      setShapes(copy);
                                    }}
                                    className="bg-red-500 text-white px-3 py-1 rounded"
                                  >
                                    –
                                  </button>
                                </div>
                              ))}

                              <button
                                onClick={() => {
                                  const copy = [...shapes];
                                  copy[index].nodes.push({ x: "", y: "" });
                                  setShapes(copy);
                                }}
                                className="bg-green-600 text-white px-3 py-1 rounded"
                              >
                                + Add Joint
                              </button>
                            </div>

                            {/* ===== Sides ===== */}
                            <div>
                              <h4 className="font-semibold mb-2">Sides</h4>

                              {shape.sides.map((side, i) => (
                                <div key={i} className="flex items-center gap-2 mb-2">
                                  <span className="w-12">Side</span>

                                  <select
                                    value={side.a}
                                    onChange={e => {
                                      const copy = [...shapes];
                                      copy[index].sides[i].a = Number(e.target.value);
                                      setShapes(copy);
                                    }}
                                    className="w-24 rounded bg-gray-100 px-2 py-1 focus:outline-none focus:ring-0"
                                  >
                                    {shape.nodes.map((_, j) => (
                                      <option key={j} value={j}>
                                        Joint {getJointLabel(index, j)}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={side.b}
                                    onChange={e => {
                                      const copy = [...shapes];
                                      copy[index].sides[i].b = Number(e.target.value);
                                      setShapes(copy);
                                    }}
                                    className="w-24 rounded bg-gray-100 px-2 py-1 focus:outline-none focus:ring-0"
                                  >
                                    {shape.nodes.map((_, j) => (
                                      <option key={j} value={j}>
                                        Joint {getJointLabel(index, j)}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    onClick={() => {
                                      const copy = [...shapes];
                                      copy[index].sides.splice(i, 1);
                                      setShapes(copy);
                                    }}
                                    className="bg-red-500 text-white px-3 py-1 rounded"
                                  >
                                    –
                                  </button>
                                </div>
                              ))}

                              <button
                                onClick={() => {
                                  if (shape.nodes.length < 2) return;

                                  const copy = [...shapes];
                                  copy[index].sides.push({ a: 0, b: 1 });
                                  setShapes(copy);
                                }}
                                className="bg-green-600 text-white px-3 py-1 rounded"
                              >
                                + Add Side
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Circular Inputs */}
                        {isCircular && (
                          <CircularInputs
                            radius={shape.radius}
                            x={shape.x}
                            y={shape.y}
                            onRadiusChange={val => {
                              const copy = [...shapes];
                              copy[index].radius = val;
                              setShapes(copy);
                            }}
                            onXChange={val => {
                              const copy = [...shapes];
                              copy[index].x = val;
                              setShapes(copy);
                            }}
                            onYChange={val => {
                              const copy = [...shapes];
                              copy[index].y = val;
                              setShapes(copy);
                            }}
                          />
                        )}

                        <button
                          onClick={handleAddShape}
                          className="w-full bg-green-700 text-white py-2 rounded-lg font-semibold"
                        >
                          + Add Shape
                        </button>
                      </div>
                    )
                  }
                </div>
              );
            })}
          </div>
        </div>
      </main >

      <Footer />
    </div >
  );
}
