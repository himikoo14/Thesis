"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

function sanitizeTeX(tex: string): string {
    return tex
        .replace(
            /(_\{[^}]+\})_([a-zA-Z])/g,
            (_match: string, sub: string, axis: string) => {
                const inner = sub.slice(2, -1);
                return `_{{${inner}}${axis}}`;
            }
        )
        .replace(/\\text\{units\}/g, "\\text{ units}")
        .replace(/\\text\{units\}\^4/g, "\\text{ units}^4")
        .replace(/\\text\{units\}\^2/g, "\\text{ units}^2");
}

function PrintableShapeDiagram({ shapes }: { shapes: any[] }) {
    const allX: number[] = [];
    const allY: number[] = [];

    shapes.forEach((shape) => {
        if (shape.type === "Polygon") {
            shape.nodes.forEach((n: any) => {
                allX.push(Number(n.x));
                allY.push(Number(n.y));
            });
        } else {
            const x = Number(shape.x);
            const y = Number(shape.y);
            const r = Number(shape.radius);
            allX.push(x - r, x + r);
            allY.push(y - r, y + r);
        }
    });

    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    const width = maxX - minX || 1;
    const height = maxY - minY || 1;

    const scale = Math.min(440 / width, 270 / height);

    const toSvgX = (x: number) => 60 + (x - minX) * scale;
    const toSvgY = (y: number) => 320 - (y - minY) * scale;

    return (
        <div className="rounded-2xl border border-[#dbe7ff] bg-white p-3 overflow-auto">
            <div className="min-w-[560px] flex justify-center">
                <svg width="560" height="380" viewBox="0 0 560 380">
                    {shapes.map((shape, shapeIndex) => {
                        if (shape.type === "Polygon") {
                            const points = shape.nodes
                                .map((n: any) => `${toSvgX(Number(n.x))},${toSvgY(Number(n.y))}`)
                                .join(" ");

                            return (
                                <polygon
                                    key={shapeIndex}
                                    points={points}
                                    fill={shape.hollow === "Hollow" ? "#ffffff" : "#dbeafe"}
                                    stroke="#1848a0"
                                    strokeWidth="2"
                                />
                            );
                        }

                        const x = toSvgX(Number(shape.x));
                        const y = toSvgY(Number(shape.y));
                        const r = Number(shape.radius) * scale;

                        return (
                            <g key={shapeIndex}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={r}
                                    fill={shape.hollow === "Hollow" ? "#ffffff" : "#dbeafe"}
                                    stroke="#1848a0"
                                    strokeWidth="2"
                                />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={4}
                                    fill="#dc2626"
                                    stroke="white"
                                    strokeWidth="1.5"
                                />
                                <text
                                    x={x + 10}
                                    y={y - 8}
                                    fontSize="11"
                                    fill="#dc2626"
                                    fontWeight="bold"
                                >
                                    C({Number(shape.x)}, {Number(shape.y)})
                                </text>
                                <line
                                    x1={x}
                                    y1={y}
                                    x2={x + r}
                                    y2={y}
                                    stroke="#16a34a"
                                    strokeWidth="2"
                                />
                                <text
                                    x={x + r / 2}
                                    y={y - 6}
                                    fontSize="11"
                                    fill="#16a34a"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                >
                                    r = {Number(shape.radius)}
                                </text>
                                <line
                                    x1={x - r}
                                    y1={y + r + 14}
                                    x2={x + r}
                                    y2={y + r + 14}
                                    stroke="#374151"
                                    strokeWidth="1.5"
                                />
                                <line
                                    x1={x - r}
                                    y1={y + r + 8}
                                    x2={x - r}
                                    y2={y + r + 20}
                                    stroke="#374151"
                                    strokeWidth="1.5"
                                />
                                <line
                                    x1={x + r}
                                    y1={y + r + 8}
                                    x2={x + r}
                                    y2={y + r + 20}
                                    stroke="#374151"
                                    strokeWidth="1.5"
                                />
                                <text
                                    x={x}
                                    y={y + r + 32}
                                    fontSize="11"
                                    fill="#374151"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                >
                                    D = {Number(shape.radius) * 2}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}

function PrintMOIContent() {
    const searchParams = useSearchParams();

    const raw =
        searchParams.get("data") ||
        (typeof window !== "undefined" ? localStorage.getItem("moiPdfData") : null);

    if (!raw) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                No data provided.
            </div>
        );
    }

    const parsed = JSON.parse(decodeURIComponent(raw));

    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 800);
        return () => clearTimeout(timer);
    }, []);



    return (
        <div className="min-h-screen bg-[#f8fafc] py-4 px-6" style={{ fontSize: "12px" }}>
            <div className="mx-auto max-w-5xl bg-white rounded-3xl shadow-xl p-5 space-y-4">
                <div className="border-b pb-4">
                    <h1 style={{ fontSize: "15px" }} className="font-bold text-[#1848a0]">
                        Moment of Inertia for Composite Shapes
                    </h1>
                    <p style={{ fontSize: "11px" }} className="text-gray-500 mt-1">
                        Generated: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <section>
                    <h2 style={{ fontSize: "13px" }} className="font-semibold text-gray-900 mb-3">
                        Composite Shape Diagram
                    </h2>
                    <PrintableShapeDiagram shapes={parsed.shapes} />
                </section>

                <section>
                    <h2 style={{ fontSize: "13px" }} className="font-semibold text-gray-900 mb-3">
                        Results Summary
                    </h2>
                    <div className="grid gap-2">
                        {parsed.resultRows.map(
                            (row: { label: string; value: string }, i: number) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-xl bg-[#f8fbff] border border-[#dbe7ff] px-4 py-2"
                                >
                                    <span style={{ fontSize: "11px" }} className="font-medium text-gray-700">
                                        {row.label}
                                    </span>
                                    <span style={{ fontSize: "11px" }} className="font-bold text-[#1848a0]">
                                        {row.value}
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                </section>

                <section>
                    <h2 style={{ fontSize: "13px" }} className="font-semibold text-gray-900 mb-3">
                        Step-by-Step Solution
                    </h2>
                    <div className="space-y-3">
                        {parsed.lines.map((line: any, i: number) => {
                            switch (line.kind) {
                                case "heading":
                                    return (
                                        <div
                                            key={i}
                                            style={{ fontSize: "12px" }}
                                            className="font-bold text-[#1848a0] pt-2"
                                        >
                                            {line.text}
                                        </div>
                                    );

                                case "subheading":
                                    return (
                                        <div
                                            key={i}
                                            style={{ fontSize: "11px" }}
                                            className="font-semibold text-gray-700 pt-1"
                                        >
                                            {line.text}
                                        </div>
                                    );

                                case "text":
                                    return (
                                        <div key={i} className="text-gray-700">
                                            {line.text}
                                        </div>
                                    );

                                case "eq":
                                    return (
                                        <div
                                            key={i}
                                            className="overflow-x-auto rounded-lg bg-gray-50 px-2 py-1"
                                            style={{ fontSize: "11px" }}
                                        >
                                            <BlockMath>{sanitizeTeX(line.tex)}</BlockMath>
                                        </div>
                                    );

                                case "result":
                                    return (
                                        <div
                                            key={i}
                                            className="overflow-x-auto rounded-lg border-l-4 border-[#1848a0] bg-[#f0f4ff] px-2 py-1"
                                            style={{ fontSize: "11px" }}
                                        >
                                            <BlockMath>{sanitizeTeX(line.tex)}</BlockMath>
                                        </div>
                                    );

                                case "spacer":
                                    return <div key={i} className="h-1" />;

                                default:
                                    return null;
                            }
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default function PrintMOIPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center text-gray-500">
                    Loading...
                </div>
            }
        >
            <PrintMOIContent />
        </Suspense>
    );
}