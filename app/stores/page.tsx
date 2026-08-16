"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { Modal, EmptyState } from "@/components/ui";
import { MdStore, MdSearch, MdLocationOn, MdPhone, MdLanguage, MdVerified, MdStar } from "react-icons/md";

export default function StoresPage() {
  const { stores, storesLoading, loadStores } = useStore();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<(typeof stores)[0]|null>(null);

  useEffect(() => { loadStores(); }, []);

  const handleSearch = () => loadStores(search || undefined);
  const filtered = stores.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.country.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        <div>
          <div className="lbl mb-1">Discover</div>
          <div className="font-bebas text-4xl text-white">Record Stores</div>
          <div className="text-sm mt-1" style={{ color:"var(--tx2)" }}>Hand-curated shops worldwide</div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <MdSearch size={19} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--tx3)" }}/>
            <input className="inp" style={{ paddingLeft:40 }} placeholder="Search by name, city, country…"
              value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSearch()}/>
          </div>
          <button className="btn btn-cy btn-md" onClick={handleSearch}>Search</button>
        </div>

        {storesLoading && stores.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_,i) => (
              <div key={i} className="card p-5 animate-pulse h-36"/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<MdStore size={56}/>} title="No stores found" sub="Try a different search"/>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(store => (
              <div key={store.id} className="card p-5 cursor-pointer flex flex-col gap-3 hover:border-current transition-colors" onClick={() => setSelected(store)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="font-bold text-sm text-white truncate">{store.name}</div>
                      {store.isVerified && <MdVerified size={14} style={{ color:"var(--cy)", flexShrink:0 }}/>}
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color:"var(--tx3)" }}>
                      <MdLocationOn size={12}/> {store.city}, {store.country}
                    </div>
                  </div>
                  {store.isFeatured && (
                    <span className="badge badge-ye flex-shrink-0" style={{ fontSize:"0.5rem" }}>
                      <MdStar size={9}/> Featured
                    </span>
                  )}
                </div>
                {store.description && (
                  <div className="text-xs leading-relaxed" style={{ color:"var(--tx2)" }}>
                    {store.description.slice(0,100)}{store.description.length>100?"…":""}
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor:"var(--bdr)" }}>
                  {store.phone && <span className="flex items-center gap-1 text-xs" style={{ color:"var(--tx3)" }}><MdPhone size={12}/> {store.phone}</span>}
                  {store.website && (
                    <a href={store.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs ml-auto" style={{ color:"var(--cy)" }}
                      onClick={e => e.stopPropagation()}>
                      <MdLanguage size={12}/> Website
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {selected.isVerified && <span className="flex items-center gap-1 text-xs" style={{ color:"var(--cy)" }}><MdVerified size={14}/> Verified Store</span>}
              {selected.isFeatured && <span className="badge badge-ye" style={{ fontSize:"0.5rem" }}>Featured</span>}
            </div>
            {selected.description && <p className="text-sm leading-relaxed" style={{ color:"var(--tx2)" }}>{selected.description}</p>}
            <div className="space-y-2">
              {[
                { icon:<MdLocationOn size={15}/>, label:"Address", val:`${selected.address}, ${selected.city}, ${selected.country}` },
                { icon:<MdPhone size={15}/>, label:"Phone", val:selected.phone },
                { icon:<MdLanguage size={15}/>, label:"Website", val:selected.website, href:true },
              ].filter(r => r.val).map(row => (
                <div key={row.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background:"var(--surf)" }}>
                  <div style={{ color:"var(--cy)", flexShrink:0, marginTop:1 }}>{row.icon}</div>
                  <div>
                    <div className="text-xs mb-0.5" style={{ color:"var(--tx3)" }}>{row.label}</div>
                    {row.href
                      ? <a href={row.val} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color:"var(--cy)" }}>{row.val}</a>
                      : <div className="text-sm text-white">{row.val}</div>}
                  </div>
                </div>
              ))}
            </div>
            {selected.latitude && selected.longitude && (
              <a href={`https://maps.google.com?q=${selected.latitude},${selected.longitude}`} target="_blank" rel="noopener noreferrer">
                <button className="btn btn-cy btn-md w-full flex items-center justify-center gap-2">
                  <MdLocationOn size={16}/> Open in Google Maps
                </button>
              </a>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
