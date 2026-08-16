"use client";
import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.thevinylheadquarters.com/v1";
const SOCKET_URL = API_BASE.replace(/^http/, "ws").replace(/\/v1\/?$/, "") + "/messaging";

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimer: NodeJS.Timeout | null = null;
const pendingJoins: string[] = [];

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket() {
  const token = getAccessToken();

  if (!token) {
    console.error("No access token, cannot connect socket");
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      path: "/socket.io",
      autoConnect: false,
      transports: ["websocket"],
      auth: { token },
      extraHeaders: { Authorization: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected successfully");
      reconnectAttempts = 0;

      // pending join গুলো flush করো
      while (pendingJoins.length > 0) {
        const convId = pendingJoins.shift();
        if (convId && socket?.connected) {
          socket.emit("join_conversation", { conversationId: convId });
          console.log("📢 Joined pending conversation:", convId);
        }
      }
    });






























































































































































































































































    
















































    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
      reconnectAttempts++;

      if (err.message.includes("401") || err.message.includes("unauthorized")) {
        console.log("Token expired, reconnecting...");
        socket?.disconnect();
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => connectSocket(), 2000);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => connectSocket(), 1000);
      }
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  pendingJoins.length = 0;
  if (socket?.connected) {
    socket.disconnect();
  }
  if (socket) {
    socket.removeAllListeners();
  }
  socket = null;
  reconnectAttempts = 0;
}

export function joinConversation(conversationId: string) {
  const s = connectSocket();
  if (!s) return;

  if (s.connected) {
    s.emit("join_conversation", { conversationId });
    console.log("📢 Joined conversation:", conversationId);
  } else {
    // socket connect না হলে queue করো
    if (!pendingJoins.includes(conversationId)) {
      pendingJoins.push(conversationId);
      console.log("⏳ Queued join for:", conversationId);
    }
  }
}

export function leaveConversation(conversationId: string) {
  const s = getSocket();
  if (s?.connected) {
    s.emit("leave_conversation", { conversationId });
  }
  // pending queue থেকেও সরাও
  const idx = pendingJoins.indexOf(conversationId);
  if (idx > -1) pendingJoins.splice(idx, 1);
}

export function sendSocketMessage(conversationId: string, content: string) {
  const s = connectSocket();
  if (s?.connected) {
    s.emit("send_message", { conversationId, content });
    console.log("📤 Emitted send_message:", { conversationId, content });
  }
}

export function emitTyping(conversationId: string, isTyping: boolean) {
  const s = getSocket();
  if (s?.connected) {
    s.emit("typing", { conversationId, isTyping });
  }
}

export function markSocketRead(conversationId: string) {
  const s = getSocket();
  if (s?.connected) {
    s.emit("mark_read", { conversationId });
  }
}

export type SocketNewMessage = {
  conversationId: string;
  message: {
    id: string;
    content: string;
    status: string;
    senderId: string;
    isDeleted: boolean;
    createdAt: string;
    sender: { id: string; username: string; avatarUrl: string | null };
  };
};

export type SocketTyping = {
  userId: string;
  conversationId: string;
  isTyping: boolean;
};

export type SocketMessagesRead = {
  conversationId: string;
  readBy: string;
  readAt: string;
};