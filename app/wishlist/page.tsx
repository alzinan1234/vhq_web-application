"use client";
import { useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { VinylDisc, EmptyState } from "@/components/ui";
import { imgUrl } from "@/lib/api";
import { MdFavorite, MdDelete, MdMessage } from "react-icons/md";
import { useRouter } from "next/navigation";

export default function WishlistPage() {
  const { isLoggedIn, wishlist, wishlistLoading, loadWishlist, removeFromWishlist } = useStore();
  const router = useRouter();

  useEffect(() => { if (isLoggedIn) loadWishlist(); }, [isLoggedIn]);

  if (!isLoggedIn) return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-20 text-center">
        <MdFavorite size={64} style={{ color:"var(--tx3)", margin:"0 auto 16px" }}/>
        <div className="font-bebas text-4xl text-white mb-4">Wish List</div>
        <p className="mb-6" style={{ color:"var(--tx2)" }}>Log in to manage your wish list.</p>
        <a href="/auth"><button className="btn btn-pk btn-lg">Log In</button></a>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        <div>
          <div className="lbl mb-1">Saved</div>
          <div className="font-bebas text-4xl text-white">Wish List</div>
          <div className="text-sm mt-1" style={{ color:"var(--tx2)" }}>{wishlist.length} albums</div>
        </div>

        {wishlistLoading && wishlist.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_,i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="w-full h-32 rounded-xl mb-3" style={{ background:"var(--surf)" }}/>
                <div className="h-3 rounded mb-2" style={{ background:"var(--surf)", width:"70%" }}/>
                <div className="h-3 rounded" style={{ background:"var(--surf)", width:"45%" }}/>
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <EmptyState icon={<MdFavorite size={56}/>} title="Your wish list is empty"
            sub="Add albums from the marketplace to track them here."
            action={<a href="/marketplace"><button className="btn btn-pk btn-md">Browse Marketplace</button></a>}/>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {wishlist.map(item => {
              const cover = imgUrl(item.album?.coverUrl);
              const artist = item.album?.albumArtists?.[0]?.artist?.name || "Unknown";
              return (
                <div key={item.id} className="card p-4 flex flex-col group">
                  <div className="relative w-full h-32 rounded-xl mb-3 flex items-center justify-center overflow-hidden"
                    style={{ background:"rgba(255,0,110,0.08)", border:"1px solid rgba(255,0,110,0.15)" }}>
                    {cover ? <img src={cover} alt={item.album?.title} className="w-full h-full object-cover"/> : <VinylDisc color="#FF006E" size={84}/>}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-white truncate mb-0.5">{item.album?.title}</div>
                    <div className="text-xs mb-1" style={{ color:"var(--tx2)" }}>{artist} · {item.album?.year > 0 ? item.album.year : "—"}</div>
                    {item.notes && <div className="text-xs italic mb-2" style={{ color:"var(--tx3)" }}>{item.notes}</div>}
                  </div>
                  <div className="flex gap-2 mt-2 pt-2 border-t" style={{ borderColor:"var(--bdr)" }}>
                    <button onClick={() => router.push("/marketplace")} className="btn btn-pk btn-sm flex-1 flex items-center justify-center gap-1">
                      <MdMessage size={13}/> Find Listings
                    </button>
                    <button onClick={() => removeFromWishlist(item.id)} className="btn btn-ghost btn-sm" style={{ padding:"7px 9px", color:"var(--pk)" }}>
                      <MdDelete size={15}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
