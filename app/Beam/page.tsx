"use client";

import { useState, useRef, useEffect } from "react";
import { solveBeam, BeamResult } from "../../lib/beamEngine";

/* ===================== TYPES ===================== */

type Support = {
  type: "Pinned" | "Roller";
  location: string;
};

type PointLoad = {
  magnitude: string;
  location: string;
};

type DistributedLoad = {
  start: string;
  end: string;
  startMag: string;
  endMag: string;
};

type GenericObject = Record<string, any>;

/* ===================== SVG FREE BODY DIAGRAM ===================== */

function BeamFBD({
  beamLength,
  supports,
  pointLoads,
  distributedLoads,
  result,
}: {
  beamLength: string;
  supports: Support[];
  pointLoads: PointLoad[];
  distributedLoads: DistributedLoad[];
  result: BeamResult | null;
}) {
  const L = parseFloat(beamLength);
  if (!L || L <= 0) {
return (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "200px",
      width: "100%",
      textAlign: "center",
      color: "#9ca3af",
      fontSize: 14,
    }}
  >
    Enter a beam length to see the diagram
  </div>
);
  }

  const W = 680;
  const H = 260;
  const padL = 60;
  const padR = 60;
  const beamY = 160;
  const beamH = 14;
  const drawW = W - padL - padR;
  const scale = drawW / L;
  const toX = (m: number) => padL + m * scale;

  const allMags = [
    ...pointLoads.map(p => Math.abs(parseFloat(p.magnitude) || 0)),
    ...distributedLoads.map(d => Math.max(Math.abs(parseFloat(d.startMag) || 0), Math.abs(parseFloat(d.endMag) || 0))),
  ];
  const maxMag = Math.max(1, ...allMags);
  const maxArrowH = 60;
  const arrowH = (mag: number) => Math.max(10, (Math.abs(mag) / maxMag) * maxArrowH);
  const maxReaction = result ? Math.max(...result.reactions.map(r => Math.abs(r.vertical))) : 1;
  const reactionArrowH = (v: number) => Math.max(10, (Math.abs(v) / Math.max(maxReaction, 1)) * 50);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
          <polygon points="0,0 8,0 4,8" fill="#1848a0" />
        </marker>
        <marker id="arrowUp" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="auto">
          <polygon points="0,8 8,8 4,0" fill="#009900" />
        </marker>
      </defs>

      {distributedLoads.map((d, i) => {
        const xs = parseFloat(d.start);
        const xe = parseFloat(d.end);
        const ws = parseFloat(d.startMag);
        const we = parseFloat(d.endMag);
        if (isNaN(xs) || isNaN(xe) || isNaN(ws) || isNaN(we) || xe <= xs) return null;
        const x1 = toX(xs);
        const x2 = toX(xe);
        const hs = arrowH(ws);
        const he = arrowH(we);
        const topY1 = beamY - hs;
        const topY2 = beamY - he;
        const numLines = Math.max(2, Math.round((x2 - x1) / 18));
        const lines = [];
        for (let j = 0; j <= numLines; j++) {
          const t = j / numLines;
          const lx = x1 + t * (x2 - x1);
          const topY = topY1 + t * (topY2 - topY1);
          lines.push(
            <line key={j} x1={lx} y1={topY} x2={lx} y2={beamY}
              stroke="#1848a0" strokeWidth="1.5" markerEnd="url(#arrowDown)" />
          );
        }
        return (
          <g key={i}>
            <polygon
              points={`${x1},${topY1} ${x2},${topY2} ${x2},${beamY} ${x1},${beamY}`}
              fill="#1848a055" stroke="#1848a0" strokeWidth="1.5"
            />
            {lines}
            <line x1={x1} y1={topY1} x2={x2} y2={topY2} stroke="#1848a0" strokeWidth="2" />
            <text x={(x1 + x2) / 2} y={Math.min(topY1, topY2) - 6}
              textAnchor="middle" fontSize="11" fill="#1848a0" fontFamily="monospace">
              {ws}–{we} kN/m
            </text>
          </g>
        );
      })}

      {pointLoads.map((p, i) => {
        const m = parseFloat(p.magnitude);
        const x = parseFloat(p.location);
        if (isNaN(m) || isNaN(x) || m === 0) return null;
        const h = arrowH(m);
        const px = toX(x);
        return (
          <g key={i}>
            <line x1={px} y1={beamY - h} x2={px} y2={beamY}
              stroke="#1848a0" strokeWidth="2.5" markerEnd="url(#arrowDown)" />
            <text x={px} y={beamY - h - 6} textAnchor="middle" fontSize="12"
              fill="#1848a0" fontWeight="bold" fontFamily="monospace">
              {m} kN
            </text>
          </g>
        );
      })}

      <rect x={padL} y={beamY} width={drawW} height={beamH}
        fill="#d1d5db" stroke="#374151" strokeWidth="2" rx="2" />

      <line x1={padL} y1={beamY + beamH + 22} x2={padL + drawW} y2={beamY + beamH + 22}
        stroke="#9ca3af" strokeWidth="1" markerEnd="url(#arrowDown)" markerStart="url(#arrowUp)" />
      <text x={padL + drawW / 2} y={beamY + beamH + 36}
        textAnchor="middle" fontSize="12" fill="#6b7280" fontFamily="monospace">
        L = {L} m
      </text>

      {supports.map((s, i) => {
        const x = parseFloat(s.location);
        if (isNaN(x)) return null;
        const sx = toX(x);
        const sy = beamY + beamH;
        const reaction = result?.reactions.find(r => Math.abs(r.location - x) < 0.01);
        const rv = reaction?.vertical ?? 0;
        const rh = reactionArrowH(rv);
        return (
          <g key={i}>
            {result && (
              <>
                <line x1={sx} y1={sy + rh + 8} x2={sx} y2={sy + 2}
                  stroke="#009900" strokeWidth="2.5" markerEnd="url(#arrowUp)" />
                <text x={sx} y={sy + rh + 22} textAnchor="middle"
                  fontSize="11" fill="#009900" fontWeight="bold" fontFamily="monospace">
                  R={rv.toFixed(2)} kN
                </text>
              </>
            )}
            {s.type === "Pinned" && (
              <polygon
                points={`${sx},${sy} ${sx - 12},${sy + 18} ${sx + 12},${sy + 18}`}
                fill="#fbbf24" stroke="#92400e" strokeWidth="1.5"
              />
            )}
            {s.type === "Roller" && (
              <>
                <polygon
                  points={`${sx},${sy} ${sx - 12},${sy + 18} ${sx + 12},${sy + 18}`}
                  fill="#a5f3fc" stroke="#0e7490" strokeWidth="1.5"
                />
                <circle cx={sx} cy={sy + 24} r={5} fill="none" stroke="#0e7490" strokeWidth="1.5" />
              </>
            )}
            <text x={sx} y={beamY + beamH + (result ? 18 : 0) + 52}
              textAnchor="middle" fontSize="11" fill="#374151" fontFamily="monospace">
              {x} m
            </text>
          </g>
        );
      })}

      <rect x={padL} y={8} width={10} height={10} fill="#1848a055" stroke="#1848a0" strokeWidth="1" />
      <text x={padL + 14} y={18} fontSize="11" fill="#1848a0" fontFamily="monospace">Applied Load</text>
      {result && (
        <>
          <line x1={padL + 100} y1={18} x2={padL + 110} y2={8} stroke="#009900" strokeWidth="2" />
          <text x={padL + 114} y={18} fontSize="11" fill="#009900" fontFamily="monospace">Reaction</text>
        </>
      )}
    </svg>
  );
}

