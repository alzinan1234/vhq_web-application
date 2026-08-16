"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { EmptyState } from "@/components/ui";
import { MdNotifications, MdPeople, MdMessage, MdFavorite, MdChatBubble, MdDelete, MdDoneAll } from "react-icons/md";

const TYPE_ICON: Record<string, React.ReactNode> = {
  NEW_FOLLOWER: <MdPeople size={16} style={{ color:"var(--cy)" }}/>,
  MESSAGE_RECEIVED: <MdMessage size={16} style={{ color:"var(--pk)" }}/>,
  POST_LIKE: <MdFavorite size={16} style={{ color:"#FF006E" }}/>,
  COMMENT_REPLY: <MdChatBubble size={16} style={{ color:"var(--ye)" }}/>,
  POST_COMMENT: <MdChatBubble size={16} style={{ color:"var(--pu)" }}/>,
};

export default function NotificationsPage() {
  const { isLoggedIn, notifications, notificationsLoading, unreadNotifCount,
    loadNotifications, markNotifRead, markAllNotifsRead, deleteNotif } = useStore();
  const router = useRouter();

  useEffect(() => { if (isLoggedIn) loadNotifications(); }, [isLoggedIn]);

  const handleClick = async (notif: (typeof notifications)[0]) => {
    await markNotifRead(notif.id);
    if (notif.type === "MESSAGE_RECEIVED" && notif.data?.conversationId) {
      router.push(`/messages?conv=${notif.data.conversationId}`);
    }
  };

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (!isLoggedIn) return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-20 text-center">
        <MdNotifications size={64} style={{ color:"var(--tx3)", margin:"0 auto 16px" }}/>
        <div className="font-bebas text-4xl text-white mb-4">Notifications</div>
        <a href="/auth"><button className="btn btn-pk btn-lg">Log In</button></a>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto w-full space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="lbl mb-1">Activity</div>
            <div className="font-bebas text-4xl text-white">Notifications</div>
            {unreadNotifCount > 0 && (
              <div className="text-sm mt-1" style={{ color:"var(--pk)" }}>{unreadNotifCount} unread</div>
            )}
          </div>
          {unreadNotifCount > 0 && (
            <button className="btn btn-ghost btn-sm flex items-center gap-1.5" onClick={markAllNotifsRead}>
              <MdDoneAll size={15}/> Mark all read
            </button>
          )}
        </div>

        {notificationsLoading && notifications.length === 0 ? (
          <div className="space-y-2">
            {[...Array(5)].map((_,i) => (
              <div key={i} className="card p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 rounded-full" style={{ background:"var(--surf)" }}/>
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded" style={{ background:"var(--surf)", width:"60%" }}/>
                  <div className="h-3 rounded" style={{ background:"var(--surf)", width:"35%" }}/>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState icon={<MdNotifications size={56}/>} title="No notifications yet" sub="When someone follows or messages you, it'll appear here."/>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => (
              <div key={notif.id}
                className="card p-4 flex items-start gap-3 cursor-pointer group transition-all"
                style={{ borderLeft: !notif.isRead ? "2px solid var(--pk)" : "2px solid transparent", background: !notif.isRead ? "rgba(255,0,110,0.04)" : undefined }}
                onClick={() => handleClick(notif)}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: notif.isRead ? "var(--surf)" : "rgba(255,0,110,0.1)" }}>
                  {TYPE_ICON[notif.type] || <MdNotifications size={16} style={{ color:"var(--tx3)" }}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white">{notif.title}</div>
                      {notif.body && <div className="text-xs mt-0.5" style={{ color:"var(--tx2)" }}>{notif.body}</div>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs" style={{ color:"var(--tx3)" }}>{formatTime(notif.createdAt)}</span>
                      <button onClick={e => { e.stopPropagation(); deleteNotif(notif.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost btn-sm" style={{ padding:"3px 5px" }}>
                        <MdDelete size={13} style={{ color:"var(--pk)" }}/>
                      </button>
                    </div>
                  </div>
                  {!notif.isRead && <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background:"var(--pk)" }}/>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
