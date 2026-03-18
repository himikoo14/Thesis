"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";

/* ================================================================
   TYPES
================================================================ */
type Pt  = { label: string; x: string; y: string; z: string };
type Frc = { mag: string; from: number; to: number };

/* ================================================================
   KATEX HOOK
================================================================ */
function useKatex() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if ((window as any).katex) { setOk(true); return; }
    const link  = document.createElement("link");
    link.rel    = "stylesheet";
    link.href   = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const scr   = document.createElement("script");
    scr.src     = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    scr.onload  = () => setOk(true);
    document.head.appendChild(scr);
  }, []);
  return ok;
}

/* ================================================================
   KATEX DISPLAY BLOCK
================================================================ */
function KTX({ tex }: { tex: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const katex = (window as any).katex;
    if (!katex) return;
    try { katex.render(tex, el.current, { displayMode: true, throwOnError: false }); }
    catch (_) { el.current.innerText = tex; }
  }, [tex]);
  return <div ref={el} style={{ margin: "6px 0", overflowX: "auto" }} />;
}

/* ================================================================
   STEP BUILDER  — mirrors the handwritten solution exactly
================================================================ */
type Line =
  | { t: "heading";  text: string }   // blue numbered heading
  | { t: "subhead";  text: string }   // red force label
  | { t: "note";     text: string }   // small grey note
  | { t: "math";     tex:  string }   // KaTeX display math

