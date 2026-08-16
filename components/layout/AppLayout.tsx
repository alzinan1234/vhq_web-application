"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { imgUrl } from "@/lib/api";
import {
  MdHome, MdDynamicFeed, MdStorefront, MdAlbum, MdFavorite,
  MdStore, MdShoppingBag, MdMessage, MdPerson, MdMenu, MdClose,
  MdWorkspacePremium, MdNotifications, MdCircle
} from "react-icons/md";
import { RiVipCrownFill } from "react-icons/ri";

const navItems = [
  { href:"/",            icon:MdHome,          label:"Home",        auth:false },
  { href:"/feed",        icon:MdDynamicFeed,   label:"Feed",        auth:true  },
  { href:"/marketplace", icon:MdStorefront,    label:"Marketplace", auth:false },
  { href:"/collection",  icon:MdAlbum,         label:"Collection",  auth:true  },
  { href:"/wishlist",    icon:MdFavorite,      label:"Wish List",   auth:true  },
  { href:"/stores",      icon:MdStore,         label:"Stores",      auth:false },
  { href:"/shop",        icon:MdShoppingBag,   label:"Shop",        auth:false },
  { href:"/messages",    icon:MdMessage,       label:"Messages",    auth:true  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoggedIn, cart, unreadMessageCount, unreadNotifCount,
    loadMe, loadUnreadNotifCount, loadUnreadMessageCount, toast } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartCount = cart.reduce((a,c) => a+c.qty, 0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadMe();
      loadUnreadNotifCount();
      loadUnreadMessageCount();
      // Refresh counts every 30s
      const t = setInterval(() => {
        loadUnreadNotifCount();
        loadUnreadMessageCount();
      }, 30000);
      return () => clearInterval(t);
    }
  }, [isLoggedIn, loadMe, loadUnreadNotifCount, loadUnreadMessageCount]);

  const VinylLogo = () => (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="15.5" stroke="#FF006E" strokeWidth="1.5"/>
      <circle cx="17" cy="17" r="10"   stroke="#00F5FF" strokeWidth="0.8" strokeDasharray="2 2.5"/>
      <circle cx="17" cy="17" r="5.5"  stroke="#FF006E" strokeWidth="0.8"/>
      <circle cx="17" cy="17" r="2"    fill="#00F5FF"/>
    </svg>
  );

  const avatarUrl = mounted ? imgUrl(user?.avatarUrl) : null;
  const displayName = user?.displayName || user?.username || "User";

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor:"var(--bdr)" }}>
        <VinylLogo/>
        <div>
          <div className="font-bebas text-xl tracking-widest g1">VHQ</div>
          <div className="text-[9px] font-syne font-bold tracking-[0.25em] uppercase" style={{ color:"var(--tx3)" }}>Vinyl HQ</div>
        </div>
      </Link>
             
      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          if (item.auth && !isLoggedIn) return null;
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              <div className={`sidebar-link ${isActive ? "active" : ""}`}>
                <div className="relative">
                  <Icon size={19}/>
                  {item.href === "/messages" && unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background:"var(--pk)" }}/>
                  )}
                  {item.href === "/notifications" && unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background:"var(--pk)" }}/>
                  )}
                </div>
                <span className="flex-1 text-sm">{item.label}</span>
                {item.href === "/messages" && unreadMessageCount > 0 && (
                  <span className="badge badge-pk" style={{ fontSize:"0.5rem", padding:"2px 6px" }}>{unreadMessageCount}</span>
                )}
                {item.href === "/shop" && cartCount > 0 && (
                  <span className="badge badge-cy" style={{ fontSize:"0.5rem", padding:"2px 6px" }}>{cartCount}</span>
                )}
              </div>
            </Link>
          );
        })}
             
        {/* Notifications - only when logged in */}
        {isLoggedIn && (
          <Link href="/notifications" onClick={() => setMobileOpen(false)}>
            <div className={`sidebar-link ${pathname==="/notifications"?"active":""}`}>
              <div className="relative">
                <MdNotifications size={19}/>
                {unreadNotifCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background:"var(--pk)" }}/>}
              </div>
              <span className="flex-1 text-sm">Notifications</span>
              {unreadNotifCount > 0 && (
                <span className="badge badge-pk" style={{ fontSize:"0.5rem", padding:"2px 6px" }}>{unreadNotifCount}</span>
              )}
            </div>
          </Link>
        )}
      </nav>
        
      {/* User / Auth footer */}
      <div className="p-3 border-t" style={{ borderColor:"var(--bdr)" }}>
        {isLoggedIn && user ? (
          <>
            <Link href="/profile" onClick={() => setMobileOpen(false)}>
              <div className={`sidebar-link ${pathname==="/profile"?"active":""}`}>
                {avatarUrl
                  ? <img src={avatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt=""/>
                  : <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{ background:"linear-gradient(135deg,var(--pk),var(--pu))", color:"#fff" }}>
                      {displayName[0]?.toUpperCase()}
                    </div>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color:"var(--tx)" }}>{displayName}</div>
                  <div className="text-xs truncate" style={{ color:"var(--tx3)" }}>@{user.username}</div>
                </div>
                {user.tier === "PREMIUM" && <RiVipCrownFill size={14} style={{ color:"var(--pk)", flexShrink:0 }}/>}
              </div>
            </Link>
            {user.tier !== "PREMIUM" && (
              <Link href="/premium" onClick={() => setMobileOpen(false)}>
                <div className="sidebar-link mt-0.5">
                  <MdWorkspacePremium size={19} style={{ color:"var(--ye)" }}/>
                  <span className="flex-1 text-sm">Go Premium</span>
                  <span className="badge badge-pk" style={{ fontSize:"0.48rem" }}>$4.99/mo</span>
                </div>
              </Link>
            )}
          </>
        ) : (
          <Link href="/auth" onClick={() => setMobileOpen(false)}>
            <button className="btn btn-pk btn-sm w-full">Sign In / Register</button>
          </Link>
        )}
      </div>
    </div>
  );
  return (
    <div className="flex min-h-screen w-full" style={{ background:"var(--bg)" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-40 flex-shrink-0"
        style={{ background:"var(--card)", borderRight:"1px solid var(--bdr)" }}>
        <NavContent/>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0" style={{ background:"rgba(0,0,0,0.75)" }} onClick={() => setMobileOpen(false)}/>
          <aside className="relative w-64 h-full z-10 flex flex-col" style={{ background:"var(--card)" }}>
            <NavContent/>
          </aside>
        </div>
      )}
      {/* Main */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen min-w-0">

        {/* Mobile Top Bar */}
        <header className="lg:hidden glass sticky top-0 z-30 flex items-center justify-between px-4 py-3">
          <button onClick={() => setMobileOpen(true)} className="btn btn-ghost btn-sm" style={{ padding:"8px" }}>
            <MdMenu size={22}/>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <VinylLogo/>
            <span className="font-bebas text-lg tracking-widest g1">VHQ</span>
          </Link>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <Link href="/notifications" className="relative">
                <MdNotifications size={22} style={{ color:"var(--tx2)" }}/>
                {unreadNotifCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background:"var(--pk)" }}/>}
              </Link>
            )}
            <Link href={isLoggedIn ? "/profile" : "/auth"}>
              {isLoggedIn && avatarUrl
                ? <img src={avatarUrl} className="w-8 h-8 rounded-full object-cover" alt=""/>
                : <MdPerson size={24} style={{ color:"var(--tx2)" }}/>}
            </Link>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 w-full px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold fade-up"
          style={{ background:toast.type==="error"?"rgba(255,0,110,0.15)":"rgba(74,222,128,0.15)", border:`1px solid ${toast.type==="error"?"rgba(255,0,110,0.4)":"rgba(74,222,128,0.4)"}`, color:toast.type==="error"?"var(--pk)":"#4ADE80", backdropFilter:"blur(12px)" }}>
          {toast.type === "error" ? "✕" : "✓"} {toast.message}
        </div>
      )}
    </div>
  );
}
