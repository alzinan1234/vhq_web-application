"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { Avatar, VinylDisc, CondBadge, Modal, EmptyState } from "@/components/ui";
import { marketplaceApi, imgUrl, getAccessToken, type ApiListing, type ApiCreateListing } from "@/lib/api";
import {
  MdSearch, MdFavorite, MdFavoriteBorder, MdMessage, MdAdd,
  MdLocalOffer, MdBookmark, MdBookmarkBorder, MdStorefront,
  MdCheckCircle, MdClose, MdFlag, MdMoreVert, MdCloudUpload, MdDelete
} from "react-icons/md";

const CATEGORIES = ["All","VINYL","CD","EQUIPMENT"];
const CAT_LABELS: Record<string,string> = { All:"All", VINYL:"Vinyl", CD:"CD", EQUIPMENT:"Equipment" };
const CONDITIONS = ["MINT","NEAR_MINT","VERY_GOOD_PLUS","VERY_GOOD","GOOD_PLUS","GOOD","FAIR","POOR"];
const COND_LABELS: Record<string,string> = {
  MINT:"M", NEAR_MINT:"NM", VERY_GOOD_PLUS:"VG+", VERY_GOOD:"VG",
  GOOD_PLUS:"G+", GOOD:"G", FAIR:"Fair", POOR:"Poor"
};
const SORTS = [
  {v:"newest",l:"Newest"},{v:"oldest",l:"Oldest"},
  {v:"price_asc",l:"Price ↑"},{v:"price_desc",l:"Price ↓"}
];