function buildSolution(
  details: {
    i: number; mag: number;
    from: string; to: string;
    ax: number; ay: number; az: number;
    bx: number; by: number; bz: number;
    Fx: number; Fy: number; Fz: number;
    len: number;
  }[],
  Rx: number, Ry: number, Rz: number, R: number
): Line[] {
  const out: Line[] = [];
  const H  = (text: string) => out.push({ t: "heading", text });
  const S  = (text: string) => out.push({ t: "subhead", text });
  const N  = (text: string) => out.push({ t: "note",    text });
  const M  = (tex:  string) => out.push({ t: "math",    tex  });

  // ── 1. Cartesian coordinates ──────────────────────────────────
  H("1. Express each point in Cartesian form");
  // collect unique points
  const pts = new Map<string, [number,number,number]>();
  details.forEach(d => {
    pts.set(d.from, [d.ax, d.ay, d.az]);
    pts.set(d.to,   [d.bx, d.by, d.bz]);
  });
  pts.forEach(([x,y,z], label) => {
    M(`${label}:\\;(${x}\\hat{i} + ${y}\\hat{j} + ${z}\\hat{k})\\,\\text{m}`);
  });

  // ── 2. Position vectors ───────────────────────────────────────
  H("2. Find the position vector for each force");
  details.forEach(d => {
    const dx = d.bx - d.ax, dy = d.by - d.ay, dz = d.bz - d.az;
    S(`Force ${d.i}: ${d.from} → ${d.to},  F = ${d.mag} kN`);
    N(`Subtract position of ${d.from} from ${d.to}  →  ${d.to} − ${d.from}`);
    M(
      `\\vec{r}_{${d.from}${d.to}} =` +
      `\\{(${d.bx}-${d.ax})\\hat{i}+(${d.by}-${d.ay})\\hat{j}+(${d.bz}-${d.az})\\hat{k}\\}`
    );
    M(
      `\\vec{r}_{${d.from}${d.to}} = ${dx}\\hat{i}+${dy}\\hat{j}+${dz}\\hat{k}\\;\\text{m}`
    );
  });

  // ── 3. Magnitudes ─────────────────────────────────────────────
  H("3. Find the magnitude of each position vector");
  details.forEach(d => {
    const dx = d.bx-d.ax, dy = d.by-d.ay, dz = d.bz-d.az;
    S(`r_{${d.from}${d.to}}`);
    M(`r_{${d.from}${d.to}} = \\sqrt{(${dx})^2+(${dy})^2+(${dz})^2}`);
    M(`= \\sqrt{${dx*dx}+${dy*dy}+${dz*dz}}`);
    M(`r_{${d.from}${d.to}} = ${d.len.toFixed(3)}\\;\\text{m}`);
  });

  // ── 4. Unit vectors ───────────────────────────────────────────
  H("4. Find the unit vector  û = r / |r|");
  details.forEach(d => {
    const dx = d.bx-d.ax, dy = d.by-d.ay, dz = d.bz-d.az;
    S(`\\hat{u}_{${d.from}${d.to}}`);
    M(
      `\\hat{u}_{${d.from}${d.to}} =` +
      `\\frac{${dx}\\hat{i}+${dy}\\hat{j}+${dz}\\hat{k}}{${d.len.toFixed(3)}}`
    );
    M(
      `\\hat{u}_{${d.from}${d.to}} =` +
      `\\left(\\frac{${dx}}{${d.len.toFixed(3)}}\\right)\\hat{i}+` +
      `\\left(\\frac{${dy}}{${d.len.toFixed(3)}}\\right)\\hat{j}+` +
      `\\left(\\frac{${dz}}{${d.len.toFixed(3)}}\\right)\\hat{k}`
    );
    M(
      `\\hat{u}_{${d.from}${d.to}} =` +
      `${(dx/d.len).toFixed(4)}\\hat{i}+` +
      `${(dy/d.len).toFixed(4)}\\hat{j}+` +
      `${(dz/d.len).toFixed(4)}\\hat{k}`
    );
  });

  // ── 5. Force vectors  F = F · û ───────────────────────────────
  H("5. Solve for each force vector  F⃗ = F · û");
  details.forEach(d => {
    const dx = d.bx-d.ax, dy = d.by-d.ay, dz = d.bz-d.az;
    S(`\\vec{F}_{${d.i}} = ${d.mag}\\,(\\hat{u}_{${d.from}${d.to}})`);
    M(
      `\\vec{F}_{${d.i}} = ${d.mag}` +
      `\\left(\\frac{${dx}}{${d.len.toFixed(3)}}\\hat{i}+` +
      `\\frac{${dy}}{${d.len.toFixed(3)}}\\hat{j}+` +
      `\\frac{${dz}}{${d.len.toFixed(3)}}\\hat{k}\\right)`
    );
    M(
      `\\vec{F}_{${d.i}} =` +
      `\\{${d.Fx.toFixed(3)}\\hat{i}+${d.Fy.toFixed(3)}\\hat{j}+${d.Fz.toFixed(3)}\\hat{k}\\}\\,\\text{kN}`
    );
  });

  // ── 6. Sum components ─────────────────────────────────────────
  H("6. Add components to get resultant force");
  N("Add î components, ĵ components, k̂ components separately");

  const allF = details.map(d =>
    `\\{${d.Fx.toFixed(3)}\\hat{i}+${d.Fy.toFixed(3)}\\hat{j}+${d.Fz.toFixed(3)}\\hat{k}\\}`
  ).join("+");
  M(`\\vec{F}_R = ${allF}`);

  const iSum = details.map(d=>`(${d.Fx.toFixed(3)})`).join("+");
  const jSum = details.map(d=>`(${d.Fy.toFixed(3)})`).join("+");
  const kSum = details.map(d=>`(${d.Fz.toFixed(3)})`).join("+");
  M(
    `\\vec{F}_R =` +
    `\\{[${iSum}]\\hat{i}+[${jSum}]\\hat{j}+[${kSum}]\\hat{k}\\}\\,\\text{kN}`
  );
  M(
    `\\vec{F}_R =` +
    `\\{${Rx.toFixed(3)}\\hat{i}+${Ry.toFixed(3)}\\hat{j}+${Rz.toFixed(3)}\\hat{k}\\}\\,\\text{kN}`
  );

  // ── 7. Resultant magnitude ────────────────────────────────────
  H("7. Find the magnitude of the resultant");
  M(`F_R = \\sqrt{(F_{Rx})^2+(F_{Ry})^2+(F_{Rz})^2}`);
  M(`= \\sqrt{(${Rx.toFixed(3)})^2+(${Ry.toFixed(3)})^2+(${Rz.toFixed(3)})^2}`);
  M(`= \\sqrt{${(Rx*Rx).toFixed(3)}+${(Ry*Ry).toFixed(3)}+${(Rz*Rz).toFixed(3)}}`);
  M(`F_R = ${R.toFixed(3)}\\,\\text{kN}`);

  // ── 8. Direction angles ───────────────────────────────────────
  if (R > 0.001) {
    H("8. Find the coordinate direction angles");
    const α = Math.acos(Rx/R)*180/Math.PI;
    const β = Math.acos(Ry/R)*180/Math.PI;
    const γ = Math.acos(Rz/R)*180/Math.PI;
    M(`\\cos\\alpha = \\frac{F_{Rx}}{F_R} = \\frac{${Rx.toFixed(3)}}{${R.toFixed(3)}} \\quad\\Rightarrow\\quad \\alpha = ${α.toFixed(2)}^\\circ`);
    M(`\\cos\\beta  = \\frac{F_{Ry}}{F_R} = \\frac{${Ry.toFixed(3)}}{${R.toFixed(3)}} \\quad\\Rightarrow\\quad \\beta  = ${β.toFixed(2)}^\\circ`);
    M(`\\cos\\gamma = \\frac{F_{Rz}}{F_R} = \\frac{${Rz.toFixed(3)}}{${R.toFixed(3)}} \\quad\\Rightarrow\\quad \\gamma = ${γ.toFixed(2)}^\\circ`);
  }

  return out;
}

