"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { Modal, EmptyState } from "@/components/ui";
import { imgUrl, type ApiMerchProduct } from "@/lib/api";
import { MdShoppingCart, MdAdd, MdRemove, MdDelete, MdLocalShipping, MdClose } from "react-icons/md";
import { RiVipCrownFill } from "react-icons/ri";

export default function ShopPage() {
  const { isLoggedIn, merchProducts, merchLoading, loadMerchProducts, cart, addToCart, removeFromCart, clearCart, showToast, checkoutCart, checkoutLoading } = useStore();
  const [selected, setSelected] = useState<ApiMerchProduct|null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [size, setSize] = useState("M");

  useEffect(() => { loadMerchProducts(); }, []);

  const cartTotal = cart.reduce((a,c) => a+c.price*c.qty, 0);
  const cartCount = cart.reduce((a,c) => a+c.qty, 0);

  const handleAddToCart = (product: ApiMerchProduct) => {
    addToCart({ productId: product.id, name: product.name, price: parseFloat(product.price), size, coverUrl: product.coverUrl });
    showToast("Added to cart!");
    setSelected(null);
  };

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="lbl mb-1">Official</div>
            <div className="font-bebas text-4xl text-white">VHQ Shop</div>
            <div className="text-sm mt-1" style={{ color:"var(--tx2)" }}>{merchProducts.length} products</div>
          </div>
          <button className="btn btn-cy btn-md flex items-center gap-2 relative" onClick={() => setCartOpen(true)}>
            <MdShoppingCart size={18}/> Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background:"var(--pk)" }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Products */}
        {merchLoading && merchProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_,i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="w-full aspect-square rounded-xl mb-3" style={{ background:"var(--surf)" }}/>
                <div className="h-3 rounded mb-2" style={{ background:"var(--surf)", width:"75%" }}/>
                <div className="h-3 rounded" style={{ background:"var(--surf)", width:"40%" }}/>
              </div>
            ))}
          </div>
        ) : merchProducts.length === 0 ? (
          <EmptyState icon={<MdShoppingCart size={56}/>} title="No products yet" sub="Check back soon for VHQ merch!"/>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {merchProducts.map(p => {
              const cover = imgUrl(p.coverUrl);
              const inCart = cart.some(c => c.productId === p.id);
              return (
                <div key={p.id} className="card p-4 flex flex-col cursor-pointer" onClick={() => setSelected(p)}>
                  <div className="w-full aspect-square rounded-xl mb-3 flex items-center justify-center overflow-hidden"
                    style={{ background:"rgba(123,47,255,0.08)", border:"1px solid rgba(123,47,255,0.15)" }}>
                    {cover ? <img src={cover} alt={p.name} className="w-full h-full object-cover"/> : (
                      <div className="font-bebas text-4xl" style={{ color:"var(--pu)", opacity:0.4 }}>VHQ</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-white leading-tight mb-0.5">{p.name}</div>
                    <div className="text-xs mb-2" style={{ color:"var(--tx3)" }}>{p.category.name}</div>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="stat-n text-xl" style={{ color:"var(--ye)" }}>${parseFloat(p.price).toFixed(2)}</span>
                    <div className="flex items-center gap-1.5">
                      {p.stock <= 5 && p.stock > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background:"rgba(255,230,0,0.1)", color:"var(--ye)" }}>{p.stock} left</span>
                      )}
                      {inCart && <span className="badge badge-gr" style={{ fontSize:"0.5rem" }}>In Cart</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-4">
            <div className="w-full h-52 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background:"rgba(123,47,255,0.08)", border:"1px solid rgba(123,47,255,0.2)" }}>
              {imgUrl(selected.coverUrl)
                ? <img src={imgUrl(selected.coverUrl)!} alt={selected.name} className="w-full h-full object-cover"/>
                : <div className="font-bebas text-6xl" style={{ color:"var(--pu)", opacity:0.3 }}>VHQ</div>}
            </div>
            <div>
              <div className="font-bold text-lg text-white mb-1">{selected.name}</div>
              <div className="text-sm leading-relaxed mb-2" style={{ color:"var(--tx2)" }}>{selected.description}</div>
              <div className="flex items-center gap-3">
                <span className="stat-n text-2xl" style={{ color:"var(--ye)" }}>${parseFloat(selected.price).toFixed(2)}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:"rgba(74,222,128,0.1)", color:"#4ADE80" }}>
                  {selected.stock} in stock
                </span>
              </div>
            </div>
            {/* Size picker for apparel */}
            {selected.category?.slug?.includes("apparel") || selected.category?.slug?.includes("shirt") ? (
              <div>
                <label className="lbl text-[10px] block mb-2">Size</label>
                <div className="flex gap-2">
                  {["XS","S","M","L","XL","XXL"].map(s => (
                    <button key={s} onClick={() => setSize(s)}
                      className="w-10 h-10 rounded-lg text-xs font-bold transition-all"
                      style={{ background:size===s?"var(--pk)":"var(--surf)", color:size===s?"#fff":"var(--tx2)", border:`1px solid ${size===s?"var(--pk)":"var(--bdr)"}` }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background:"rgba(0,245,255,0.06)", color:"var(--cy)" }}>
              <MdLocalShipping size={15}/> Fulfilled via RevenueCat · Ships worldwide
            </div>
            {isLoggedIn ? (
              <button className="btn btn-pk btn-md w-full flex items-center justify-center gap-2" disabled={selected.stock === 0}
                onClick={() => handleAddToCart(selected)}>
                <MdShoppingCart size={16}/> {selected.stock === 0 ? "Out of Stock" : "Add to Cart"}
              </button>
            ) : (
              <a href="/auth"><button className="btn btn-pk btn-md w-full">Log In to Purchase</button></a>
            )}
          </div>
        )}
      </Modal>

      {/* Cart Modal */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title={`Cart (${cartCount})`}>
        {cart.length === 0 ? (
          <div className="text-center py-10" style={{ color:"var(--tx3)" }}>
            <MdShoppingCart size={40} style={{ margin:"0 auto 12px", opacity:0.3 }}/>
            <div className="text-sm">Your cart is empty</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cart.map(item => (
                <div key={`${item.productId}-${item.size}`} className="flex items-center gap-3 p-3 rounded-xl" style={{ background:"var(--surf)" }}>
                  {item.coverUrl && imgUrl(item.coverUrl)
                    ? <img src={imgUrl(item.coverUrl)!} className="w-12 h-12 rounded-lg object-cover" alt=""/>
                    : <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background:"rgba(123,47,255,0.1)" }}><RiVipCrownFill style={{ color:"var(--pu)" }}/></div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white truncate">{item.name}</div>
                    {item.size && <div className="text-xs" style={{ color:"var(--tx3)" }}>Size: {item.size}</div>}
                    <div className="text-sm" style={{ color:"var(--ye)" }}>${(item.price * item.qty).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-white">×{item.qty}</span>
                    <button onClick={() => removeFromCart(item.productId, item.size)} className="btn btn-ghost btn-sm" style={{ padding:"4px", color:"var(--pk)" }}>
                      <MdDelete size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background:"var(--surf)" }}>
              <span className="font-bold text-sm text-white">Total</span>
              <span className="stat-n text-xl" style={{ color:"var(--ye)" }}>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="text-xs text-center" style={{ color:"var(--tx3)" }}>Secure checkout powered by Stripe</div>
            <div className="flex gap-3">
              <button className="btn btn-ghost btn-sm flex-1" onClick={clearCart} disabled={checkoutLoading}>Clear Cart</button>
              <button className="btn btn-pk btn-md flex-1" disabled={checkoutLoading} onClick={() => checkoutCart()}>
                {checkoutLoading ? "Redirecting…" : "Checkout"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