export default function MarketplacePage() {
  const { user, isLoggedIn, listings, listingsLoading, loadListings, savedListings, loadSavedListings,
    saveListing, unsaveListing, createListing, showToast } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<ApiListing | null>(null);
  const [listingOpen, setListingOpen] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [newListing, setNewListing] = useState<Partial<ApiCreateListing>>({
    title:"", description:"", price:0, currency:"USD", category:"VINYL",
    condition:"VERY_GOOD_PLUS", location:""
  });
  const [submitting, setSubmitting] = useState(false);
  const [openMenu, setOpenMenu] = useState<string|null>(null);
  const [myListings, setMyListings] = useState<ApiListing[]>([]);
  const [showMy, setShowMy] = useState(false);
  
  // Image upload states
  const [listingImages, setListingImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Load initial data
  useEffect(() => { 
    loadListings(); 
    if (isLoggedIn) {
      loadSavedListings();
      loadMyListings();
    }
  }, [isLoggedIn, loadListings, loadSavedListings]);

  const applyFilters = useCallback(() => {
    loadListings({
      q: search || undefined,
      category: category !== "All" ? category : undefined,
      condition: condition || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy: sort,
    });
  }, [loadListings, search, category, condition, minPrice, maxPrice, sort]);

  useEffect(() => {
    const t = setTimeout(applyFilters, 400);
    return () => clearTimeout(t);
  }, [applyFilters]);

  const loadMyListings = async () => {
    try { 
      const res = await marketplaceApi.getMyListings(); 
      if (res?.data) setMyListings(res.data); 
    } catch (err) { 
      console.error("Failed to load my listings:", err); 
    }
  };

  const isSaved = (id: string) => savedListings?.some(l => l.id === id) || false;

  const handleMsg = useCallback((listing: ApiListing) => {
    if (!isLoggedIn) { 
      router.push("/auth"); 
      return; 
    }
    router.push(`/messages?listing=${listing.id}`);
  }, [isLoggedIn, router]);

  const handleSave = useCallback(async (listing: ApiListing) => {
    if (!isLoggedIn) { 
      router.push("/auth"); 
      return; 
    }
    try {
      if (isSaved(listing.id)) { 
        await unsaveListing(listing.id); 
        showToast("Removed from saved"); 
      } else { 
        await saveListing(listing.id); 
        showToast("Saved to collection");
      }
    } catch (err) {
      showToast("Something went wrong", "error");
    }
  }, [isLoggedIn, isSaved, unsaveListing, saveListing, showToast, router]);

  // Image upload handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
      showToast("Please select valid image files", "error");
      return;
    }
    
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setListingImages(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setListingImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    setListingImages([]);
    setImagePreviews([]);
  };

  // FIXED: Create listing with multipart/form-data (as shown in Postman)
  const handleCreate = async () => {
    // Validate fields
    if (!newListing.title || !newListing.title.trim()) {
      showToast("Title is required", "error"); 
      return;
    }
    if (newListing.title.length > 200) {
      showToast("Title must be less than 200 characters", "error");
      return;
    }
    if (!newListing.price || newListing.price <= 0) {
      showToast("Price must be greater than 0", "error");
      return;
    }
    if (!newListing.location || !newListing.location.trim()) {
      showToast("Location is required", "error");
      return;
    }
    if (!newListing.category) {
      showToast("Category is required", "error");
      return;
    }
    if (!newListing.condition) {
      showToast("Condition is required", "error");
      return;
    }
    if (listingImages.length === 0) {
      showToast("Please add at least one image of the item", "error");
      return;
    }
    
    setSubmitting(true);
    setUploadingImages(true);
    
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("No access token. Please login again.");
      }
      
      // Create FormData (multipart/form-data)
      const formData = new FormData();
      
      // Add text fields
      formData.append("title", newListing.title.trim());
      formData.append("price", String(Number(newListing.price)));
      formData.append("category", newListing.category);
      formData.append("condition", newListing.condition);
      formData.append("location", newListing.location.trim());
      
      // Optional fields
      if (newListing.description) {
        formData.append("description", newListing.description);
      }
      if (newListing.currency) {
        formData.append("currency", newListing.currency);
      }
      
      // Add images (as shown in Postman - key "images" with File type)
      listingImages.forEach(file => {
        formData.append("images", file);
      });
      
      console.log("📤 Sending listing with images using FormData");
      
      // Send request
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.thevinylheadquarters.com/v1"}/marketplace`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData, // Don't set Content-Type - browser will set it with boundary
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Request failed" }));
        console.error("❌ API Error:", errorData);
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log("✅ Listing created successfully:", result);
      
      showToast("Listing created successfully!");
      setListingOpen(false);
      setNewListing({ title:"", description:"", price:0, currency:"USD", category:"VINYL", condition:"VERY_GOOD_PLUS", location:"" });
      clearImages();
      await loadMyListings();
      await loadListings();
      
    } catch (err) {
      console.error("❌ Create listing error:", err);
      let errorMessage = "Failed to create listing";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleMarkSold = async (id: string) => {
    try { 
      await marketplaceApi.markSold(id); 
      await loadMyListings(); 
      await loadListings();
      showToast("Marked as sold!"); 
    } catch (err) { 
      showToast("Failed to mark as sold", "error");
    }
    setOpenMenu(null);
  };

  const handleDelete = async (id: string) => {
    try { 
      await marketplaceApi.delete(id); 
      await loadMyListings(); 
      await loadListings();
      showToast("Listing deleted"); 
    } catch (err) { 
      showToast("Failed to delete listing", "error");
    }
    setOpenMenu(null);
  };

  const displayListings = showSaved ? savedListings : (showMy ? myListings : listings);

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 lbl mb-1"><MdLocalOffer size={14}/> P2P · Zero Fees</div>
            <div className="font-bebas text-4xl text-white">Marketplace</div>
            <div className="text-sm mt-1" style={{ color:"var(--tx2)" }}>
              {listings?.length || 0} listings · message sellers directly
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isLoggedIn && (
              <>
                <button onClick={() => { setShowSaved(!showSaved); setShowMy(false); }}
                  className={`btn btn-sm flex items-center gap-1.5 ${showSaved?"btn-cy":"btn-ghost"}`}>
                  <MdBookmark size={15}/> Saved
                </button>
                <button onClick={() => { setShowMy(!showMy); setShowSaved(false); }}
                  className={`btn btn-sm flex items-center gap-1.5 ${showMy?"btn-cy":"btn-ghost"}`}>
                  <MdStorefront size={15}/> My Listings
                </button>
                <button className="btn btn-pk btn-md flex items-center gap-2" onClick={() => setListingOpen(true)}>
                  <MdAdd size={18}/> List an Item
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card-static p-4 space-y-4">
          <div className="relative">
            <MdSearch size={19} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--tx3)" }}/>
            <input className="inp" style={{ paddingLeft:40 }} placeholder="Search title, artist…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select className="inp text-sm" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
            <select className="inp text-sm" value={condition} onChange={e => setCondition(e.target.value)}>
              <option value="">Any Condition</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{COND_LABELS[c]}</option>)}
            </select>
            <select className="inp text-sm" value={sort} onChange={e => setSort(e.target.value)}>
              {SORTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
            <div className="flex gap-2">
              <input className="inp text-sm flex-1" type="number" placeholder="Min $" value={minPrice} onChange={e => setMinPrice(e.target.value)}/>
              <input className="inp text-sm flex-1" type="number" placeholder="Max $" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}/>
            </div>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} className="btn btn-ghost btn-sm flex-shrink-0"
              style={category===c?{borderColor:"var(--cy)",color:"var(--cy)",background:"rgba(0,245,255,0.06)"}:{}}>
              {CAT_LABELS[c]}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {listingsLoading && displayListings?.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_,i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="w-full h-32 rounded-xl mb-3" style={{ background:"var(--surf)" }}/>
                <div className="h-3 rounded mb-2" style={{ background:"var(--surf)", width:"75%" }}/>
                <div className="h-3 rounded mb-3" style={{ background:"var(--surf)", width:"50%" }}/>
                <div className="flex justify-between">
                  <div className="h-6 w-16 rounded" style={{ background:"var(--surf)" }}/>
                  <div className="h-8 w-24 rounded" style={{ background:"var(--surf)" }}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Listings — show edit options */}
        {showMy && myListings?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myListings.map(listing => {
              const cover = listing.album?.coverUrl ? imgUrl(listing.album.coverUrl) : (listing.images?.[0]?.url ? imgUrl(listing.images[0].url) : null);
              return (
                <div key={listing.id} className="card p-4 flex flex-col gap-3 relative">
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`badge ${listing.status==="ACTIVE"?"badge-gr":listing.status==="SOLD"?"badge-pk":"badge-cy"}`} style={{ fontSize:"0.52rem" }}>
                      {listing.status}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute top-2 right-2 z-10">
                      <button onClick={() => setOpenMenu(openMenu===listing.id?null:listing.id)}
                        className="btn btn-ghost btn-sm" style={{ padding:"4px" }}>
                        <MdMoreVert size={16}/>
                      </button>
                      {openMenu===listing.id && (
                        <div className="absolute right-0 top-8 rounded-xl overflow-hidden shadow-xl z-20" style={{ background:"var(--card)", border:"1px solid var(--bdr)", minWidth:140 }}>
                          {listing.status==="ACTIVE" && (
                            <button onClick={() => handleMarkSold(listing.id)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm" style={{ color:"#4ADE80", background:"none", border:"none", cursor:"pointer" }}>
                              <MdCheckCircle size={15}/> Mark Sold
                            </button>
                          )}
                          <button onClick={() => handleDelete(listing.id)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm" style={{ color:"var(--pk)", background:"none", border:"none", cursor:"pointer" }}>
                            <MdClose size={15}/> Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="w-full h-28 rounded-xl flex items-center justify-center overflow-hidden" style={{ background:"rgba(123,47,255,0.08)", border:"1px solid rgba(123,47,255,0.2)" }}>
                      {cover ? <img src={cover} alt="" className="w-full h-full object-cover"/> : <VinylDisc color="#7B2FFF" size={72}/>}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white truncate">{listing.title}</div>
                    <div className="text-xs" style={{ color:"var(--tx2)" }}>{listing.location}</div>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="stat-n text-xl" style={{ color:"var(--ye)" }}>${parseFloat(listing.price).toFixed(0)}</span>
                    <span className="text-xs" style={{ color:"var(--tx3)" }}>{listing.viewCount || 0} views</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Main listings grid */}
        {!showMy && !listingsLoading && (!displayListings || displayListings.length === 0) && (
          <EmptyState icon={<MdSearch size={56}/>} title={showSaved ? "No saved listings" : "No listings found"} sub={showSaved ? "Save listings from the marketplace" : "Try adjusting your search filters"}/>
        )}

        {!showMy && displayListings && displayListings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {displayListings.map(listing => {
              const cover = listing.album?.coverUrl ? imgUrl(listing.album.coverUrl) : (listing.images?.[0]?.url ? imgUrl(listing.images[0].url) : null);
              const saved = isSaved(listing.id);
              return (
                <div key={listing.id} className="card p-4 flex flex-col">
                  <div className="relative w-full h-32 rounded-xl mb-3 flex items-center justify-center cursor-pointer overflow-hidden"
                    style={{ background:"rgba(255,0,110,0.08)", border:"1px solid rgba(255,0,110,0.15)" }}
                    onClick={() => setSelected(listing)}>
                    {cover ? <img src={cover} alt={listing.title} className="w-full h-full object-cover"/> : <VinylDisc color="#FF006E" size={84}/>}
                    {listing.isFeatured && <span className="badge badge-ye absolute top-2 left-2" style={{ fontSize:"0.5rem" }}>Featured</span>}
                    {listing.status === "SOLD" && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background:"rgba(0,0,0,0.6)" }}>
                        <span className="font-bebas text-2xl" style={{ color:"var(--pk)" }}>SOLD</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2">
                      <CondBadge cond={COND_LABELS[listing.condition] || listing.condition}/>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-sm text-white leading-tight truncate mb-0.5 cursor-pointer" onClick={() => setSelected(listing)}>{listing.title}</div>
                    <div className="text-xs mb-1" style={{ color:"var(--tx2)" }}>
                      {listing.category} · {listing.location}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-2 border-t border-b mb-3" style={{ borderColor:"var(--bdr)" }}>
                    {imgUrl(listing.user?.avatarUrl) ? (
                      <img src={imgUrl(listing.user.avatarUrl)!} className="w-5 h-5 rounded-full object-cover" alt=""/>
                    ) : (
                      <Avatar color="#7B2FFF" name={listing.user?.username || "User"} size={20}/>
                    )}
                    <span className="text-xs truncate" style={{ color:"var(--tx3)" }}>@{listing.user?.username || "unknown"}</span>
                    <span className="text-xs ml-auto" style={{ color:"var(--tx3)" }}>{listing.viewCount || 0} views</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="stat-n text-xl" style={{ color:"var(--ye)" }}>${parseFloat(listing.price).toFixed(0)}</span>
                    <div className="flex gap-1.5">
                      {isLoggedIn && (
                        <button onClick={() => handleSave(listing)} className="btn btn-ghost btn-sm" style={{ padding:"7px 9px", color:saved?"#FF006E":undefined }}>
                          {saved ? <MdBookmark size={16}/> : <MdBookmarkBorder size={16}/>}
                        </button>
                      )}
                      {listing.status !== "SOLD" && listing.user?.id !== user?.id && (
                        <button onClick={() => handleMsg(listing)} className="btn btn-pk btn-sm flex items-center gap-1">
                          <MdMessage size={14}/> Message
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title}>
        {selected && (
          <div className="space-y-4">
            <div className="w-full h-44 rounded-xl flex items-center justify-center overflow-hidden" style={{ background:"rgba(255,0,110,0.08)", border:"1px solid rgba(255,0,110,0.15)" }}>
              {selected.album?.coverUrl && imgUrl(selected.album.coverUrl)
                ? <img src={imgUrl(selected.album.coverUrl)!} alt="" className="w-full h-full object-cover"/>
                : selected.images?.[0]?.url
                ? <img src={imgUrl(selected.images[0].url)!} alt="" className="w-full h-full object-cover"/>
                : <VinylDisc color="#FF006E" size={120}/>}
            </div>
            <div>
              <div className="font-bold text-lg text-white">{selected.title}</div>
              {selected.description && <div className="text-sm mt-1 leading-relaxed" style={{ color:"var(--tx2)" }}>{selected.description}</div>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[["Category",CAT_LABELS[selected.category]||selected.category],["Condition",COND_LABELS[selected.condition]||selected.condition],["Location",selected.location]].map(([k,v]) => (
                <div key={k} className="card-static p-3 text-center">
                  <div className="text-xs mb-1" style={{ color:"var(--tx3)" }}>{k}</div>
                  <div className="font-bold text-xs text-white">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background:"var(--surf)" }}>
              {imgUrl(selected.user?.avatarUrl)
                ? <img src={imgUrl(selected.user.avatarUrl)!} className="w-9 h-9 rounded-full object-cover" alt=""/>
                : <Avatar color="#7B2FFF" name={selected.user?.username || "User"} size={36}/>}
              <div>
                <div className="text-sm font-bold text-white">@{selected.user?.username || "unknown"}</div>
                <div className="text-xs" style={{ color:"var(--tx3)" }}>Seller</div>
              </div>
              <span className="stat-n text-2xl ml-auto" style={{ color:"var(--ye)" }}>${parseFloat(selected.price).toFixed(0)}</span>
            </div>
            {selected.status !== "SOLD" && selected.user?.id !== user?.id && (
              <div className="flex gap-3">
                <button onClick={() => handleSave(selected)} className="btn btn-cy btn-md flex-1 flex items-center justify-center gap-2">
                  {isSaved(selected.id) ? <><MdBookmark size={16}/> Saved</> : <><MdBookmarkBorder size={16}/> Save</>}
                </button>
                <button onClick={() => { handleMsg(selected); setSelected(null); }} className="btn btn-pk btn-md flex-1 flex items-center justify-center gap-2">
                  <MdMessage size={16}/> Message
                </button>
              </div>
            )}
            {isLoggedIn && selected.user?.id !== user?.id && (
              <button onClick={async () => { 
                try {
                  await marketplaceApi.report(selected.id, "Inappropriate listing"); 
                  showToast("Reported"); 
                  setSelected(null);
                } catch {
                  showToast("Failed to report", "error");
                }
              }} className="btn btn-ghost btn-sm w-full flex items-center justify-center gap-1.5" style={{ color:"var(--tx3)" }}>
                <MdFlag size={13}/> Report Listing
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Create Listing Modal with Image Upload */}
      <Modal open={listingOpen} onClose={() => {
        setListingOpen(false);
        clearImages();
      }} title="List an Item">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="lbl text-[10px] block mb-1.5">Title *</label>
              <input className="inp text-sm" placeholder="Pink Floyd - Dark Side of the Moon" value={newListing.title || ""} onChange={e => setNewListing(l => ({...l, title:e.target.value}))}/>
            </div>
            <div>
              <label className="lbl text-[10px] block mb-1.5">Category *</label>
              <select className="inp text-sm" value={newListing.category} onChange={e => setNewListing(l => ({...l, category:e.target.value as ApiCreateListing["category"]}))}>
                {["VINYL","CD","EQUIPMENT"].map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl text-[10px] block mb-1.5">Condition *</label>
              <select className="inp text-sm" value={newListing.condition} onChange={e => setNewListing(l => ({...l, condition:e.target.value}))}>
                {CONDITIONS.map(c => <option key={c} value={c}>{COND_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl text-[10px] block mb-1.5">Price (USD) *</label>
              <input className="inp text-sm" type="number" step="0.01" min="0.01" placeholder="45" value={newListing.price || ""} onChange={e => setNewListing(l => ({...l, price:parseFloat(e.target.value) || 0}))}/>
            </div>
            <div>
              <label className="lbl text-[10px] block mb-1.5">Location *</label>
              <input className="inp text-sm" placeholder="New York, US" value={newListing.location || ""} onChange={e => setNewListing(l => ({...l, location:e.target.value}))}/>
            </div>
            
            {/* Image Upload Section */}
            <div className="col-span-2">
              <label className="lbl text-[10px] block mb-1.5">Images * (at least 1 required)</label>
              <div className="border-2 border-dashed rounded-xl p-4 text-center" style={{ borderColor:"var(--bdr)" }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                  disabled={uploadingImages}
                />
                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <MdCloudUpload size={32} style={{ color:"var(--cy)" }}/>
                  <span className="text-xs" style={{ color:"var(--tx2)" }}>Click to upload images</span>
                  <span className="text-[10px]" style={{ color:"var(--tx3)" }}>JPEG, PNG, GIF up to 10MB each</span>
                </label>
              </div>
              
              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-20 rounded-lg object-cover"/>
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MdDelete size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[10px] mt-2" style={{ color: listingImages.length === 0 ? "var(--pk)" : "var(--cy)" }}>
                {listingImages.length === 0 ? "⚠️ At least one image required" : `✓ ${listingImages.length} image(s) selected`}
              </div>
            </div>
            
            <div className="col-span-2">
              <label className="lbl text-[10px] block mb-1.5">Description</label>
              <textarea className="inp text-sm" rows={3} style={{ resize:"none" }} placeholder="Describe the item, pressing info, any defects…" value={newListing.description || ""} onChange={e => setNewListing(l => ({...l, description:e.target.value}))}/>
            </div>
          </div>
          <div className="card-static p-3 rounded-lg text-xs flex items-center gap-2" style={{ color:"var(--tx3)" }}>
            <MdLocalOffer size={14} style={{ color:"#4ADE80", flexShrink:0 }}/>
            <span><strong style={{ color:"var(--tx)" }}>Zero seller fees</strong> — you keep 100%.</span>
          </div>
          <button className="btn btn-pk btn-md w-full" disabled={submitting || uploadingImages || listingImages.length === 0} onClick={handleCreate}>
            {submitting || uploadingImages ? "Creating..." : `List for $${newListing.price || 0} · Zero Fees`}
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}