"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import CoordinateTab from "../CoordinateTab/page";
import AnglesTab from "../AnglesTab/page";

function Solver3DContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("subtab") || "coordinate"; // default tab

const setTab = (tab: string) => {
  router.replace(`?tab=3d&subtab=${tab}`, { scroll: false });
};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-serif px-4 py-4 pb-12">
      <div className="max-w-3xl mx-auto">

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-[18px] sm:text-[26px] font-bold text-gray-900 dark:text-white m-0">
            3D Resultant Force Calculator
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setTab("coordinate")}
            className={`flex-1 py-3 rounded-xl text-[12px] sm:text-[15px] font-semibold transition-all duration-200 shadow-sm
              ${activeTab === "coordinate"
                ? "bg-[#1848a0] text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
          >
            Cartesian Vector
          </button>
          <button
            onClick={() => setTab("angles")}
            className={`flex-1 py-3 rounded-xl text-[12px] sm:text-[15px] font-semibold transition-all duration-200 shadow-sm
              ${activeTab === "angles"
                ? "bg-[#008409] text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
          >
            Azimuth-Elevation
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "coordinate" && <CoordinateTab />}
        {activeTab === "angles" && <AnglesTab />}
      </div>
    </div>
  );
}

// Suspense is required when using useSearchParams
export default function Solver3D() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Solver3DContent />
    </Suspense>
  );
}