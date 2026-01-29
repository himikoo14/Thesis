"use client";

import { useState } from "react";
import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";
import CircularInputs from "<Ian>/components/CircularInputs";

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

export default function DistributedLoadPage() {
  /* ---------------- STATES ---------------- */
  const [shapeType, setShapeType] = useState<ShapeType>("Polygon");
  const [hollow, setHollow] = useState("Hollow");

  // controls number of shape cards
  const [shapeCards, setShapeCards] = useState<number[]>([0]);
  const [openCardIndex, setOpenCardIndex] = useState<number | null>(null);

  // Polygon
  const [nodes, setNodes] = useState<XY[]>([
    { x: "", y: "" },
    { x: "", y: "" },
  ]);

  const [sides, setSides] = useState<{ a: number; b: number }[]>([
    { a: 0, b: 1 },
  ]);

  // Circular shapes
  const [radius, setRadius] = useState("");
  const [circleX, setCircleX] = useState("");
  const [circleY, setCircleY] = useState("");

  const isCircularShape = shapeType !== "Polygon";

  /* ---------------- HELPERS ---------------- */
  const updateNode = (i: number, key: "x" | "y", value: string) => {
    const copy = [...nodes];
    copy[i][key] = value;
    setNodes(copy);
  };

  const addNode = () => setNodes([...nodes, { x: "", y: "" }]);

  const removeNode = (i: number) => {
    if (nodes.length > 2) {
      setNodes(nodes.filter((_, idx) => idx !== i));
      setSides(sides.filter(s => s.a !== i && s.b !== i));
    }
  };

  const addSide = () => {
    if (nodes.length >= 2) {
      setSides([...sides, { a: 0, b: 1 }]);
    }
  };

  const updateSide = (i: number, key: "a" | "b", value: number) => {
    const copy = [...sides];
    copy[i][key] = value;
    setSides(copy);
  };

  const removeSide = (i: number) =>
    setSides(sides.filter((_, idx) => idx !== i));

  // ✅ ONLY adds another Shape card
  const handleAddShape = () => {
    setShapeCards(prev => [...prev, prev.length]);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Moment of Inertia for Composite Shapes Calculator
        </h1>

        {/* Canvas */}
        <div className="bg-white rounded-xl h-[280px] mb-6 shadow-sm" />

        {/* Note */}
        <p className="text-sm text-gray-700 mb-4">
          <span className="font-semibold">Note:</span> The most lower left point
          of the composite shape should be at (0,0).
        </p>

        {/* Shape Cards */}
        {shapeCards.map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow px-6 py-4 w-[340px] mb-4"
          >
            <h3 className="font-semibold mb-3">
              Shape {index + 1}
            </h3>

            {/* Options Button */}
            <button
              onClick={() =>
                setOpenCardIndex(openCardIndex === index ? null : index)
              }
              className="w-full flex items-center justify-between bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg"
            >
              Options
              <span
                className={`transition-transform ${
                  openCardIndex === index ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {/* OPTIONS PANEL */}
            {openCardIndex === index && (
              <div className="mt-4 bg-white rounded-xl shadow px-6 py-4 space-y-4">
                {/* Shape Type */}
                <select
                  value={shapeType}
                  onChange={e =>
                    setShapeType(e.target.value as ShapeType)
                  }
                  className="w-full rounded px-3 py-1 bg-white shadow-sm"
                >
                  <option value="Polygon">Polygon</option>
                  <option value="Circle">Circle</option>
                  <option value="Semi-circle-1">Semi-circle-1</option>
                  <option value="Semi-circle-2">Semi-circle-2</option>
                  <option value="Quarter-circle-1">Quarter-circle-1</option>
                  <option value="Quarter-circle-2">Quarter-circle-2</option>
                  <option value="Quarter-circle-3">Quarter-circle-3</option>
                  <option value="Quarter-circle-4">Quarter-circle-4</option>
                </select>

                {/* Hollow / Solid */}
                <select
                  value={hollow}
                  onChange={e => setHollow(e.target.value)}
                  className="w-full rounded px-3 py-1 bg-white shadow-sm"
                >
                  <option>Hollow</option>
                  <option>Solid</option>
                </select>

                {isCircularShape && (
                  <CircularInputs
                    radius={radius}
                    x={circleX}
                    y={circleY}
                    onRadiusChange={setRadius}
                    onXChange={setCircleX}
                    onYChange={setCircleY}
                  />
                )}

                <button
                  onClick={handleAddShape}
                  className="w-full bg-green-700 text-white py-2 rounded-lg font-semibold"
                >
                  + Add Shape
                </button>
              </div>
            )}
          </div>
        ))}
      </main>

      <Footer />
    </div>
  );
}
