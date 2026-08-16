"use client";
import { MdClose } from "react-icons/md";

/* ── Condition color map ── */
const conditionColor: Record<string,string> = {
  "M":"#4ADE80", "Mint":"#4ADE80",
  "NM":"#22D3EE", "Near Mint":"#22D3EE",
  "VG+":"#60A5FA", "Very Good+":"#60A5FA", "VERY_GOOD_PLUS":"#60A5FA",
  "VG":"#A78BFA", "Very Good":"#A78BFA", "VERY_GOOD":"#A78BFA",
  "G+":"#FB923C", "Good+":"#FB923C",
  "G":"#FBBF24", "Good":"#FBBF24",
  "Fair":"#F87171", "FAIR":"#F87171",
  "Poor":"#EF4444", "POOR":"#EF4444",
};

/* ── Avatar ── */
export function Avatar({ color="#FF006E", name, size=36 }: { color?:string; name:string; size?:number }) {
  return (
    <div style={{ width:size, height:size, minWidth:size, background:color, borderRadius:"50%",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.4, fontWeight:700, color:"#fff", fontFamily:"Syne,sans-serif", flexShrink:0 }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}
      
/* ── Condition Badge ── */
export function CondBadge({ cond }: { cond:string }) {
  const c = conditionColor[cond] || "#888";
  return (
    <span className="badge" style={{ background:`${c}18`, color:c, border:`1px solid ${c}30`, fontSize:"0.58rem" }}>{cond}</span>
  );
}
/* ── Vinyl Disc SVG ── */
export function VinylDisc({ color="#FF006E", size=48 }: { color?:string; size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="38" fill="#0C0C18" stroke={color} strokeWidth="1"/>
      {[34,28,22,16].map(r => <circle key={r} cx="40" cy="40" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>)}
      <circle cx="40" cy="40" r="10" fill={color} fillOpacity="0.9"/>
      <circle cx="40" cy="40" r="3"  fill="#080810"/>
    </svg>
  );
}

/* ── Empty State ── */
export function EmptyState({ icon, title, sub, action }: { icon:React.ReactNode; title:string; sub:string; action?:React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div style={{ color:"var(--tx3)", opacity:0.5 }}>{icon}</div>
      <div className="font-bebas text-2xl" style={{ color:"var(--tx2)" }}>{title}</div>
      <div className="text-sm max-w-xs" style={{ color:"var(--tx3)" }}>{sub}</div>
      {action}
    </div>
  );
}
/* ── Modal ── */
export function Modal({ open, onClose, children, title }: { open:boolean; onClose:()=>void; children:React.ReactNode; title?:string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)" }}/>
      <div className="card-static relative w-full max-w-md z-10 p-6 fade-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          {title && <div className="font-bebas text-xl tracking-wider" style={{ color:"var(--cy)" }}>{title}</div>}
          <button onClick={onClose} className="ml-auto btn btn-ghost btn-sm" style={{ padding:"6px", borderRadius:"50%" }}>
            <MdClose size={18} style={{ color:"var(--tx3)" }}/>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
