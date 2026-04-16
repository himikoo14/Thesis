"use client";

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

    const scale = Math.min(550 / width, 350 / height);

    const toSvgX = (x: number) => 75 + (x - minX) * scale;
    const toSvgY = (y: number) => 425 - (y - minY) * scale;

    return (
        <div className="rounded-2xl border border-[#dbe7ff] bg-white p-4 overflow-auto">
            <div className="min-w-[700px] flex justify-center">
                <svg width="700" height="500" viewBox="0 0 700 500">
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
                                    y={y - 10}
                                    fontSize="12"
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
                                    y={y - 8}
                                    fontSize="12"
                                    fill="#16a34a"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                >
                                    r = {Number(shape.radius)}
                                </text>

                                <line
                                    x1={x - r}
                                    y1={y + r + 18}
                                    x2={x + r}
                                    y2={y + r + 18}
                                    stroke="#374151"
                                    strokeWidth="1.5"
                                />

                                <line
                                    x1={x - r}
                                    y1={y + r + 12}
                                    x2={x - r}
                                    y2={y + r + 24}
                                    stroke="#374151"
                                    strokeWidth="1.5"
                                />

                                <line
                                    x1={x + r}
                                    y1={y + r + 12}
                                    x2={x + r}
                                    y2={y + r + 24}
                                    stroke="#374151"
                                    strokeWidth="1.5"
                                />

                                <text
                                    x={x}
                                    y={y + r + 38}
                                    fontSize="12"
                                    fill="#374151"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                >
                                    D = {Number(shape.radius) * 2}
                                </text>
                            </g>
                        );
                    })}
                </svg >
            </div >
        </div >
    );
}
export default function PrintMOIPage() {
    const searchParams = useSearchParams();

    const raw =
        searchParams.get("data") ||
        localStorage.getItem("moiPdfData");

    if (!raw) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                No data provided.
            </div>
        );
    }

    const parsed = JSON.parse(decodeURIComponent(raw));

    return (
        <div className="min-h-screen bg-[#f8fafc] py-10 px-6">
            <div className="mx-auto max-w-5xl bg-white rounded-3xl shadow-xl p-10 space-y-10">
                <div className="border-b pb-6">
                    <h1 className="text-3xl font-bold text-[#1848a0]">
                        Moment of Inertia for Composite Shapes
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Generated: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <section>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                        Composite Shape Diagram
                    </h2>

                    <PrintableShapeDiagram shapes={parsed.shapes} />
                </section>
                <section>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                        Results Summary
                    </h2>

                    <div className="grid gap-4">
                        {parsed.resultRows.map(
                            (row: { label: string; value: string }, i: number) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-2xl bg-[#f8fbff] border border-[#dbe7ff] px-5 py-4"
                                >
                                    <span className="font-medium text-gray-700">
                                        {row.label}
                                    </span>
                                    <span className="font-bold text-[#1848a0]">
                                        {row.value}
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                        Step-by-Step Solution
                    </h2>

                    <div className="space-y-6">
                        {parsed.lines.map((line: any, i: number) => {
                            switch (line.kind) {
                                case "heading":
                                    return (
                                        <div
                                            key={i}
                                            className="text-xl font-bold text-[#1848a0] pt-4"
                                        >
                                            {line.text}
                                        </div>
                                    );

                                case "subheading":
                                    return (
                                        <div
                                            key={i}
                                            className="text-lg font-semibold text-gray-700 pt-2"
                                        >
                                            {line.text}
                                        </div>
                                    );

                                case "text":
                                    return (
                                        <div key={i} className="text-gray-700 leading-relaxed">
                                            {line.text}
                                        </div>
                                    );

                                case "eq":
                                    return (
                                        <div
                                            key={i}
                                            className="overflow-x-auto rounded-xl bg-gray-50 p-4"
                                        >
                                            <BlockMath>{sanitizeTeX(line.tex)}</BlockMath>
                                        </div>
                                    );

                                case "result":
                                    return (
                                        <div
                                            key={i}
                                            className="overflow-x-auto rounded-xl border-l-4 border-[#1848a0] bg-[#f0f4ff] p-4"
                                        >
                                            <BlockMath>{sanitizeTeX(line.tex)}</BlockMath>
                                        </div>
                                    );

                                case "spacer":
                                    return <div key={i} className="h-2" />;

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