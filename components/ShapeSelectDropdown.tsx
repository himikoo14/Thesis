// ShapeSelectDropdown.tsx
import { useState, useRef, useEffect } from "react";
import type { ShapeType } from "../types/shapes";


const SHAPE_ICONS: Record<ShapeType, JSX.Element> = {
    "Polygon": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <polygon points="12,2 22,9 18,21 6,21 2,9" />
        </svg>
    ),
    "Circle": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
        </svg>
    ),
    "Semi-circle-1": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            {/* flat side on bottom */}
            <path d="M2,12 A10,10 0 0,1 22,12 Z" />
            <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    "Semi-circle-2": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            {/* flat side on top */}
            <path d="M2,12 A10,10 0 0,0 22,12 Z" />
            <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    "Semi-circle-3": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            {/* flat side on left, dome facing right */}
            <path d="M12,2 A10,10 0 0,1 12,22 Z" />
            <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    "Semi-circle-4": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            {/* flat side on right, dome facing left */}
            <path d="M12,2 A10,10 0 0,0 12,22 Z" />
            <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    "Quarter-circle-1": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            {/* corner at bottom-left */}
            <path d="M2,22 L2,2 A20,20 0 0,1 22,22 Z" />
        </svg>
    ),
    "Quarter-circle-2": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            {/* corner at bottom-right */}
            <path d="M22,22 L22,2 A20,20 0 0,0 2,22 Z" />
        </svg>
    ),
    "Quarter-circle-3": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            {/* corner at top-left */}
            <path d="M2,2 L22,2 A20,20 0 0,1 2,22 Z" />
        </svg>
    ),
    "Quarter-circle-4": (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            {/* corner at top-right */}
            <path d="M22,2 L2,2 A20,20 0 0,0 22,22 Z" />
        </svg>
    ),
};

const SHAPE_LABELS: Record<ShapeType, string> = {
    "Polygon": "Polygon",
    "Circle": "Circle",
    "Semi-circle-1": "Semi-circle 1",
    "Semi-circle-2": "Semi-circle 2",
    "Semi-circle-3": "Semi-circle 3",
    "Semi-circle-4": "Semi-circle 4",
    "Quarter-circle-1": "Quarter-circle 1",
    "Quarter-circle-2": "Quarter-circle 2",
    "Quarter-circle-3": "Quarter-circle 3",
    "Quarter-circle-4": "Quarter-circle 4",
};

const ALL_SHAPES = Object.keys(SHAPE_LABELS) as ShapeType[];

export default function ShapeSelectDropdown({
    value,
    onChange,
}: {
    value: ShapeType;
    onChange: (v: ShapeType) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative w-full">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 rounded px-3 py-1 bg-white border border-gray-200 hover:border-gray-400 transition text-left"
            >
                <span className="text-gray-700">{SHAPE_ICONS[value]}</span>
                <span className="flex-1 text-sm">{SHAPE_LABELS[value]}</span>
                <span className={`transition-transform text-xs text-gray-400 ${open ? "rotate-180" : ""}`}>▼</span>
            </button>

            {/* Dropdown list */}
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {ALL_SHAPES.map(shape => (
                        <button
                            key={shape}
                            type="button"
                            onClick={() => { onChange(shape); setOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50 transition text-left
                ${value === shape ? "bg-blue-100 text-blue-800 font-semibold" : "text-gray-700"}`}
                        >
                            <span>{SHAPE_ICONS[shape]}</span>
                            <span>{SHAPE_LABELS[shape]}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}