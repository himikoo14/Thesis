"use client";

import { useState } from "react";
import CoordinateTab from "../CoordinateTab/page";
import AnglesTab from "../AnglesTab/page";

export default function Solver3D() {
  const [activeTab, setActiveTab] = useState("coordinate");

  const tabBtnStyle = (id: string): React.CSSProperties => ({
    flex: 1,
    background: activeTab === id ? (id === "angles" ? "#008409" : "#1848a0") : "#f0f0f0",
    color: activeTab === id ? "#fff" : "#555",
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Georgia, 'Times New Roman', serif",
    transition: "all 0.18s ease",
    boxShadow: activeTab === id ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f8", fontFamily: "Georgia, 'Times New Roman', serif", padding: "28px 16px 48px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111", margin: 0 }}>3D Resultant Force Calculator</h1>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button style={tabBtnStyle("coordinate")} onClick={() => setActiveTab("coordinate")}>Cartesian Vector</button>
          <button style={tabBtnStyle("angles")} onClick={() => setActiveTab("angles")}>Azimuth-Elevation</button>
        </div>
        {activeTab === "coordinate" && <CoordinateTab />}
        {activeTab === "angles" && <AnglesTab />}
      </div>
    </div>
  );
}