"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ShapeCanvas from "../../components/Lat2";
import {
  computeLateralEarthPressure,
  computeStability,
  formatResult,
  type ShapeData,
  type DistributedLoad,
  type AnalysisMethod,
  type LateralEarthPressureResult,
  type StabilityResult,
} from "../../lib/Lat";

/* ===================== TYPES ===================== */
type WallType = "Wall 1" | "Wall 2" | "Wall 3" | "Sheet Pile";
type MaterialType = "Active Soil" | "Passive Soil";

/* ── Concrete (left panel) ── */
interface ConcreteData {
  gammaConcrete: string;
  wallType: WallType;
  wall1: { a: string; b: string };
  wall2: { a: string; b: string };
  wall3: { A: string; B: string; C: string; D: string; E: string; F: string };
  sheetPile: { a: string };
}

/* ── Soil layer ── */
interface SoilLayer {
  gamma: string;
  phi: string;
  cohesion: string;
  beta: string;
  isSaturated: boolean;
  from: string;
  to: string;
  base: string;
}

/* ── Shape card (soil only) ── */
interface ShapeCardData {
  material: MaterialType;
  isOpen: boolean;
  visible: boolean;
  layers: SoilLayer[];
}

/* ── Distributed load ── */
interface NewDistLoad {
  side: "Active" | "Passive";
  q: string;
}

/* ===================== DEFAULTS ===================== */
function defaultSoilLayer(): SoilLayer {
  return { gamma: "", phi: "", cohesion: "", beta: "", isSaturated: false, from: "", to: "", base: "" };
}

function defaultShapeCard(): ShapeCardData {
  return {
    material: "Active Soil",
    isOpen: true,
    visible: true,
    layers: [defaultSoilLayer()],
  };
}

function defaultConcrete(): ConcreteData {
  return {
    gammaConcrete: "",
    wallType: "Wall 1",
    wall1: { a: "", b: "" },
    wall2: { a: "", b: "" },
    wall3: { A: "", B: "", C: "", D: "", E: "", F: "" },
    sheetPile: { a: "" },
  };
}

function defaultDistLoad(): NewDistLoad {
  return { side: "Active", q: "" };
}

/* ── Auto-label: Active Soil A, B... / Passive Soil A, B... ── */
function getSoilLabel(shapes: ShapeCardData[], currentIndex: number): string {
  const current = shapes[currentIndex];
  let count = 0;
  for (let i = 0; i <= currentIndex; i++) {
    if (shapes[i].material === current.material) count++;
  }
  const letter = String.fromCharCode(64 + count);
  return `${current.material} ${letter}`;
}

/* ===================== WALL DIMS EDITOR (left panel) ===================== */
function WallDimsEditor({
  concrete,
  onUpdate,
}: {
  concrete: ConcreteData;
  onUpdate: (patch: Partial<ConcreteData>) => void;
}) {
  const inputCls = "w-full rounded bg-gray-100 border border-gray-200 px-2 py-1 text-sm focus:outline-none";

  if (concrete.wallType === "Wall 1") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-500 mb-1">a — width (m)</p>
          <input placeholder="width" value={concrete.wall1.a}
            onChange={e => onUpdate({ wall1: { ...concrete.wall1, a: e.target.value } })}
            className={inputCls} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">b — height (m)</p>
          <input placeholder="height" value={concrete.wall1.b}
            onChange={e => onUpdate({ wall1: { ...concrete.wall1, b: e.target.value } })}
            className={inputCls} />
        </div>
      </div>
    );
  }

  if (concrete.wallType === "Wall 2") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-500 mb-1">a — base (m)</p>
          <input placeholder="base" value={concrete.wall2.a}
            onChange={e => onUpdate({ wall2: { ...concrete.wall2, a: e.target.value } })}
            className={inputCls} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">b — height (m)</p>
          <input placeholder="height" value={concrete.wall2.b}
            onChange={e => onUpdate({ wall2: { ...concrete.wall2, b: e.target.value } })}
            className={inputCls} />
        </div>
      </div>
    );
  }

  if (concrete.wallType === "Wall 3") {
    const w3 = concrete.wall3;
    return (
      <div className="grid grid-cols-2 gap-2">
        {(["A", "B", "C", "D", "E", "F"] as const).map(key => (
          <div key={key}>
            <p className="text-xs text-gray-500 mb-1">
              {key === "A" ? "A — height (m)" :
                key === "B" ? "B — base width (m)" :
                  key === "C" ? "C — footing thickness (m)" :
                    key === "D" ? "D — stem width at top (m)" :
                      key === "E" ? "E — stem width at base (m)" :
                        "F — heel to stem (m)"}
            </p>
            <input placeholder={key} value={w3[key]}
              onChange={e => onUpdate({ wall3: { ...w3, [key]: e.target.value } })}
              className={inputCls} />
          </div>
        ))}
      </div>
    );
  }

  if (concrete.wallType === "Sheet Pile") {
    return (
      <div>
        <p className="text-xs text-gray-500 mb-1">a — height (m)</p>
        <input placeholder="height" value={concrete.sheetPile.a}
          onChange={e => onUpdate({ sheetPile: { a: e.target.value } })}
          className={inputCls} />
      </div>
    );
  }

  return null;
}

