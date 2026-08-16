"use client";
import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { Avatar, Modal, EmptyState } from "@/components/ui";
import { imgUrl, usersApi, type ApiPost, type ApiCollectionItem } from "@/lib/api";
import {
  MdEdit, MdPerson, MdLocationOn, MdAlbum, MdDynamicFeed,
  MdSettings, MdLogout, MdCamera, MdLock
} from "react-icons/md";
import { RiVipCrownFill } from "react-icons/ri";

export default function ProfilePage() {
  const { user, isLoggedIn, loadMe, updateProfile, logout, showToast } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [tab, setTab] = useState<"posts"|"collection">("posts");
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [collection, setCollection] = useState<ApiCollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ displayName:"", bio:"", location:"" });
  const [pw, setPw] = useState({ current:"", next:"", confirm:"" });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string|null>(null);
  const [avatarFile, setAvatarFile] = useState<File|null>(null);

  useEffect(() => { if (isLoggedIn) loadMe(); }, [isLoggedIn]);

  useEffect(() => {
    if (!user) return;
    setForm({ displayName: user.displayName || "", bio: user.bio || "", location: user.location || "" });
    loadUserContent();
  }, [user?.id]);

  const loadUserContent = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [postsRes, collRes] = await Promise.all([
        usersApi.getPosts(user.id),
        usersApi.getCollection(user.id),
      ]);
      if (postsRes?.data) setPosts(postsRes.data);
      if (collRes?.data) setCollection(collRes.data);
    } catch {}
    setLoading(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    const fd = new FormData();
    if (form.displayName) fd.append("displayName", form.displayName);
    if (form.bio) fd.append("bio", form.bio);
    if (form.location) fd.append("location", form.location);
    if (avatarFile) fd.append("avatar", avatarFile);
    await updateProfile(fd);
    setEditOpen(false); setPreview(null); setAvatarFile(null);
    setSaving(false);
  };

  const handlePwChange = async () => {
    if (!pw.current || !pw.next) return;
    if (pw.next !== pw.confirm) { showToast("Passwords don't match", "error"); return; }
    try {
      const { authApi } = await import("@/lib/api");
      await authApi.changePassword(pw.current, pw.next);
      showToast("Password changed!");
      setPwOpen(false); setPw({ current:"", next:"", confirm:"" });
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", "error"); }
  };

  if (!isLoggedIn) return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-20 text-center">
        <MdPerson size={64} style={{ color:"var(--tx3)", margin:"0 auto 16px" }}/>
        <div className="font-bebas text-4xl text-white mb-4">Profile</div>
        <a href="/auth"><button className="btn btn-pk btn-lg">Log In</button></a>
      </div>
    </AppLayout>
  );

  const avatarUrl = preview || imgUrl(user?.avatarUrl);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Profile Card */}
        <div className="card p-6">
          <div className="flex items-start gap-5">
            <div className="relative flex-shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} className="w-20 h-20 rounded-2xl object-cover" alt=""/>
                : <Avatar color="#FF006E" name={user?.username||"U"} size={80}/>}
              <button onClick={() => setEditOpen(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background:"var(--pk)", border:"2px solid var(--bg)" }}>
                <MdCamera size={13} style={{ color:"#fff" }}/>
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold text-xl text-white truncate">
                      {user?.displayName || user?.username}
                    </div>
                    {user?.tier === "PREMIUM" && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background:"rgba(255,0,110,0.15)", color:"var(--pk)", border:"1px solid rgba(255,0,110,0.3)" }}>
                        <RiVipCrownFill size={10}/> PRO
                      </span>
                    )}
                  </div>
                  <div className="text-sm" style={{ color:"var(--tx3)" }}>@{user?.username}</div>
                  {user?.bio && <div className="text-sm mt-2 leading-relaxed" style={{ color:"var(--tx2)" }}>{user.bio}</div>}
                  {user?.location && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color:"var(--tx3)" }}>
                      <MdLocationOn size={13}/> {user.location}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn btn-ghost btn-sm flex items-center gap-1.5" onClick={() => setEditOpen(true)}>
                    <MdEdit size={14}/> Edit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(true)}>
                    <MdSettings size={16}/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t" style={{ borderColor:"var(--bdr)" }}>
            {[
              { v:user?._count?.posts||0, l:"Posts" },
              { v:user?._count?.collection||0, l:"Records" },
              { v:user?._count?.followedBy||0, l:"Followers" },
              { v:user?._count?.following||0, l:"Following" },
            ].map(s => (
              <div key={s.l} className="text-center">
                <div className="font-bebas text-2xl text-white">{s.v}</div>
                <div className="text-xs" style={{ color:"var(--tx3)" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background:"var(--card)", border:"1px solid var(--bdr)" }}>
          {([["posts","Posts",<MdDynamicFeed size={15}/>],["collection","Collection",<MdAlbum size={15}/>]] as const).map(([t,l,icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-syne font-bold uppercase tracking-wider transition-all"
              style={{ background:tab===t?"var(--pk)":"transparent", color:tab===t?"#fff":"var(--tx3)" }}>
              {icon} {l}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_,i) => (
              <div key={i} className="card p-4 animate-pulse h-20" style={{ background:"var(--surf)" }}/>
            ))}
          </div>
        ) : tab === "posts" ? (
          posts.length === 0
            ? <EmptyState icon={<MdDynamicFeed size={48}/>} title="No posts yet" sub="Share your vinyl journey with the community" action={<a href="/feed"><button className="btn btn-pk btn-md">Post to Feed</button></a>}/>
            : <div className="space-y-3">
              {posts.map(p => (
                <div key={p.id} className="card p-4">
                  <div className="text-sm mb-2" style={{ color:"var(--tx2)" }}>{p.content}</div>
                  {p.images?.[0]?.url && <img src={imgUrl(p.images[0].url)!} className="w-full h-40 object-cover rounded-xl mb-2" alt=""/>}
                  <div className="flex gap-4 text-xs" style={{ color:"var(--tx3)" }}>
                    <span>❤ {p.likeCount}</span>
                    <span>💬 {p.commentCount}</span>
                    <span className="ml-auto">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
        ) : (
          collection.length === 0
            ? <EmptyState icon={<MdAlbum size={48}/>} title="Collection is empty" sub="Add records to your collection" action={<a href="/collection"><button className="btn btn-pk btn-md">Go to Collection</button></a>}/>
            : <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {collection.map(item => {
                const cover = imgUrl(item.album?.coverUrl);
                const artist = item.album?.albumArtists?.[0]?.artist?.name || "Unknown";
                return (
                  <div key={item.id} className="card p-3">
                    <div className="w-full h-24 rounded-xl mb-2 overflow-hidden flex items-center justify-center" style={{ background:"rgba(255,0,110,0.08)" }}>
                      {cover ? <img src={cover} className="w-full h-full object-cover" alt=""/> : <MdAlbum size={40} style={{ color:"var(--pk)" }}/>}
                    </div>
                    <div className="font-bold text-xs text-white truncate">{item.album?.title}</div>
                    <div className="text-xs truncate" style={{ color:"var(--tx3)" }}>{artist}</div>
                  </div>
                );
              })}
            </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal open={editOpen} onClose={() => { setEditOpen(false); setPreview(null); setAvatarFile(null); }} title="Edit Profile">
        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
              {preview || imgUrl(user?.avatarUrl)
                ? <img src={preview || imgUrl(user?.avatarUrl)!} className="w-20 h-20 rounded-2xl object-cover" alt=""/>
                : <Avatar color="#FF006E" name={user?.username||"U"} size={80}/>}
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background:"rgba(0,0,0,0.4)" }}>
                <MdCamera size={22} style={{ color:"#fff" }}/>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
            <span className="text-xs" style={{ color:"var(--tx3)" }}>Click to change photo (max 5MB)</span>
          </div>
          <div>
            <label className="lbl text-[10px] block mb-1.5">Display Name</label>
            <input className="inp text-sm" placeholder="Your name" value={form.displayName} onChange={e => setForm(f => ({...f,displayName:e.target.value}))}/>
          </div>
          <div>
            <label className="lbl text-[10px] block mb-1.5">Bio</label>
            <textarea className="inp text-sm" rows={3} style={{ resize:"none" }} placeholder="Tell the community about yourself…" value={form.bio} onChange={e => setForm(f => ({...f,bio:e.target.value}))}/>
          </div>
          <div>
            <label className="lbl text-[10px] block mb-1.5">Location</label>
            <input className="inp text-sm" placeholder="New York, US" value={form.location} onChange={e => setForm(f => ({...f,location:e.target.value}))}/>
          </div>
          <button className="btn btn-pk btn-md w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ background:"var(--surf)", border:"1px solid var(--bdr)" }}>
            <div className="text-xs mb-0.5" style={{ color:"var(--tx3)" }}>Email</div>
            <div className="text-sm text-white">{user?.email}</div>
          </div>
          <div className="p-3 rounded-xl flex items-center justify-between" style={{ background:"var(--surf)", border:"1px solid var(--bdr)" }}>
            <div>
              <div className="text-xs mb-0.5" style={{ color:"var(--tx3)" }}>Plan</div>
              <div className="text-sm text-white">{user?.tier === "PREMIUM" ? "Premium" : "Free"}</div>
            </div>
            {user?.tier !== "PREMIUM" && <a href="/premium"><button className="btn btn-pk btn-sm">Upgrade</button></a>}
          </div>
          <button className="btn btn-ghost btn-md w-full flex items-center justify-center gap-2" onClick={() => { setSettingsOpen(false); setPwOpen(true); }}>
            <MdLock size={16}/> Change Password
          </button>
          <div className="sep"/>
          <button className="btn btn-ghost btn-md w-full flex items-center justify-center gap-2" style={{ color:"var(--pk)" }}
            onClick={async () => { await logout(); window.location.href = "/"; }}>
            <MdLogout size={16}/> Log Out
          </button>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change Password">
        <div className="space-y-4">
          {[["current","Current Password"],["next","New Password"],["confirm","Confirm New Password"]].map(([k,l]) => (
            <div key={k}>
              <label className="lbl text-[10px] block mb-1.5">{l}</label>
              <input className="inp text-sm" type="password" placeholder="••••••••" value={pw[k as keyof typeof pw]} onChange={e => setPw(p => ({...p,[k]:e.target.value}))}/>
            </div>
          ))}
          <button className="btn btn-pk btn-md w-full" onClick={handlePwChange} disabled={!pw.current||!pw.next||!pw.confirm}>
            Change Password
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}
