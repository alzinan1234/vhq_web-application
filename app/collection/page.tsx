"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { VinylDisc, CondBadge, Modal, EmptyState } from "@/components/ui";
import { collectionApi, albumsApi, type ApiExternalAlbum, imgUrl } from "@/lib/api";
import { MdAdd, MdGridView, MdViewList, MdDelete, MdAlbum, MdAttachMoney, MdMusicNote, MdSearch, MdQrCodeScanner } from "react-icons/md";

const CONDITIONS = ["MINT","NEAR_MINT","VERY_GOOD_PLUS","VERY_GOOD","GOOD_PLUS","GOOD","FAIR","POOR"];
const COND_LABELS: Record<string,string> = {
  MINT:"Mint", NEAR_MINT:"Near Mint", VERY_GOOD_PLUS:"VG+", VERY_GOOD:"VG",
  GOOD_PLUS:"G+", GOOD:"Good", FAIR:"Fair", POOR:"Poor"
};

export default function CollectionPage() {
  const { user, isLoggedIn, collection, collectionStats, collectionLoading, loadCollection, removeFromCollection, showToast } = useStore();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid"|"list">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiExternalAlbum[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState<ApiExternalAlbum | null>(null);
  const [condition, setCondition] = useState("VERY_GOOD_PLUS");
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [manual, setManual] = useState({ title:"", artistNames:"", year:"", format:"Vinyl", condition:"VERY_GOOD_PLUS", notes:"", price:"" });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isLoggedIn) {
      loadCollection();
    }
  }, [mounted, isLoggedIn, loadCollection]);

  const filtered = collection.filter(r => {
    const q = search.toLowerCase();
    const title = r.album?.title?.toLowerCase() || "";
    const artist = r.album?.albumArtists?.[0]?.artist?.name?.toLowerCase() || "";
    return !q || title.includes(q) || artist.includes(q);
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await albumsApi.searchExternal(searchQuery);
      if (res?.data) setSearchResults(res.data.slice(0,12));
    } catch { showToast("Search failed", "error"); }
    finally { setSearchLoading(false); }
  };

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      await collectionApi.addFromExternal(selected.source, selected.externalId, {
        condition,
        notes: notes || undefined,
        purchasePrice: price ? parseFloat(price) : undefined,
        isPublic: true,
      });
      showToast("Added to collection!");
      setAddOpen(false); 
      setSelected(null); 
      setSearchResults([]); 
      setSearchQuery(""); 
      setNotes(""); 
      setPrice("");
      setCondition("VERY_GOOD_PLUS");
      // Reload collection to sync with backend
      await loadCollection();
    } catch (e: unknown) { 
      showToast(e instanceof Error ? e.message : "Failed to add", "error"); 
    }
    finally { 
      setAdding(false); 
    }
  };

  const handleManualAdd = async () => {
    if (!manual.title || !manual.artistNames) return;
    setAdding(true);
    try {
      await collectionApi.addManual({
        title: manual.title,
        artistNames: manual.artistNames.split(",").map(s => s.trim()),
        year: manual.year ? parseInt(manual.year) : undefined,
        format: manual.format,
        condition: manual.condition,
        notes: manual.notes || undefined,
        purchasePrice: manual.price ? parseFloat(manual.price) : undefined,
        isPublic: true,
      });
      showToast("Added to collection!");
      setAddOpen(false); 
      setManual({ title:"", artistNames:"", year:"", format:"Vinyl", condition:"VERY_GOOD_PLUS", notes:"", price:"" });
      // Reload collection to sync with backend
      await loadCollection();
    } catch (e: unknown) { 
      showToast(e instanceof Error ? e.message : "Failed to add", "error"); 
    }
    finally { 
      setAdding(false); 
    }
  };

  if (!isLoggedIn) return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-20 text-center">
        <MdAlbum size={64} style={{ color:"var(--tx3)", margin:"0 auto 16px" }}/>
        <div className="font-bebas text-4xl text-white mb-4">My Collection</div>
        <p className="mb-6" style={{ color:"var(--tx2)" }}>Log in to manage your vinyl collection.</p>
        <a href="/auth"><button className="btn btn-pk btn-lg">Log In</button></a>
      </div>
    </AppLayout>
  );

  if (!mounted) return null;

  const total = collectionStats?.total || collection.length;
  const limit = collectionStats?.limit || 25;
  const isFree = user?.tier === "FREE";
  const atLimit = isFree && total >= limit;

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="lbl mb-1">My Library</div>
            <div className="font-bebas text-4xl text-white">Collection</div>
            <div className="text-sm mt-1" style={{ color:"var(--tx2)" }}>
              {total}{isFree?`/${limit}`:""} records
              {collectionStats?.estimatedValue ? ` · Est. $${parseFloat(collectionStats.estimatedValue).toLocaleString()}` : ""}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-pk btn-md flex items-center gap-2" onClick={() => setAddOpen(true)}>
              <MdAdd size={17}/> Add Record
            </button>
          </div>
        </div>

        {/* Free tier bar */}
        {isFree && (
          <div className="card-static p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-2">
                <span style={{ color:"var(--tx2)" }}>Collection usage</span>
                <span style={{ color:atLimit?"var(--pk)":"var(--cy)" }}>{total} / {limit}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"var(--bdr)" }}>
                <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(100,(total/limit)*100)}%`, background:atLimit?"var(--pk)":"var(--cy)" }}/>
              </div>
            </div>
            {atLimit && <a href="/premium" className="btn btn-pk btn-sm flex-shrink-0">Upgrade</a>}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon:<MdAlbum size={22}/>, v:total, l:"Records", c:"var(--cy)" },
            { icon:<MdAttachMoney size={22}/>, v:collectionStats?.estimatedValue ? `$${parseFloat(collectionStats.estimatedValue).toLocaleString()}` : "—", l:"Est. Value", c:"var(--ye)" },
            { icon:<MdMusicNote size={22}/>, v:Object.keys(collectionStats?.byCondition || {}).length || "—", l:"Conditions", c:"var(--pk)" },
          ].map(s => (
            <div key={s.l} className="card-static p-4 text-center flex flex-col items-center gap-1">
              <div style={{ color:s.c }}>{s.icon}</div>
              <div className="stat-n text-2xl" style={{ color:s.c }}>{s.v}</div>
              <div className="text-xs font-syne uppercase tracking-widest" style={{ color:"var(--tx3)" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Search + toggle */}
        <div className="flex gap-3">
          <input className="inp flex-1" placeholder="Search your collection…" value={search} onChange={e => setSearch(e.target.value)}/>
          <button onClick={() => setView(v => v==="grid"?"list":"grid")} className="btn btn-ghost btn-sm" style={{ padding:"10px 14px" }}>
            {view==="grid" ? <MdViewList size={19}/> : <MdGridView size={19}/>}
          </button>
        </div>

        {/* Loading */}
        {collectionLoading && collection.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(8)].map((_,i) => (
              <div key={i} className="card p-3 animate-pulse">
                <div className="w-full aspect-square rounded-xl mb-2" style={{ background:"var(--surf)" }}/>
                <div className="h-3 rounded mb-1" style={{ background:"var(--surf)", width:"80%" }}/>
                <div className="h-3 rounded" style={{ background:"var(--surf)", width:"50%" }}/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<MdAlbum size={56}/>} title="No records yet" sub="Add records from Discogs, MusicBrainz, or manually."
            action={<button className="btn btn-pk btn-md" onClick={() => setAddOpen(true)}>Add First Record</button>}/>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 w-full">
            {filtered.map(item => {
              const cover = imgUrl(item.album?.coverUrl);
              const title = item.album?.title || "Unknown";
              const artist = item.album?.albumArtists?.[0]?.artist?.name || "Unknown";
              return (
                <div key={item.id} className="card p-3 group relative">
                  <div className="w-full aspect-square rounded-xl mb-2 flex items-center justify-center overflow-hidden"
                    style={{ background:"rgba(255,0,110,0.08)", border:"1px solid rgba(255,0,110,0.15)" }}>
                    {cover ? <img src={cover} alt={title} className="w-full h-full object-cover"/> : <VinylDisc color="#FF006E" size={56}/>}
                  </div>
                  <div className="font-bold text-xs text-white truncate leading-tight mb-0.5">{title}</div>
                  <div className="text-xs truncate mb-1.5" style={{ color:"var(--tx3)" }}>{artist}</div>
                  <div className="flex items-center justify-between">
                    {item.condition ? <CondBadge cond={COND_LABELS[item.condition] || item.condition}/> : <span/>}
                    <span className="text-xs" style={{ color:"var(--tx3)" }}>{item.album?.year > 0 ? item.album.year : "—"}</span>
                  </div>
                  <button onClick={() => removeFromCollection(item.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 btn btn-ghost btn-sm transition-opacity"
                    style={{ padding:"4px 6px" }}><MdDelete size={14} style={{ color:"var(--pk)" }}/></button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2 w-full">
            {filtered.map(item => {
              const cover = imgUrl(item.album?.coverUrl);
              const title = item.album?.title || "Unknown";
              const artist = item.album?.albumArtists?.[0]?.artist?.name || "Unknown";
              return (
                <div key={item.id} className="card p-4 flex items-center gap-4 group w-full">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background:"rgba(255,0,110,0.08)", border:"1px solid rgba(255,0,110,0.15)" }}>
                    {cover ? <img src={cover} className="w-full h-full object-cover" alt=""/> : <VinylDisc color="#FF006E" size={40}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white truncate">{title}</div>
                    <div className="text-xs" style={{ color:"var(--tx3)" }}>{artist} · {item.album?.year > 0 ? item.album.year : "—"} · {item.album?.format || "Vinyl"}</div>
                  </div>
                  {item.condition && <CondBadge cond={COND_LABELS[item.condition] || item.condition}/>}
                  {item.purchasePrice && <span className="stat-n text-lg hidden sm:block" style={{ color:"var(--ye)" }}>${parseFloat(item.purchasePrice).toFixed(0)}</span>}
                  <button onClick={() => removeFromCollection(item.id)}
                    className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100" style={{ padding:"6px 8px" }}>
                    <MdDelete size={15} style={{ color:"var(--pk)" }}/>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setSelected(null); setSearchResults([]); setManualMode(false); }} title="Add to Collection">
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background:"var(--surf)" }}>
            {[["search","Search Discogs/MB"],["manual","Add Manually"]].map(([m,l]) => (
              <button key={m} onClick={() => setManualMode(m==="manual")}
                className="flex-1 py-2 rounded-md text-xs font-syne font-bold uppercase tracking-wider transition-all"
                style={{ background:(!manualMode&&m==="search")||(manualMode&&m==="manual")?"var(--pk)":"transparent", color:(!manualMode&&m==="search")||(manualMode&&m==="manual")?"#fff":"var(--tx3)" }}>
                {l}
              </button>
            ))}
          </div>

          {!manualMode ? (
            <>
              <div className="flex gap-2">
                <input className="inp flex-1 text-sm" placeholder="Search album or artist…" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSearch()}/>
                <button className="btn btn-cy btn-sm flex items-center gap-1.5" onClick={handleSearch} disabled={searchLoading}>
                  <MdSearch size={15}/>{searchLoading ? "…" : "Search"}
                </button>
              </div>

              {searchResults.length > 0 && !selected && (
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {searchResults.map(r => (
                    <div key={`${r.source}-${r.externalId}`} onClick={() => setSelected(r)}
                      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                      style={{ background:"var(--surf)", border:"1px solid transparent" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor="var(--cy)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor="transparent")}>
                      {r.coverUrl ? <img src={r.coverUrl} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt=""/> : <VinylDisc color="#7B2FFF" size={36}/>}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-white truncate">{r.title}</div>
                        <div className="text-xs truncate" style={{ color:"var(--tx3)" }}>{r.artists?.join(", ")} {r.year ? `· ${r.year}` : ""} · {r.format || "?"}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background:r.source==="DISCOGS"?"rgba(255,0,110,0.1)":"rgba(0,245,255,0.1)", color:r.source==="DISCOGS"?"var(--pk)":"var(--cy)" }}>{r.source}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected && (
                <div className="p-3 rounded-xl flex gap-3" style={{ background:"rgba(0,245,255,0.06)", border:"1px solid rgba(0,245,255,0.2)" }}>
                  {selected.coverUrl ? <img src={selected.coverUrl} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" alt=""/> : <VinylDisc color="#00F5FF" size={48}/>}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white">{selected.title}</div>
                    <div className="text-xs" style={{ color:"var(--tx2)" }}>{selected.artists?.join(", ")} · {selected.year || "?"}</div>
                    <button onClick={() => setSelected(null)} className="text-xs mt-1" style={{ color:"var(--pk)", background:"none", border:"none", cursor:"pointer" }}>✕ Clear</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl text-[10px] block mb-1.5">Condition</label>
                  <select className="inp text-sm" value={condition} onChange={e => setCondition(e.target.value)}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{COND_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lbl text-[10px] block mb-1.5">Purchase Price ($)</label>
                  <input className="inp text-sm" type="number" placeholder="29.99" value={price} onChange={e => setPrice(e.target.value)}/>
                </div>
              </div>
              <div>
                <label className="lbl text-[10px] block mb-1.5">Notes (optional)</label>
                <input className="inp text-sm" placeholder="Original pressing, great condition…" value={notes} onChange={e => setNotes(e.target.value)}/>
              </div>
              <button className="btn btn-pk btn-md w-full" disabled={!selected || adding} onClick={handleAdd}>
                {adding ? "Adding…" : "Add to Collection"}
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="lbl text-[10px] block mb-1.5">Album Title *</label>
                  <input className="inp text-sm" placeholder="The Dark Side of the Moon" value={manual.title} onChange={e => setManual(m => ({...m,title:e.target.value}))}/>
                </div>
                <div className="col-span-2">
                  <label className="lbl text-[10px] block mb-1.5">Artist(s) * (comma separated)</label>
                  <input className="inp text-sm" placeholder="Pink Floyd" value={manual.artistNames} onChange={e => setManual(m => ({...m,artistNames:e.target.value}))}/>
                </div>
                <div>
                  <label className="lbl text-[10px] block mb-1.5">Year</label>
                  <input className="inp text-sm" placeholder="1973" value={manual.year} onChange={e => setManual(m => ({...m,year:e.target.value}))}/>
                </div>
                <div>
                  <label className="lbl text-[10px] block mb-1.5">Format</label>
                  <select className="inp text-sm" value={manual.format} onChange={e => setManual(m => ({...m,format:e.target.value}))}>
                    {["Vinyl","CD","Cassette","Digital"].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lbl text-[10px] block mb-1.5">Condition</label>
                  <select className="inp text-sm" value={manual.condition} onChange={e => setManual(m => ({...m,condition:e.target.value}))}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{COND_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lbl text-[10px] block mb-1.5">Price ($)</label>
                  <input className="inp text-sm" type="number" placeholder="29.99" value={manual.price} onChange={e => setManual(m => ({...m,price:e.target.value}))}/>
                </div>
                <div className="col-span-2">
                  <label className="lbl text-[10px] block mb-1.5">Notes</label>
                  <input className="inp text-sm" placeholder="Original UK pressing…" value={manual.notes} onChange={e => setManual(m => ({...m,notes:e.target.value}))}/>
                </div>
              </div>
              <button className="btn btn-pk btn-md w-full" disabled={!manual.title || !manual.artistNames || adding} onClick={handleManualAdd}>
                {adding ? "Adding…" : "Add Manually"}
              </button>
            </>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