/* ================================================================
   THREE.JS CANVAS
================================================================ */
function ThreeCanvas({ pts, frcs }: { pts: Pt[]; frcs: Frc[] }) {
  const mount = useRef<HTMLDivElement>(null);
  const grp   = useRef<THREE.Group | null>(null);
  const orbit = useRef({ t:0.7, p:1.1, r:6, drag:false, px:0, py:0 });
  const raf   = useRef(0);

  useEffect(() => {
    const el = mount.current; if (!el) return;
    const W = el.clientWidth||500, H = 320;
    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(W, H); renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    // scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafafa);
    scene.add(new THREE.GridHelper(6,12,0xdddddd,0xeeeeee));
    scene.add(new THREE.HemisphereLight(0xffffff,0xe0e0e0,1.2));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.08,16,16), new THREE.MeshStandardMaterial({color:0x222})));
    ([[[1,0,0],0xe63946],[[0,1,0],0x2a9d8f],[[0,0,1],0x4361ee]] as [[number,number,number],number][]).forEach(([d,c])=>
      scene.add(new THREE.ArrowHelper(new THREE.Vector3(...d),new THREE.Vector3(0,0,0),1.8,c,0.3,0.18))
    );
    const g = new THREE.Group(); scene.add(g); grp.current = g;

    const cam = new THREE.PerspectiveCamera(42, W/H, 0.1, 100);
    const o   = orbit.current;
    const dn  = (e:MouseEvent)=>{ o.drag=true; o.px=e.clientX; o.py=e.clientY; };
    const up  = ()=>{ o.drag=false; };
    const mv  = (e:MouseEvent)=>{
      if(!o.drag) return;
      o.t -= (e.clientX-o.px)*0.014;
      o.p  = Math.max(0.12, Math.min(Math.PI-0.12, o.p+(e.clientY-o.py)*0.014));
      o.px=e.clientX; o.py=e.clientY;
    };
    const wh = (e:WheelEvent)=>{ o.r=Math.max(3,Math.min(12,o.r+e.deltaY*0.01)); };
    renderer.domElement.addEventListener("mousedown",dn);
    renderer.domElement.addEventListener("wheel",wh,{passive:true});
    window.addEventListener("mousemove",mv);
    window.addEventListener("mouseup",up);

    const tick = ()=>{
      raf.current = requestAnimationFrame(tick);
      cam.position.set(o.r*Math.sin(o.p)*Math.cos(o.t), o.r*Math.cos(o.p), o.r*Math.sin(o.p)*Math.sin(o.t));
      cam.lookAt(0,0,0); renderer.render(scene,cam);
    };
    tick();
    return ()=>{
      cancelAnimationFrame(raf.current);
      renderer.domElement.removeEventListener("mousedown",dn);
      renderer.domElement.removeEventListener("wheel",wh);
      window.removeEventListener("mousemove",mv);
      window.removeEventListener("mouseup",up);
      renderer.dispose();
      if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(()=>{
    const g = grp.current; if(!g) return;
    while(g.children.length) g.remove(g.children[0]);
    const C=[0xe63946,0x2a9d8f,0x4361ee,0xf4a261,0xa8dadc,0x9b5de5];
    pts.forEach((p,i)=>{
      const m=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,16),new THREE.MeshStandardMaterial({color:C[i%C.length]}));
      m.position.set(+p.x||0,+p.y||0,+p.z||0); g.add(m);
    });
    frcs.forEach(f=>{
      const mag=+f.mag; if(!mag) return;
      const a=pts[f.from],b=pts[f.to]; if(!a||!b) return;
      const A=new THREE.Vector3(+a.x||0,+a.y||0,+a.z||0);
      const B=new THREE.Vector3(+b.x||0,+b.y||0,+b.z||0);
      const len=A.distanceTo(B); if(len<0.001) return;
      g.add(new THREE.ArrowHelper(new THREE.Vector3().subVectors(B,A).normalize(),A,len,0xf4a261,0.25,0.14));
    });
  },[pts,frcs]);

  return (
    <div style={{position:"relative",borderRadius:12,overflow:"hidden",border:"1px solid #e0e0e0"}}>
      <div ref={mount} style={{width:"100%",height:320,cursor:"grab"}}/>
      <div style={{position:"absolute",top:8,left:10,display:"flex",gap:5,pointerEvents:"none"}}>
        {([["X","#e63946","#fff0f1"],["Y","#2a9d8f","#f0faf9"],["Z","#4361ee","#f0f2ff"]] as [string,string,string][]).map(([l,c,bg])=>(
          <span key={l} style={{background:bg,color:c,border:`1.5px solid ${c}44`,borderRadius:5,padding:"2px 7px",fontSize:12,fontWeight:700}}>{l}</span>
        ))}
      </div>
      <div style={{position:"absolute",bottom:6,right:10,fontSize:10,color:"#bbb",pointerEvents:"none"}}>Drag · Scroll zoom</div>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function ResultantCalculator() {
  const router  = useRouter();
  const katexOk = useKatex();

  const [pts,  setPts]  = useState<Pt[]>([
    { label:"A", x:"", y:"", z:"" },
    { label:"B", x:"", y:"", z:"" },
  ]);
  const [frcs, setFrcs] = useState<Frc[]>([{ mag:"", from:0, to:1 }]);

  // solution state
  const [lines, setLines] = useState<Line[] | null>(null);
  const [Rx, setRx] = useState(0);
  const [Ry, setRy] = useState(0);
  const [Rz, setRz] = useState(0);
  const [R,  setR]  = useState(0);
  const [open, setOpen] = useState(false);

  const lbl = (i:number) => String.fromCharCode(65+i);

  /* point helpers */
  const addPt  = () => setPts(p=>[...p,{label:lbl(p.length),x:"",y:"",z:""}]);
  const remPt  = (i:number) => {
    if(pts.length<=2) return;
    setPts(p=>p.filter((_,j)=>j!==i).map((v,j)=>({...v,label:lbl(j)})));
  };
  const updPt  = (i:number,k:keyof Pt,v:string) => setPts(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x));

  /* force helpers */
  const addF  = () => setFrcs(f=>[...f,{mag:"",from:0,to:Math.min(1,pts.length-1)}]);
  const remF  = (i:number) => { if(frcs.length<=1) return; setFrcs(f=>f.filter((_,j)=>j!==i)); };
  const updF  = (i:number,k:keyof Frc,v:any) => setFrcs(f=>f.map((x,j)=>j===i?{...x,[k]:v}:x));

  /* calculate */
  const calc = () => {
    let rx=0,ry=0,rz=0;
    const details:any[]=[];
    frcs.forEach((f,i)=>{
      const mag=+f.mag; if(!mag) return;
      const a=pts[f.from],b=pts[f.to]; if(!a||!b) return;
      const ax=+a.x||0,ay=+a.y||0,az=+a.z||0;
      const bx=+b.x||0,by=+b.y||0,bz=+b.z||0;
      const dx=bx-ax,dy=by-ay,dz=bz-az;
      const len=Math.sqrt(dx*dx+dy*dy+dz*dz); if(!len) return;
      const Fx=mag*dx/len,Fy=mag*dy/len,Fz=mag*dz/len;
      rx+=Fx; ry+=Fy; rz+=Fz;
      details.push({i:i+1,mag,from:pts[f.from].label,to:pts[f.to].label,ax,ay,az,bx,by,bz,Fx,Fy,Fz,len});
    });
    const rr=Math.sqrt(rx*rx+ry*ry+rz*rz);
    setLines(buildSolution(details,rx,ry,rz,rr));
    setRx(rx); setRy(ry); setRz(rz); setR(rr);
    setOpen(true);
  };

  /* styles */
  const inp:  React.CSSProperties = {background:"#f5f5f5",border:"1px solid #ddd",borderRadius:8,padding:"6px 8px",fontSize:13,width:"100%",outline:"none"};
  const sel:  React.CSSProperties = {...inp,width:"auto",minWidth:90};
  const card: React.CSSProperties = {background:"#fff",borderRadius:14,border:"1px solid #e8e8e8",padding:"18px 20px",boxShadow:"0 2px 8px #0000000a"};

  return (
    <div style={{minHeight:"100vh",background:"#f3f4f8",fontFamily:"Georgia,'Times New Roman',serif",padding:"28px 16px 60px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>

        {/* header */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <h1 style={{fontSize:26,fontWeight:700,color:"#111",margin:0}}>3D Resultant Calculator</h1>
          <p style={{color:"#888",fontSize:13,marginTop:5}}>Coordinate Method · Free Body Diagram</p>
        </div>

        {/* canvas */}
        <div style={{marginBottom:20}}>
          <ThreeCanvas pts={pts} frcs={frcs}/>
          <div style={{display:"flex",gap:10,marginTop:10}}>
            {[["3D Resultant (Angles)","#1848a0","/3D-solver"],["3D Coordinate","#008409","/resultant/coordinate"]].map(([label,bg,path])=>(
              <button key={path} onClick={()=>router.push(path as string)}
                style={{flex:1,background:bg as string,color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* inputs */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

          {/* points */}
          <div style={card}>
            <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:600}}>Points</h3>
            <div style={{display:"grid",gridTemplateColumns:"48px 1fr 1fr 1fr 30px",gap:5,marginBottom:5}}>
              <span/>{["x","y","z"].map(l=><span key={l} style={{fontSize:11,color:"#aaa",textAlign:"center"}}>{l}</span>)}<span/>
            </div>
            {pts.map((p,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"48px 1fr 1fr 1fr 30px",gap:5,marginBottom:5,alignItems:"center"}}>
                <span style={{fontSize:13,color:"#555"}}>Pt {p.label}</span>
                {(["x","y","z"] as (keyof Pt)[]).map(k=>(
                  <input key={k} style={inp} placeholder={k} value={p[k]} onChange={e=>updPt(i,k,e.target.value)}/>
                ))}
                <button onClick={()=>remPt(i)} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",fontWeight:700}}>–</button>
              </div>
            ))}
            <button onClick={addPt} style={{background:"#008409",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:12,cursor:"pointer",marginTop:4}}>+ Add Point</button>
          </div>

          {/* forces */}
          <div style={card}>
            <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:600}}>Forces</h3>
            {frcs.map((f,i)=>(
              <div key={i} style={{background:"#f9f9f9",borderRadius:9,border:"1px solid #eee",padding:"9px 11px",marginBottom:9}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                  <span style={{fontSize:13,color:"#555",flex:1}}>Magnitude (kN):</span>
                  <input style={{...inp,width:76}} placeholder="kN" value={f.mag} onChange={e=>updF(i,"mag",e.target.value)}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                  <span style={{fontSize:13,color:"#555",flex:1}}>From:</span>
                  <select style={sel} value={f.from} onChange={e=>updF(i,"from",+e.target.value)}>
                    {pts.map((p,j)=><option key={j} value={j}>Pt {p.label}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:13,color:"#555",flex:1}}>To:</span>
                  <select style={sel} value={f.to} onChange={e=>updF(i,"to",+e.target.value)}>
                    {pts.map((p,j)=><option key={j} value={j}>Pt {p.label}</option>)}
                  </select>
                </div>
                {frcs.length>1&&(
                  <div style={{textAlign:"right",marginTop:6}}>
                    <button onClick={()=>remF(i)} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:6,padding:"3px 10px",fontSize:12,cursor:"pointer"}}>Remove</button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={addF} style={{background:"#008409",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>+ Add Force</button>
          </div>
        </div>

        {/* calculate button */}
        <button onClick={calc} style={{width:"100%",background:"#1848a0",color:"#fff",border:"none",borderRadius:10,padding:"13px 0",fontSize:16,fontWeight:600,cursor:"pointer",marginBottom:16}}>
          Calculate
        </button>

        {/* ══════════════════════════════════════
            SOLUTION PANEL
        ══════════════════════════════════════ */}
        {lines !== null && (
          <div style={card}>

            {/* toggle */}
            <button
              onClick={()=>setOpen(v=>!v)}
              style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontSize:16,fontWeight:700,color:"#111",padding:0,width:"100%",marginBottom: open ? 16 : 0}}
            >
              <span>{open?"▼":"▶"}</span> Step-by-Step Solution
            </button>

            {open && (
              <div>
                {/* render each line */}
                {lines.map((ln, i) => {
                  if (ln.t === "heading") return (
                    <p key={i} style={{fontWeight:700,fontSize:15,color:"#1848a0",margin:"22px 0 8px",paddingBottom:5,borderBottom:"2px solid #c8d8ff"}}>
                      {ln.text}
                    </p>
                  );
                  if (ln.t === "subhead") {
                    // subhead may contain LaTeX — render it
                    if (katexOk) return (
                      <div key={i} style={{fontWeight:700,fontSize:13,color:"#d63031",margin:"14px 0 2px",background:"#fff5f5",borderRadius:6,padding:"4px 10px",borderLeft:"3px solid #d63031"}}>
                        <KTX tex={`\\text{${ln.text}}`}/>
                      </div>
                    );
                    return <p key={i} style={{fontWeight:700,color:"#d63031",margin:"12px 0 2px"}}>{ln.text}</p>;
                  }
                  if (ln.t === "note") return (
                    <p key={i} style={{fontSize:12,color:"#888",margin:"2px 0 2px",fontStyle:"italic"}}>
                      {ln.text}
                    </p>
                  );
                  if (ln.t === "math") {
                    if (katexOk) return <KTX key={i} tex={ln.tex}/>;
                    return <pre key={i} style={{fontSize:12,color:"#555",overflowX:"auto"}}>{ln.tex}</pre>;
                  }
                  return null;
                })}

                {/* summary */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:28,marginBottom:12}}>
                  {([["ΣFx",Rx],["ΣFy",Ry],["ΣFz",Rz]] as [string,number][]).map(([l,v])=>(
                    <div key={l} style={{background:"#f5f5f5",borderRadius:10,padding:10,textAlign:"center"}}>
                      <div style={{fontSize:11,color:"#888",marginBottom:3}}>{l} (kN)</div>
                      <div style={{fontSize:18,fontWeight:600}}>{v.toFixed(3)}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"#e8f0fe",borderRadius:12,padding:14,textAlign:"center"}}>
                  <div style={{fontSize:12,color:"#555",marginBottom:3}}>Resultant F_R</div>
                  <div style={{fontSize:28,fontWeight:700,color:"#1848a0"}}>{R.toFixed(3)} kN</div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}