/* ===================== SOIL LAYER EDITOR ===================== */
function SoilLayerEditor({
  layers,
  onChange,
}: {
  layers: SoilLayer[];
  onChange: (layers: SoilLayer[]) => void;
}) {
  const update = (i: number, patch: Partial<SoilLayer>) => {
    onChange(layers.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };

  const addLayer = () => onChange([...layers, defaultSoilLayer()]);

  const removeLayer = (i: number) => {
    if (layers.length === 1) return;
    onChange(layers.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-4">
      {layers.map((layer, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
          {layers.length > 1 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Layer {i + 1}</span>
              <button onClick={() => removeLayer(i)}
                className="w-6 h-6 bg-red-500 text-white rounded font-bold text-xs flex items-center justify-center">–</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">γ (kN/m³)</p>
              <input placeholder="unit weight" value={layer.gamma}
                onChange={e => update(i, { gamma: e.target.value })}
                className="w-full rounded bg-white border border-gray-200 px-2 py-1 text-sm focus:outline-none" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">φ (°)</p>
              <input placeholder="friction angle" value={layer.phi}
                onChange={e => update(i, { phi: e.target.value })}
                className="w-full rounded bg-white border border-gray-200 px-2 py-1 text-sm focus:outline-none" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">c (kPa)</p>
              <input placeholder="cohesion" value={layer.cohesion}
                onChange={e => update(i, { cohesion: e.target.value })}
                className="w-full rounded bg-white border border-gray-200 px-2 py-1 text-sm focus:outline-none" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">β (°)</p>
              <input placeholder="slope angle" value={layer.beta}
                onChange={e => update(i, { beta: e.target.value })}
                className="w-full rounded bg-white border border-gray-200 px-2 py-1 text-sm focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={layer.isSaturated}
              onChange={e => update(i, { isSaturated: e.target.checked })} />
            <span className="text-sm text-gray-600">Saturated</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">From (m)</p>
              <input placeholder="0" value={layer.from}
                onChange={e => update(i, { from: e.target.value })}
                className="w-full rounded bg-white border border-gray-200 px-2 py-1 text-sm focus:outline-none" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">To (m)</p>
              <input placeholder="depth" value={layer.to}
                onChange={e => update(i, { to: e.target.value })}
                className="w-full rounded bg-white border border-gray-200 px-2 py-1 text-sm focus:outline-none" />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Base (m)</p>
              <input placeholder="base width" value={layer.base}
                onChange={e => update(i, { base: e.target.value })}
                className="w-full rounded bg-white border border-gray-200 px-2 py-1 text-sm focus:outline-none" />
            </div>
          </div>
        </div>
      ))}

      <button onClick={addLayer}
        className="w-full bg-[#008409] text-white py-1.5 rounded-lg font-semibold hover:bg-[#15711b] transition text-sm">
        + Add Layer
      </button>
    </div>
  );
}

/* ===================== RESULT PANEL ===================== */
function ResultsPanel({
  result,
  stability,
}: {
  result: LateralEarthPressureResult;
  stability: StabilityResult | null;
}) {
  const round = (v: number, n = 3) => Math.round(v * 10 ** n) / 10 ** n;

  return (
    <>
      <div className="mt-10 bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Results — {result.method}</h2>

        {result.warnings.length > 0 && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-yellow-800 text-sm">⚠ {w}</p>
            ))}
          </div>
        )}

        {result.layers.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">Soil Layers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-3 py-2 border border-gray-200">Layer</th>
                    <th className="px-3 py-2 border border-gray-200">γ (kN/m³)</th>
                    <th className="px-3 py-2 border border-gray-200">φ (°)</th>
                    <th className="px-3 py-2 border border-gray-200">c (kPa)</th>
                    <th className="px-3 py-2 border border-gray-200">Ka</th>
                    <th className="px-3 py-2 border border-gray-200">Kp</th>
                    <th className="px-3 py-2 border border-gray-200">Thickness (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.layers.map((l, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-200 font-medium">{i + 1}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(l.gamma)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(l.phi)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(l.cohesion)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(l.Ka, 4)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(l.Kp, 4)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(l.thickness)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Total Active Force</p>
            <p className="text-2xl font-bold text-red-700">{round(result.totalActiveForce, 3)} <span className="text-base font-normal">kN/m</span></p>
            <p className="text-sm text-red-600 mt-1">Moment: {round(result.totalActiveMomentAboutBase, 3)} kN·m/m</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Total Passive Force</p>
            <p className="text-2xl font-bold text-blue-700">{round(result.totalPassiveForce, 3)} <span className="text-base font-normal">kN/m</span></p>
            <p className="text-sm text-blue-600 mt-1">Moment: {round(result.totalPassiveMomentAboutBase, 3)} kN·m/m</p>
          </div>
          <div className={`rounded-lg p-4 border ${result.netForce >= 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${result.netForce >= 0 ? "text-orange-600" : "text-green-600"}`}>Net Force (Pa − Pp)</p>
            <p className={`text-2xl font-bold ${result.netForce >= 0 ? "text-orange-700" : "text-green-700"}`}>{round(result.netForce, 3)} <span className="text-base font-normal">kN/m</span></p>
            <p className={`text-sm mt-1 ${result.netForce >= 0 ? "text-orange-600" : "text-green-600"}`}>Net Moment: {round(result.netMoment, 3)} kN·m/m</p>
          </div>
        </div>

        {result.surchargeForces.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">Surcharge Forces</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-3 py-2 border border-gray-200">Label</th>
                    <th className="px-3 py-2 border border-gray-200">Force (kN/m)</th>
                    <th className="px-3 py-2 border border-gray-200">Arm from Base (m)</th>
                    <th className="px-3 py-2 border border-gray-200">Moment (kN·m/m)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.surchargeForces.map((f, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-200 font-medium">{f.label}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(f.magnitude, 3)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(f.armFromBase, 3)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(f.moment, 3)}</td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-50 font-semibold">
                    <td className="px-3 py-2 border border-gray-200">TOTAL</td>
                    <td className="px-3 py-2 border border-gray-200">{round(result.totalSurchargeForce, 3)}</td>
                    <td className="px-3 py-2 border border-gray-200">—</td>
                    <td className="px-3 py-2 border border-gray-200">{round(result.totalSurchargeMoment, 3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result.activeForces.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">Active Force Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-3 py-2 border border-gray-200">Label</th>
                    <th className="px-3 py-2 border border-gray-200">Force (kN/m)</th>
                    <th className="px-3 py-2 border border-gray-200">Arm from Base (m)</th>
                    <th className="px-3 py-2 border border-gray-200">Moment (kN·m/m)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.activeForces.map((f, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-200 font-medium">{f.label}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(f.magnitude, 3)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(f.armFromBase, 3)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(f.moment, 3)}</td>
                    </tr>
                  ))}
                  <tr className="bg-red-50 font-semibold">
                    <td className="px-3 py-2 border border-gray-200">TOTAL Pa</td>
                    <td className="px-3 py-2 border border-gray-200">{round(result.totalActiveForce, 3)}</td>
                    <td className="px-3 py-2 border border-gray-200">—</td>
                    <td className="px-3 py-2 border border-gray-200">{round(result.totalActiveMomentAboutBase, 3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result.passiveForces.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">Passive Force Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-3 py-2 border border-gray-200">Label</th>
                    <th className="px-3 py-2 border border-gray-200">Force (kN/m)</th>
                    <th className="px-3 py-2 border border-gray-200">Arm from Base (m)</th>
                    <th className="px-3 py-2 border border-gray-200">Moment (kN·m/m)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.passiveForces.map((f, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-200 font-medium">{f.label}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(f.magnitude, 3)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(f.armFromBase, 3)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(f.moment, 3)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-semibold">
                    <td className="px-3 py-2 border border-gray-200">TOTAL Pp</td>
                    <td className="px-3 py-2 border border-gray-200">{round(result.totalPassiveForce, 3)}</td>
                    <td className="px-3 py-2 border border-gray-200">—</td>
                    <td className="px-3 py-2 border border-gray-200">{round(result.totalPassiveMomentAboutBase, 3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Step-by-Step Solution</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-semibold">1. Identify Soil Properties</p>
              <p>γ = {result.layers[0]?.gamma} kN/m³, φ = {result.layers[0]?.phi}°, c = {result.layers[0]?.cohesion} kPa</p>
            </div>
            <div>
              <p className="font-semibold">2. Compute Earth Pressure Coefficients</p>
              <p>Ka = {result.layers[0]?.Ka.toFixed(4)}, Kp = {result.layers[0]?.Kp.toFixed(4)}</p>
            </div>
            <div>
              <p className="font-semibold">3. Compute Active Pressure</p>
              <p>Pa = ½ × Ka × γ × H²</p>
              <p className="text-xs text-gray-500">Result: {result.totalActiveForce.toFixed(3)} kN/m</p>
            </div>
            <div>
              <p className="font-semibold">4. Compute Passive Pressure</p>
              <p>Pp = ½ × Kp × γ × H²</p>
              <p className="text-xs text-gray-500">Result: {result.totalPassiveForce.toFixed(3)} kN/m</p>
            </div>
            <div>
              <p className="font-semibold">5. Compute Net Force</p>
              <p>Net = Pa − Pp</p>
              <p className="text-xs text-gray-500">Result: {result.netForce.toFixed(3)} kN/m</p>
            </div>
          </div>
        </div>
      </div>

      {stability && (
        <div className="mt-6 bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Stability Analysis</h2>

          {stability.warnings.filter(w => !result.warnings.includes(w)).length > 0 && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              {stability.warnings
                .filter(w => !result.warnings.includes(w))
                .map((w, i) => <p key={i} className="text-yellow-800 text-sm">⚠ {w}</p>)}
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">Vertical Load Components</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-3 py-2 border border-gray-200">Component</th>
                    <th className="px-3 py-2 border border-gray-200">W (kN/m)</th>
                    <th className="px-3 py-2 border border-gray-200">x̄ from Toe (m)</th>
                    <th className="px-3 py-2 border border-gray-200">M (kN·m/m)</th>
                  </tr>
                </thead>
                <tbody>
                  {stability.weightComponents.map((w, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-200 font-medium">{w.label}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(w.weight)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(w.armFromToe)}</td>
                      <td className="px-3 py-2 border border-gray-200">{round(w.moment)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-3 py-2 border border-gray-200">ΣV</td>
                    <td className="px-3 py-2 border border-gray-200">{round(stability.totalVerticalLoad)}</td>
                    <td className="px-3 py-2 border border-gray-200">—</td>
                    <td className="px-3 py-2 border border-gray-200">{round(stability.totalStabilisingMoment)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`rounded-lg p-4 border ${stability.FS_sliding >= 1.5 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600">FS Sliding</p>
              <p className={`text-3xl font-bold ${stability.FS_sliding >= 1.5 ? "text-green-700" : "text-red-700"}`}>
                {stability.FS_sliding === Infinity ? "∞" : round(stability.FS_sliding)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Required ≥ 1.5 {stability.FS_sliding >= 1.5 ? "✅" : "❌"}</p>
              <div className="text-sm mt-3 text-gray-600 space-y-1">
                <p>μ = tan(φ) = {round(stability.mu, 4)}</p>
                <p>Friction = μ · ΣV = {round(stability.frictionForce)} kN/m</p>
                <p>Passive Pp = {round(stability.passiveResistance)} kN/m</p>
                <p className="font-medium">Resist = {round(stability.slidingResistingForce)} kN/m</p>
                <p className="font-medium">Drive (Pa + Pq) = {round(stability.drivingForce)} kN/m</p>
              </div>
            </div>

            <div className={`rounded-lg p-4 border ${stability.FS_overturning >= 2.0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600">FS Overturning</p>
              <p className={`text-3xl font-bold ${stability.FS_overturning >= 2.0 ? "text-green-700" : "text-red-700"}`}>
                {stability.FS_overturning === Infinity ? "∞" : round(stability.FS_overturning)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Required ≥ 2.0 {stability.FS_overturning >= 2.0 ? "✅" : "❌"}</p>
              <div className="text-sm mt-3 text-gray-600 space-y-1">
                <p>ΣM_stab = {round(stability.totalStabilisingMoment)} kN·m/m</p>
                <p>ΣM_overturning = {round(stability.overturnigMoment)} kN·m/m</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`rounded-lg p-4 border ${stability.isWithinKern ? "bg-blue-50 border-blue-200" : "bg-yellow-50 border-yellow-300"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-600">Eccentricity</p>
              <div className="space-y-1 text-sm text-gray-700">
                <p>B = {round(stability.B)} m</p>
                <p>ΣM_stab − ΣM_over = {round(stability.totalStabilisingMoment - stability.overturnigMoment)} kN·m/m</p>
                <p>x̄ = (ΣM_stab − ΣM_over) / ΣV = {round(stability.xbar)} m from toe</p>
                <p className="font-semibold text-base">e = B/2 − x̄ = {round(stability.e)} m</p>
                <p>B/6 = {round(stability.eLimit)} m (kern limit)</p>
                <p className={`font-semibold mt-2 ${stability.isWithinKern ? "text-blue-700" : "text-yellow-700"}`}>
                  {stability.isWithinKern ? "✅ Within kern" : "⚠ Outside kern — tension at heel"}
                </p>
              </div>
            </div>

            <div className="rounded-lg p-4 border bg-purple-50 border-purple-200">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-600">Bearing Pressures</p>
              <div className="space-y-2 text-sm text-gray-700">
                <p className="text-xs text-gray-400">
                  {stability.isWithinKern
                    ? "q = (ΣV / B)(1 ± 6e / B)"
                    : "Outside kern — triangular block: qmax = 2ΣV / 3x̄, qmin = 0"}
                </p>
                <p className="font-semibold text-purple-700 text-xl mt-1">
                  q<sub>max</sub> = {round(stability.qmax)} <span className="text-sm font-normal">kPa</span>
                  <span className="text-xs font-normal text-gray-400 ml-2">(toe)</span>
                </p>
                <p className="font-semibold text-purple-700 text-xl">
                  q<sub>min</sub> = {round(stability.qmin)} <span className="text-sm font-normal">kPa</span>
                  <span className="text-xs font-normal text-gray-400 ml-2">(heel)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===================== MAIN PAGE ===================== */
export default function LateralEarthPressurePage() {
  const [method, setMethod] = useState<AnalysisMethod>("Rankine's Method");
  const [concrete, setConcrete] = useState<ConcreteData>(defaultConcrete());
  const [shapes, setShapes] = useState<ShapeCardData[]>([defaultShapeCard()]);
  const [distLoads, setDistLoads] = useState<NewDistLoad[]>([defaultDistLoad()]);
  const [result, setResult] = useState<LateralEarthPressureResult | null>(null);
  const [stability, setStability] = useState<StabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCanvas, setShowCanvas] = useState(true);

  const updateConcrete = (patch: Partial<ConcreteData>) =>
    setConcrete(prev => ({ ...prev, ...patch }));

  const updateShape = (index: number, patch: Partial<ShapeCardData>) =>
    setShapes(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));

  const handleAddShape = () => setShapes(prev => [...prev, defaultShapeCard()]);

  const handleRemoveShape = (index: number) => {
    if (shapes.length === 1) return;
    setShapes(prev => prev.filter((_, i) => i !== index));
  };

  const updateDistLoad = (index: number, patch: Partial<NewDistLoad>) =>
    setDistLoads(prev => prev.map((d, i) => i === index ? { ...d, ...patch } : d));

  const addDistLoad = () => setDistLoads(prev => [...prev, defaultDistLoad()]);

  const removeDistLoad = (index: number) => {
    if (distLoads.length === 1) return;
    setDistLoads(prev => prev.filter((_, i) => i !== index));
  };

  const handleCalculate = () => {
    setError(null);
    setResult(null);
    setStability(null);
    try {
      const legacyShapes: ShapeData[] = shapes.map(s => ({
        type: "Polygon" as any,
        material: s.material === "Active Soil" ? "Soil" : "Concrete",
        isOpen: true,
        visible: s.visible,
        isSaturated: s.layers[0]?.isSaturated ?? false,
        hollow: "Solid",
        nodes: [],
        sides: [],
        radius: "", x: "", y: "",
        gamma: s.layers[0]?.gamma ?? "",
        phi: s.layers[0]?.phi ?? "",
        cohesion: s.layers[0]?.cohesion ?? "",
      }));

      const legacyDist: DistributedLoad[] = distLoads.map(d => ({
        startX: "0", startY: "0",
        endX: "1", endY: "0",
        startMag: d.q,
        endMag: d.q,
      }));

      const res = computeLateralEarthPressure(legacyShapes, legacyDist, method);
      const stab = computeStability(res, legacyShapes, legacyDist);
      setResult(res);
      setStability(stab);
      setTimeout(() => {
        document.getElementById("results-panel")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  /* ===================== JSX ===================== */
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Lateral Earth Pressure Calculator
        </h1>

        {showCanvas && <ShapeCanvas
          shapes={shapes}
          concrete={concrete}
          distLoads={distLoads}
        />}
        {!showCanvas && (
          <div className="max-w-2xl mx-auto mb-6 flex items-center justify-center h-16 bg-white rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400">
            Diagram hidden — click Show to reveal
          </div>
        )}

        <div className="flex items-start gap-6 flex-wrap">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col w-[300px] shrink-0 gap-4">

            {/* Analysis Method */}
            <div className="bg-white rounded-xl shadow p-4 relative z-10">
              <h3 className="font-semibold mb-3">Analysis Method</h3>
              <select value={method}
                onChange={e => setMethod(e.target.value as AnalysisMethod)}
                className="w-full rounded bg-white px-3 py-2 focus:outline-none">
                <option value="Rankine's Method">Rankine's Method</option>
                <option value="Coulomb's Method">Coulomb's Method</option>
              </select>
            </div>

            {/* Concrete */}
            <div className="bg-white rounded-xl shadow p-4 relative z-10">
              <h3 className="font-semibold mb-3">Concrete</h3>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">γ concrete (kN/m³)</p>
                <input placeholder="unit weight" value={concrete.gammaConcrete}
                  onChange={e => updateConcrete({ gammaConcrete: e.target.value })}
                  className="w-full rounded bg-gray-100 px-2 py-1 text-sm focus:outline-none" />
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Wall Type</p>
                <select value={concrete.wallType}
                  onChange={e => updateConcrete({ wallType: e.target.value as WallType })}
                  className="w-full rounded bg-gray-100 px-2 py-1 text-sm focus:outline-none">
                  <option value="Wall 1">Wall 1</option>
                  <option value="Wall 2">Wall 2</option>
                  <option value="Wall 3">Wall 3</option>
                  <option value="Sheet Pile">Sheet Pile</option>
                </select>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Wall Dimensions</p>
                <WallDimsEditor concrete={concrete} onUpdate={updateConcrete} />
              </div>
            </div>

            {/* Distributed Loads */}
            <div className="bg-white rounded-xl shadow p-4 relative z-10">
              <h3 className="font-semibold mb-3">Distributed Loads</h3>
              {distLoads.map((load, i) => (
                <div key={i} className="mb-4 pb-4 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                  {distLoads.length > 1 && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Load {i + 1}</span>
                      <button onClick={() => removeDistLoad(i)}
                        className="w-7 h-7 bg-red-500 text-white rounded-lg font-bold text-sm flex items-center justify-center">–</button>
                    </div>
                  )}
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Side</p>
                    <select value={load.side}
                      onChange={e => updateDistLoad(i, { side: e.target.value as "Active" | "Passive" })}
                      className="w-full rounded bg-gray-100 px-2 py-1 text-sm focus:outline-none">
                      <option value="Active">Active</option>
                      <option value="Passive">Passive</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">q (kN/m²)</p>
                    <input placeholder="uniform load" value={load.q}
                      onChange={e => updateDistLoad(i, { q: e.target.value })}
                      className="w-full rounded bg-gray-100 px-2 py-1 text-sm focus:outline-none" />
                  </div>
                </div>
              ))}
              <button onClick={addDistLoad}
                className="mt-3 w-full bg-[#008409] text-white py-2 rounded-lg font-semibold hover:bg-[#15711b] transition text-sm">
                + Add Distributed Load
              </button>
            </div>

            {/* Calculate */}
            <button onClick={handleCalculate}
              className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition text-[18px] font-semibold">
              Calculate
            </button>
          </div>

          {/* ── SHAPE CARDS (soil only) ── */}
          <div className="flex flex-wrap gap-6 flex-1">
            {shapes.map((shape, index) => (
              <div key={index} className="bg-white rounded-xl shadow px-6 py-4 w-[340px] relative z-10">

                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{getSoilLabel(shapes, index)}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateShape(index, { visible: !shape.visible })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border text-gray-600 hover:bg-gray-100"
                    >
                      {shape.visible ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
                          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
                          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                        </svg>
                      )}
                    </button>
                    <button onClick={() => handleRemoveShape(index)}
                      className="w-8 h-8 bg-red-500 text-white rounded-lg font-bold">–</button>
                  </div>
                </div>

                <button onClick={() => updateShape(index, { isOpen: !shape.isOpen })}
                  className="w-full flex justify-between bg-[#008409] text-white px-4 py-2 rounded-lg hover:bg-[#15711b] transition">
                  Options
                  <span className={`transition-transform ${shape.isOpen ? "rotate-180" : ""}`}>▼</span>
                </button>

                {shape.isOpen && (
                  <div className="mt-4 space-y-4">

                    {/* Material */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Material</p>
                      <select value={shape.material}
                        onChange={e => updateShape(index, { material: e.target.value as MaterialType })}
                        className="w-full rounded bg-gray-100 px-3 py-1 text-sm focus:outline-none">
                        <option value="Active Soil">Active Soil</option>
                        <option value="Passive Soil">Passive Soil</option>
                      </select>
                    </div>

                    {/* Soil Layers */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Soil Layers</p>
                      <SoilLayerEditor
                        layers={shape.layers}
                        onChange={layers => updateShape(index, { layers })}
                      />
                    </div>

                    {/* Add Shape */}
                    <button onClick={handleAddShape}
                      className="w-full bg-[#008409] text-white py-2 rounded-lg font-semibold hover:bg-[#15711b] transition">
                      + Add Shape
                    </button>

                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-300 rounded-xl text-red-700 text-sm">
            <span className="font-semibold">Error: </span>{error}
          </div>
        )}

        {result && (
          <div id="results-panel">
            <ResultsPanel result={result} stability={stability} />
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}