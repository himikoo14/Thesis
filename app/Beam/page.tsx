"use client";

import { useState } from "react";
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

/* ===================== COMPONENT ===================== */

export default function BeamSolverUI() {

  /* ---------- STATE ---------- */

  const [beamLength, setBeamLength] = useState("");

  const [supports, setSupports] = useState<Support[]>([
    { type: "Pinned", location: "" },
  ]);

  const [pointLoads, setPointLoads] = useState<PointLoad[]>([
    { magnitude: "", location: "" },
  ]);

  const [distributedLoads, setDistributedLoads] = useState<DistributedLoad[]>([
    { start: "", end: "", startMag: "", endMag: "" },
  ]);

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

      <main className="flex-grow flex flex-col items-center px-4 pt-0 pb-10">

        <h1 className="text-3xl font-bold text-center mb-2">
          Beam Calculator
        </h1>

        <h2 className="text-xl font-semibold text-center mb-6">
          Real-Time Free Body Diagram
        </h2>

        {/* DIAGRAM BOX */}

        <div className="rounded-xl shadow h-[300px] mb-8 bg-white"></div>

        {/* INPUT PANELS */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* BEAM PROPERTIES */}

          <div className="bg-white rounded-xl shadow p-4">

            <h3 className="text-xl font-semibold mb-3">
              Beam Properties
            </h3>

            <label className="text-[18px] font-medium">Beam Length</label>

            <input
              type="number"
              placeholder="m"
              value={beamLength}
              onChange={(e) => setBeamLength(e.target.value)}
              className={inputClass}
            />

            <div className="mt-4">
              <h4 className="font-medium mb-2">Supports</h4>

              {supports.map((s, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end mb-2">

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

                  <input
                    type="number"
                    placeholder="Location (m)"
                    value={s.location}
                    onChange={(e) =>
                      handleChange(supports, setSupports, i, "location", e.target.value)
                    }
                    className={inputClass}
                  />

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
                  addItem(supports, setSupports, {
                    type: "Pinned",
                    location: "",
                  })
                }
                className={greenButtonClass}
              >
                + Add Support
              </button>
            </div>

          </div>

          {/* LOADS */}

          <div className="bg-white rounded-xl shadow p-4">

            <h3 className="text-xl font-semibold mb-3">
              Loads
            </h3>

            {/* POINT LOADS */}

            <h4 className="font-medium mb-2">Point Loads</h4>

            {pointLoads.map((p, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-end mb-2">

                <input
                  type="number"
                  placeholder="Magnitude (kN)"
                  value={p.magnitude}
                  onChange={(e) =>
                    handleChange(pointLoads, setPointLoads, i, "magnitude", e.target.value)
                  }
                  className={inputClass}
                />

                <input
                  type="number"
                  placeholder="Location (m)"
                  value={p.location}
                  onChange={(e) =>
                    handleChange(pointLoads, setPointLoads, i, "location", e.target.value)
                  }
                  className={inputClass}
                />

                {pointLoads.length > 1 && (
                  <button
                    onClick={() => removeItem(pointLoads, setPointLoads, i)}
                    className={redButtonClass}
                  >
                    –
                  </button>
                )}

              </div>
            ))}

            <button
              onClick={() =>
                addItem(pointLoads, setPointLoads, {
                  magnitude: "",
                  location: "",
                })
              }
              className={greenButtonClass}
            >
              + Add Point Load
            </button>

            {/* DISTRIBUTED LOADS */}

            <h4 className="font-medium mt-6 mb-2">
              Distributed Loads
            </h4>

            {distributedLoads.map((d, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 mb-3">

                <input
                  type="number"
                  placeholder="Start Position (m)"
                  value={d.start}
                  onChange={(e) =>
                    handleChange(distributedLoads, setDistributedLoads, i, "start", e.target.value)
                  }
                  className={inputClass}
                />

                <input
                  type="number"
                  placeholder="End Position (m)"
                  value={d.end}
                  onChange={(e) =>
                    handleChange(distributedLoads, setDistributedLoads, i, "end", e.target.value)
                  }
                  className={inputClass}
                />

                <input
                  type="number"
                  placeholder="Start Magnitude (kN)"
                  value={d.startMag}
                  onChange={(e) =>
                    handleChange(distributedLoads, setDistributedLoads, i, "startMag", e.target.value)
                  }
                  className={inputClass}
                />

                <input
                  type="number"
                  placeholder="End Magnitude (kN)"
                  value={d.endMag}
                  onChange={(e) =>
                    handleChange(distributedLoads, setDistributedLoads, i, "endMag", e.target.value)
                  }
                  className={inputClass}
                />

                <button
                  onClick={() =>
                    removeItem(distributedLoads, setDistributedLoads, i)
                  }
                  className="col-span-2 bg-red-500 text-white py-2 rounded-md"
                >
                  – Remove Distributed Load
                </button>

              </div>
            ))}

            <button
              onClick={() =>
                addItem(distributedLoads, setDistributedLoads, {
                  start: "",
                  end: "",
                  startMag: "",
                  endMag: "",
                })
              }
              className={greenButtonClass}
            >
              + Add Distributed Load
            </button>

          </div>

        </div>

        {/* CALCULATE BUTTON */}

        <button className="w-full bg-blue-800 text-white py-3 rounded-lg font-semibold">
          Calculate
        </button>

      </main>


    </div>
  );
}