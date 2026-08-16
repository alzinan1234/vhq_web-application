"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { Avatar } from "@/components/ui";
import { imgUrl, messagingApi, marketplaceApi } from "@/lib/api";
import {
  connectSocket, joinConversation, leaveConversation,
  emitTyping, markSocketRead, getSocket,
  type SocketNewMessage, type SocketTyping, type SocketMessagesRead
} from "@/lib/socket";
import { MdSend, MdArrowBack, MdCircle, MdChatBubble, MdCheck, MdDoneAll } from "react-icons/md";

const quickReplies = ["Is this still available?","Best price?","Free shipping?","Any trades?","I'll take it!"];

export default function MessagesClient() {
  const { user, isLoggedIn, conversations, conversationsLoading, messages, messagesLoading,
    loadConversations, loadMessages, sendMessage, addSocketMessage, setTyping, typingUsers,
    loadUnreadMessageCount, startConversation } = useStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeConv, setActiveConv] = useState<string|null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout>|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevConvRef = useRef<string|null>(null);
  const activeConvRef = useRef<string|null>(null);
  const isStartingConv = useRef<boolean>(false);
  const messageIdsRef = useRef<Set<string>>(new Set());

  // ── Start conversation with seller from marketplace listing ──────────────
  const startNewConversationWithSeller = useCallback(async (listingId: string) => {
    if (isStartingConv.current) {
      console.log("Already starting a conversation, skipping...");
      return;
    }

    isStartingConv.current = true;
    console.log("Starting conversation for listing:", listingId);

    try {
      const existingConv = conversations.find(c => c.listing?.id === listingId);
      if (existingConv) {
        console.log("Conversation already exists:", existingConv.id);
        setActiveConv(existingConv.id);
        router.replace(`/messages?conv=${existingConv.id}`);
        isStartingConv.current = false;
        return;
      }

      const listingRes = await marketplaceApi.getById(listingId);
      console.log("Full listing response:", listingRes);

      let sellerId = null;
      if (listingRes?.user?.id) {
        sellerId = listingRes.user.id;
      } else if (listingRes?.data?.user?.id) {
        sellerId = listingRes.data.user.id;
      }

      if (!sellerId) {
        console.error("Could not find seller ID");
        isStartingConv.current = false;
        return;
      }

      const convId = await startConversation(sellerId, "Hi, I'm interested in this item", listingId);

      if (convId) {
        await loadConversations();
        setActiveConv(convId);
        router.replace(`/messages?conv=${convId}`);
      }
    } catch (err) {
      console.error("Failed to start conversation:", err);
    } finally {
      setTimeout(() => { isStartingConv.current = false; }, 1000);
    }
  }, [startConversation, router, loadConversations, conversations]);

  // ── Load conversations on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    loadConversations();
  }, [isLoggedIn, loadConversations]);

  // ── Track activeConv in ref ──────────────────────────────────────────────
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // ── Handle URL params ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    const convParam = searchParams.get("conv");
    const listingParam = searchParams.get("listing");

    if (listingParam && !activeConvRef.current && !isStartingConv.current) {
      startNewConversationWithSeller(listingParam);
      return;
    }

    if (convParam && convParam !== activeConvRef.current) {
      setActiveConv(convParam);
      return;
    }

    if (!activeConvRef.current && conversations.length > 0) {
      setActiveConv(conversations[0].id);
    }
  }, [searchParams, conversations, isLoggedIn, startNewConversationWithSeller]);

  // ── Load messages when switching conversation ────────────────────────────
  useEffect(() => {
    if (!activeConv) return;
    if (!messages[activeConv]) loadMessages(activeConv);
    markSocketRead(activeConv);
    messagingApi.markAsRead(activeConv).catch(() => {});
    loadUnreadMessageCount();
  }, [activeConv, messages, loadMessages, loadUnreadMessageCount]);

  // ── Socket.IO setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    const socket = connectSocket();
    if (!socket) {
      console.error("Failed to connect socket");
      return;
    }

    const handleConnect = () => {
      console.log("✅ Socket connected successfully");
      // connect হলে current conversation এ join করো
      if (activeConvRef.current) {
        socket.emit("join_conversation", { conversationId: activeConvRef.current });
      }
    };

    const handleNewMessage = (data: SocketNewMessage) => {
      console.log("📩 New message received via socket:", data);
      if (!data || !data.conversationId || !data.message) return;

      // Duplicate check by ID
      if (messageIdsRef.current.has(data.message.id)) {
        console.log("Duplicate message ignored:", data.message.id);
        return;
      }
      messageIdsRef.current.add(data.message.id);

      // Old IDs cleanup (keep last 100)
      if (messageIdsRef.current.size > 100) {
        const toDelete = Array.from(messageIdsRef.current).slice(0, 50);
        toDelete.forEach(id => messageIdsRef.current.delete(id));
      }

      addSocketMessage(data.conversationId, data.message);

      if (data.conversationId === activeConvRef.current) {
        markSocketRead(data.conversationId);
        messagingApi.markAsRead(data.conversationId).catch(() => {});
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        loadUnreadMessageCount();
      }
    };

    const handleTyping = (data: SocketTyping) => {
      if (data && data.conversationId && data.userId) {
        setTyping(data.conversationId, data.userId, data.isTyping);
      }
    };

    const handleMessagesRead = () => {
      loadUnreadMessageCount();
    };

    const handleDisconnect = (reason: string) => {
      console.log("🔌 Socket disconnected:", reason);
    };

    const handleConnectError = (err: Error) => {
      console.error("❌ Socket connection error:", err.message);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("new_message", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("messages_read", handleMessagesRead);

    socket.onAny((event, ...args) => {
  console.log("🔥 SOCKET EVENT:", event, args);
});

    return () => {
      if (socket) {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("connect_error", handleConnectError);
        socket.off("new_message", handleNewMessage);
        socket.off("typing", handleTyping);
        socket.off("messages_read", handleMessagesRead);
      }
    };
  }, [isLoggedIn, addSocketMessage, loadUnreadMessageCount, setTyping]);

  // ── Join/leave socket rooms ───────────────────────────────────────────────
  useEffect(() => {
    if (!activeConv) return;

    // আগের conversation ছেড়ে দাও
    if (prevConvRef.current && prevConvRef.current !== activeConv) {
      leaveConversation(prevConvRef.current);
    }

    // নতুন conversation এ join করো (delay ছাড়াই)
    joinConversation(activeConv);
    prevConvRef.current = activeConv;
    console.log("📢 Switched to conversation room:", activeConv);

  }, [activeConv]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (prevConvRef.current) {
        leaveConversation(prevConvRef.current);
      }
    };
  }, []);

  // ── Auto-scroll to bottom ────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConv]);

  if (!isLoggedIn) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-20 text-center">
          <MdChatBubble size={64} style={{ color:"var(--tx3)", margin:"0 auto 16px" }}/>
          <div className="font-bebas text-4xl text-white mb-4">Messages</div>
          <p className="mb-6" style={{ color:"var(--tx2)" }}>Log in to access your messages.</p>
          <a href="/auth"><button className="btn btn-pk btn-lg">Log In</button></a>
        </div>
      </AppLayout>
    );
  }

  const conv = conversations.find(c => c.id === activeConv);
  const msgs = activeConv ? (messages[activeConv] || []) : [];
  const totalUnread = conversations.reduce((acc, c) => {
    if (!user?.id) return acc;
    const me = c.participants.find(p => p.userId === user.id);
    const lastRead = me?.lastReadAt ? new Date(me.lastReadAt) : null;
    const unread = c.messages.filter(m => m.senderId !== user.id && (!lastRead || new Date(m.createdAt) > lastRead)).length;
    return acc + unread;
  }, 0);

  const otherParticipant = conv?.participants.find(p => p.userId !== user?.id);
  const isTypingInConv = activeConv && typingUsers[activeConv]?.length > 0 &&
    typingUsers[activeConv].some(uid => uid !== user?.id);

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    try {
      // শুধু REST call করো — socket emit করো না
      // socket থেকে other user এর message real-time আসবে
      // নিজের message REST response এ আসবে, duplicate এড়াতে socket emit বন্ধ
      await sendMessage(activeConv, content);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Send error:", err);
      setInput(content); // error হলে input ফিরিয়ে দাও
    } finally {
      setSending(false);
      emitTyping(activeConv, false);
    }
  };

  const handleTyping = (val: string) => {
    setInput(val);
    if (!activeConv) return;
    emitTyping(activeConv, true);
    if (typingTimeout) clearTimeout(typingTimeout);
    const t = setTimeout(() => emitTyping(activeConv, false), 2000);
    setTypingTimeout(t);
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getConvName = (c: typeof conv) => {
    if (!c) return "Unknown";
    const other = c.participants.find(p => p.userId !== user?.id);
    return other?.user.username || "Unknown";
  };

  const getConvAvatar = (c: typeof conv) => {
    const other = c?.participants.find(p => p.userId !== user?.id);
    return imgUrl(other?.user.avatarUrl || null);
  };

  const getLastMsg = (c: (typeof conversations)[0]) => {
    const last = c.messages[0];
    if (!last) return "Start the conversation";
    return last.content.length > 40 ? last.content.slice(0, 40) + "…" : last.content;
  };

  const hasUnread = (c: (typeof conversations)[0]) => {
    if (!user?.id) return false;
    const me = c.participants.find(p => p.userId === user.id);
    const lastRead = me?.lastReadAt ? new Date(me.lastReadAt) : null;
    return c.messages.some(m => m.senderId !== user.id && (!lastRead || new Date(m.createdAt) > lastRead));
  };

  return (
    <AppLayout>
      <div className="flex -mx-4 -my-6 lg:-mx-8 lg:-my-8" style={{ height:"calc(100vh - 56px)" }}>

        {/* Sidebar */}
        <div className={`flex-shrink-0 border-r flex flex-col ${activeConv ? "hidden md:flex w-72" : "flex w-full md:w-72"}`}
          style={{ borderColor:"var(--bdr)", background:"var(--card)" }}>
          <div className="p-4 border-b" style={{ borderColor:"var(--bdr)" }}>
            <div className="font-bebas text-2xl text-white tracking-wide">Messages</div>
            {totalUnread > 0 && <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color:"var(--pk)" }}><MdCircle size={8}/>{totalUnread} unread</div>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading && conversations.length === 0 ? (
              <div className="space-y-2 p-3">
                {[...Array(4)].map((_,i) => (
                  <div key={i} className="flex gap-3 p-2 animate-pulse">
                    <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background:"var(--surf)" }}/>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded" style={{ background:"var(--surf)", width:"60%" }}/>
                      <div className="h-3 rounded" style={{ background:"var(--surf)", width:"80%" }}/>
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center flex flex-col items-center gap-3">
                <MdChatBubble size={36} style={{ color:"var(--tx3)", opacity:0.4 }}/>
                <div className="text-sm" style={{ color:"var(--tx3)" }}>No conversations yet</div>
                <div className="text-xs" style={{ color:"var(--tx3)" }}>Message a seller from the Marketplace</div>
              </div>
            ) : conversations.map(c => {
              const name = getConvName(c);
              const av = getConvAvatar(c);
              const unread = hasUnread(c);
              return (
                <div key={c.id} onClick={() => { setActiveConv(c.id); router.push(`/messages?conv=${c.id}`, { scroll:false }); }}
                  className="flex items-start gap-3 p-4 cursor-pointer transition-all border-b"
                  style={{ borderColor:"var(--bdr)", background:activeConv===c.id?"rgba(0,245,255,0.06)":"transparent", borderLeft:activeConv===c.id?"2px solid var(--cy)":"2px solid transparent" }}>
                  <div className="relative flex-shrink-0">
                    {av ? <Image src={av} width={40} height={40} className="rounded-full w-10 h-10 object-cover" alt={name}/> : <Avatar color="#7B2FFF" name={name} size={40}/>}
                    {unread && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background:"var(--pk)" }}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-sm text-white truncate">@{name}</span>
                      <span className="text-[10px] flex-shrink-0 ml-2" style={{ color:"var(--tx3)" }}>
                        {c.messages[0] ? formatDate(c.messages[0].createdAt) : ""}
                      </span>
                    </div>
                    {c.listing && <div className="text-[10px] mb-0.5 truncate" style={{ color:"var(--cy)" }}>re: {c.listing.title}</div>}
                    <div className="text-xs truncate" style={{ color:unread?"var(--tx2)":"var(--tx3)", fontWeight:unread?600:400 }}>
                      {getLastMsg(c)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col min-w-0 ${!activeConv ? "hidden md:flex" : "flex"}`}>
          {!conv ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-4" style={{ color:"var(--tx3)" }}>
              <MdChatBubble size={52} style={{ opacity:0.3 }}/>
              <div className="font-bebas text-2xl">Select a conversation</div>
              <div className="text-sm">Or message a seller from the Marketplace</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor:"var(--bdr)", background:"var(--card)" }}>
                <button className="md:hidden btn btn-ghost btn-sm" style={{ padding:"6px 10px" }} onClick={() => setActiveConv(null)}>
                  <MdArrowBack size={20}/>
                </button>
                {getConvAvatar(conv) ? (
                  <Image src={getConvAvatar(conv)!} width={36} height={36} className="rounded-full w-10 h-10 object-cover " alt={getConvName(conv)}/>
                ) : (
                  <Avatar color="#7B2FFF" name={getConvName(conv)} size={38}/>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white">@{getConvName(conv)}</div>
                  {conv.listing && <div className="text-xs truncate" style={{ color:"var(--cy)" }}>re: {conv.listing.title} · ${conv.listing.price}</div>}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background:"var(--bg)" }}>
                {messagesLoading && msgs.length === 0 ? (
                  <div className="text-center py-12" style={{ color:"var(--tx3)" }}>Loading…</div>
                ) : msgs.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-3">
                    <MdChatBubble size={36} style={{ color:"var(--tx3)", opacity:0.3 }}/>
                    <div className="text-sm" style={{ color:"var(--tx3)" }}>Start the conversation{conv.listing ? ` about ${conv.listing.title}` : ""}</div>
                  </div>
                ) : msgs.map(msg => {
                  const isMe = msg.senderId === user?.id;
                  const senderAv = imgUrl(msg.sender?.avatarUrl || null);
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (
                        senderAv ? <Image src={senderAv} width={29} height={28} className=" rounded-full object-cover w-7 h-7 flex-shrink-0" alt={msg.sender?.username || "?"}/> : <Avatar color="#7B2FFF" name={msg.sender?.username || "?"} size={28}/>
                      )}
                      <div className="max-w-xs md:max-w-sm">
                        <div className="px-3 py-2 text-sm leading-relaxed"
                          style={{ background:isMe?"linear-gradient(135deg,var(--pk),var(--pu))":"var(--card)", color:isMe?"#fff":"var(--tx)", border:isMe?"none":"1px solid var(--bdr)", borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px" }}>
                          {msg.isDeleted ? <em style={{ opacity:0.5 }}>Message deleted</em> : msg.content}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] ${isMe?"justify-end":""}`} style={{ color:"var(--tx3)" }}>
                          {formatTime(msg.createdAt)}
                          {isMe && (msg.status === "READ" ? <MdDoneAll size={12} style={{ color:"var(--cy)" }}/> : <MdCheck size={12}/>)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Typing indicator */}
                {isTypingInConv && (
                  <div className="flex gap-2 items-center">
                    <Avatar color="#7B2FFF" name={otherParticipant?.user.username || "?"} size={28}/>
                    <div className="px-3 py-2 rounded-2xl flex gap-1" style={{ background:"var(--card)", border:"1px solid var(--bdr)" }}>
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:"var(--tx3)", animation:`bounce 1s infinite ${i*0.2}s` }}/>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Quick replies */}
              <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto" style={{ borderColor:"var(--bdr)", background:"var(--card)" }}>
                {quickReplies.map(q => (
                  <button key={q} onClick={() => setInput(q)} className="btn btn-ghost btn-sm flex-shrink-0" style={{ fontSize:"0.66rem", padding:"5px 10px" }}>{q}</button>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t flex gap-3" style={{ borderColor:"var(--bdr)", background:"var(--card)" }}>
                <input className="inp flex-1" placeholder="Type a message…" value={input}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}/>
                <button className="btn btn-pk btn-md flex items-center gap-2 flex-shrink-0" onClick={handleSend} disabled={!input.trim() || sending}>
                  <MdSend size={16}/> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}