/* ===================== KaTeX Block ===================== */

function MathBlock({ children }: { children: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current || !(window as any).katex) return;
    try {
      (window as any).katex.render(children.trim(), ref.current, { displayMode: true, throwOnError: false });
    } catch (e) { }
  }, [children]);
  return <div ref={ref} style={{ overflowX: "auto", margin: "4px 0" }} />;
}

/* ===================== MAIN COMPONENT ===================== */

export default function BeamSolverUI() {

  const [beamLength, setBeamLength] = useState("");
  const [supports, setSupports] = useState<Support[]>([{ type: "Pinned", location: "" }]);
  const [pointLoads, setPointLoads] = useState<PointLoad[]>([{ magnitude: "", location: "" }]);
  const [distributedLoads, setDistributedLoads] = useState<DistributedLoad[]>([{ start: "", end: "", startMag: "", endMag: "" }]);
  const [result, setResult] = useState<BeamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [katexLoaded, setKatexLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).katex) { setKatexLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    script.onload = () => setKatexLoaded(true);
    document.head.appendChild(script);
  }, []);

  /* ---------- STYLES ---------- */

  const inputStyle: React.CSSProperties = {
    width: "100%", marginTop: 4, borderRadius: 8, border: "1px solid #d1d5db",
    fontSize: 16, padding: "8px 10px", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontWeight: 500, fontSize: 16 };
  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)", padding: 24,
  };
  const greenButtonStyle: React.CSSProperties = {
    background: "#008409", color: "#fff", border: "none", borderRadius: 8,
    padding: "8px 16px", fontSize: 15, cursor: "pointer", fontFamily: "inherit", marginTop: 8,
  };
  const redButtonStyle: React.CSSProperties = {
    background: "#ef4444", color: "#fff", border: "none", borderRadius: 8,
    padding: "4px 12px", cursor: "pointer", fontSize: 18, fontFamily: "inherit",
    alignSelf: "end", marginBottom: 4,
  };
  const sectionHeadingStyle: React.CSSProperties = { fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 16 };
  const subHeadingStyle: React.CSSProperties = { fontSize: 15, fontWeight: 600, marginTop: 20, marginBottom: 8, color: "#374151" };

  /* ---------- GENERIC HANDLERS ---------- */

  const handleChange = <T extends GenericObject>(
    arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>,
    index: number, field: keyof T, value: T[keyof T]
  ) => { const n = [...arr]; n[index][field] = value; setArr(n); };

  const addItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, template: T) =>
    setArr([...arr, template]);

  const removeItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number) =>
    setArr(arr.filter((_, i) => i !== index));

  /* ---------- CALCULATE ---------- */

  const calculate = () => {
    setError(null);
    try {
      const res = solveBeam({
        beamLength: parseFloat(beamLength),
        supports: supports.map(s => ({ type: s.type, location: parseFloat(s.location) })),
        pointLoads: pointLoads
          .filter(p => p.magnitude !== "" && p.location !== "")
          .map(p => ({ magnitude: parseFloat(p.magnitude), location: parseFloat(p.location) })),
        distributedLoads: distributedLoads
          .filter(d => d.start !== "" && d.end !== "" && d.startMag !== "" && d.endMag !== "")
          .map(d => ({
            start: parseFloat(d.start), end: parseFloat(d.end),
            startMag: parseFloat(d.startMag), endMag: parseFloat(d.endMag),
          })),
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "An error occurred.");
    }
  };

  /* ===================== JSX ===================== */

  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: "100vh",
      background: "#f3f4f6", fontFamily: "Georgia, 'Times New Roman', serif",
      color: "#111", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 760, padding: "0 16px 40px" }}>

        <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginTop: 28, marginBottom: 4 }}>
          Non-Concurrent Force System Calculator
        </h1>
        <h2 style={{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 20, color: "#374151" }}>
          Real-Time Free Body Diagram
        </h2>

        {/* FBD */}
        <div style={{ ...cardStyle, marginBottom: 24, padding: 16, border: "1px solid #e5e7eb", minHeight: 200 }}>
          <BeamFBD
            beamLength={beamLength}
            supports={supports}
            pointLoads={pointLoads}
            distributedLoads={distributedLoads}
            result={result}
          />
        </div>

        {/* INPUT PANELS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

          {/* BEAM PROPERTIES */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}>Beam Properties</h3>
            <label style={labelStyle}>Beam Length</label>
            <input type="number" placeholder="m" value={beamLength}
              onChange={(e) => { setBeamLength(e.target.value); setResult(null); }}
              style={inputStyle} />

            <p style={subHeadingStyle}>Supports</p>
            {supports.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={s.type}
                    onChange={(e) => handleChange(supports, setSupports, i, "type", e.target.value as Support["type"])}
                    style={inputStyle}>
                    <option>Pinned</option>
                    <option>Roller</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Location (m)</label>
                  <input type="number" placeholder="m" value={s.location}
                    onChange={(e) => handleChange(supports, setSupports, i, "location", e.target.value)}
                    style={inputStyle} />
                </div>
                {supports.length > 1 && (
                  <button onClick={() => removeItem(supports, setSupports, i)}
                    style={redButtonStyle}>–</button>
                )}
              </div>
            ))}
            <button onClick={() => addItem(supports, setSupports, { type: "Pinned", location: "" })}
              style={greenButtonStyle}>+ Add Support</button>
          </div>

          {/* LOADS */}
          <div style={cardStyle}>
            <h3 style={sectionHeadingStyle}>Loads</h3>

            <p style={{ ...subHeadingStyle, marginTop: 0 }}>Point Loads</p>
            {pointLoads.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Magnitude (kN)</label>
                  <input type="number" placeholder="kN" value={p.magnitude}
                    onChange={(e) => handleChange(pointLoads, setPointLoads, i, "magnitude", e.target.value)}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Location (m)</label>
                  <input type="number" placeholder="m" value={p.location}
                    onChange={(e) => handleChange(pointLoads, setPointLoads, i, "location", e.target.value)}
                    style={inputStyle} />
                </div>
                {pointLoads.length > 1 && (
                  <button onClick={() => removeItem(pointLoads, setPointLoads, i)}
                    style={redButtonStyle}>–</button>
                )}
              </div>
            ))}
            <button onClick={() => addItem(pointLoads, setPointLoads, { magnitude: "", location: "" })}
              style={greenButtonStyle}>+ Add Point Load</button>

            <p style={subHeadingStyle}>Distributed Loads</p>
            {distributedLoads.map((d, i) => (
              <div key={i} style={{ marginBottom: 14 }}>

                {/* Row 1: Start Position | End Position | – */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 6 }}>
                  <div>
                    <label style={labelStyle}>Start Position (m)</label>
                    <input type="number" placeholder="m" value={d.start}
                      onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "start", e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>End Position (m)</label>
                    <input type="number" placeholder="m" value={d.end}
                      onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "end", e.target.value)}
                      style={inputStyle} />
                  </div>
                  {distributedLoads.length > 1 && (
                    <button onClick={() => removeItem(distributedLoads, setDistributedLoads, i)}
                      style={redButtonStyle}>–</button>
                  )}
                  {/* Spacer to keep grid aligned when button is hidden */}
                  {distributedLoads.length === 1 && <div />}
                </div>

                {/* Row 2: Start Mag | End Mag */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Start Mag. (kN/m)</label>
                    <input type="number" placeholder="kN/m" value={d.startMag}
                      onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "startMag", e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>End Mag. (kN/m)</label>
                    <input type="number" placeholder="kN/m" value={d.endMag}
                      onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "endMag", e.target.value)}
                      style={inputStyle} />
                  </div>
                </div>

              </div>
            ))}
            <button onClick={() => addItem(distributedLoads, setDistributedLoads, { start: "", end: "", startMag: "", endMag: "" })}
              style={greenButtonStyle}>+ Add Distributed Load</button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#991b1b", fontSize: 15 }}>
            ⚠ {error}
          </div>
        )}

        {/* CALCULATE */}
        <button onClick={calculate} style={{
          width: "100%", background: "#1848a0", color: "#fff", border: "none",
          borderRadius: 8, padding: "14px 0", fontSize: 16, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", marginBottom: 20,
        }}>
          Calculate
        </button>

        {/* RESULTS */}
        {result && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 14 }}>Reactions</h2>
            {result.reactions.map((r, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <label style={labelStyle}>{r.type} at x = {r.location} m</label>
                <input type="text" readOnly
                  value={`R = ${r.vertical.toFixed(3)} kN (vertical)`}
                  style={{ ...inputStyle, background: "#f9fafb", color: "#374151" }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div>
                <label style={labelStyle}>Max Shear Force</label>
                <input type="text" readOnly value={`${result.maxShear.toFixed(3)} kN`}
                  style={{ ...inputStyle, background: "#f9fafb", color: "#374151" }} />
              </div>
              <div>
                <label style={labelStyle}>Max Bending Moment</label>
                <input type="text" readOnly value={`${result.maxMoment.toFixed(3)} kN·m at x = ${result.maxMomentLocation.toFixed(3)} m`}
                  style={{ ...inputStyle, background: "#f9fafb", color: "#374151" }} />
              </div>
            </div>
          </div>
        )}

        {/* STEP BY STEP */}
        {result && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Step-by-Step Solution</h2>
            <div style={{ lineHeight: 1.8 }}>
              {result.steps.map((line, i) =>
                line.startsWith("Step") ? (
                  <p key={i} style={{ fontWeight: 600, fontSize: 16, marginTop: 14, marginBottom: 4 }}>{line}</p>
                ) : katexLoaded ? (
                  <MathBlock key={i}>{line}</MathBlock>
                ) : (
                  <pre key={i} style={{ fontSize: 13, color: "#555" }}>{line}</pre>
                )
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
