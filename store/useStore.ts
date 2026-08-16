"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  authApi, usersApi, feedApi, collectionApi, wishlistApi,
  marketplaceApi, messagingApi, notificationsApi, storesApi,
  blogApi, merchApi, homeApi, webSubscriptionApi,
  clearTokens, getRawAccessToken, getRefreshToken, onUnauthorized,
  type ApiUser, type ApiPost, type ApiCollectionItem, type ApiWishlistItem,
  type ApiConversation, type ApiMessage, type ApiNotification,
  type ApiListing, type ApiStore, type ApiBlogPost, type ApiMerchProduct,
  type ApiAlbumPreview, type ApiMeta, type ApiCollectionStats,
  type ApiMarketplaceParams, type ApiCreateListing,
  type ApiSubscriptionStatus,
} from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";

type AppStore = {
  user: ApiUser | null;
  isLoggedIn: boolean;
  authLoading: boolean;
  authError: string | null;
  pendingVerifyEmail: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  verifyEmail: (email: string, otp: string) => Promise<boolean>;
  resendOtp: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
  updateProfile: (formData: FormData) => Promise<void>;
  clearAuthError: () => void;

  posts: ApiPost[];
  feedMeta: ApiMeta | null;
  feedLoading: boolean;
  likedPostIds: string[];

  loadFeed: (cursor?: string) => Promise<void>;
  createPost: (content: string) => Promise<ApiPost | null>;
  deletePost: (postId: string) => Promise<boolean>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  isPostLiked: (postId: string) => boolean;

  collection: ApiCollectionItem[];
  collectionMeta: ApiMeta | null;
  collectionStats: ApiCollectionStats | null;
  collectionLoading: boolean;

  loadCollection: () => Promise<void>;
  removeFromCollection: (id: string) => Promise<void>;

  wishlist: ApiWishlistItem[];
  wishlistLoading: boolean;

  loadWishlist: () => Promise<void>;
  addToWishlist: (albumId: string, notes?: string) => Promise<void>;
  removeFromWishlist: (id: string) => Promise<void>;

  listings: ApiListing[];
  listingsMeta: ApiMeta | null;
  listingsLoading: boolean;
  savedListings: ApiListing[];

  loadListings: (params?: ApiMarketplaceParams) => Promise<void>;
  loadSavedListings: () => Promise<void>;
  createListing: (data: ApiCreateListing) => Promise<ApiListing | null>;
  saveListing: (listingId: string) => Promise<void>;
  unsaveListing: (listingId: string) => Promise<void>;

  conversations: ApiConversation[];
  conversationsLoading: boolean;
  messages: Record<string, ApiMessage[]>;
  messagesLoading: boolean;
  unreadMessageCount: number;
  typingUsers: Record<string, string[]>;

  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  startConversation: (recipientId: string, initialMessage: string, listingId?: string) => Promise<string | null>;
  addSocketMessage: (conversationId: string, message: ApiMessage) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  loadUnreadMessageCount: () => Promise<void>;

  notifications: ApiNotification[];
  notificationsLoading: boolean;
  unreadNotifCount: number;

  loadNotifications: () => Promise<void>;
  loadUnreadNotifCount: () => Promise<void>;
  markNotifRead: (id: string) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  deleteNotif: (id: string) => Promise<void>;

  stores: ApiStore[];
  storesLoading: boolean;
  loadStores: (search?: string) => Promise<void>;

  blogs: ApiBlogPost[];
  blogsLoading: boolean;
  loadBlogs: () => Promise<void>;

  merchProducts: ApiMerchProduct[];
  merchLoading: boolean;
  cart: { productId: string; name: string; price: number; qty: number; size?: string; coverUrl?: string | null }[];
  checkoutLoading: boolean;

  loadMerchProducts: () => Promise<void>;
  addToCart: (item: { productId: string; name: string; price: number; size?: string; coverUrl?: string | null }) => void;
  removeFromCart: (productId: string, size?: string) => void;
  clearCart: () => void;
  // Syncs local cart -> server cart, then creates a Stripe Checkout Session
  // and redirects the browser to it. Returns false if it couldn't start checkout.
  checkoutCart: () => Promise<boolean>;

  // ── Premium subscription (Stripe) ──────────────────────────────────────────
  subscription: ApiSubscriptionStatus | null;
  subscriptionLoading: boolean;
  loadSubscriptionStatus: () => Promise<void>;
  // Creates a Stripe Checkout Session for Premium and redirects to it.
  startPremiumCheckout: () => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;

  trendingAlbums: ApiAlbumPreview[];
  homeLoading: boolean;
  loadHome: () => Promise<void>;

  toast: { show: boolean; message: string; type: "success" | "error" };
  showToast: (message: string, type?: "success" | "error") => void;
};

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({

      // ── Auth ────────────────────────────────────────────────────────────────
      user: null,
      isLoggedIn: false,
      authLoading: false,
      authError: null,
      pendingVerifyEmail: null,

      clearAuthError: () => set({ authError: null }),

      login: async (email, password) => {
        set({ authLoading: true, authError: null });
        try {
          const res = await authApi.login(email, password);
          if (res?.data?.accessToken) {
            set({ isLoggedIn: true, authLoading: false });
            get().loadMe();
            get().loadUnreadNotifCount();
            get().loadUnreadMessageCount();
            return true;
          }
          set({ authError: "Login failed", authLoading: false });
          return false;
        } catch (e: unknown) {
          set({ authError: e instanceof Error ? e.message : "Login failed", authLoading: false });
          return false;
        }
      },

      register: async (email, username, password) => {
        set({ authLoading: true, authError: null });
        try {
          await authApi.register(email, username, password);
          set({ authLoading: false, pendingVerifyEmail: email });
          return true;
        } catch (e: unknown) {
          set({ authError: e instanceof Error ? e.message : "Registration failed", authLoading: false });
          return false;
        }
      },

      verifyEmail: async (email, otp) => {
        set({ authLoading: true, authError: null });
        try {
          await authApi.verifyEmail(email, otp);
          set({ authLoading: false, pendingVerifyEmail: null });
          return true;
        } catch (e: unknown) {
          set({ authError: e instanceof Error ? e.message : "Verification failed", authLoading: false });
          return false;
        }
      },

      resendOtp: async (email) => {
        try { await authApi.resendOtp(email, "EMAIL_VERIFICATION"); } catch {}
      },

      forgotPassword: async (email) => {
        set({ authLoading: true, authError: null });
        try { await authApi.forgotPassword(email); set({ authLoading: false }); return true; }
        catch { set({ authLoading: false }); return false; }
      },

      resetPassword: async (email, otp, newPassword) => {
        set({ authLoading: true, authError: null });
        try {
          await authApi.resetPassword(email, otp, newPassword);
          set({ authLoading: false }); return true;
        } catch (e: unknown) {
          set({ authError: e instanceof Error ? e.message : "Reset failed", authLoading: false });
          return false;
        }
      },

      logout: async () => {
        try { await authApi.logout(); } catch {}
        clearTokens();
        disconnectSocket();
        set({
          user: null, isLoggedIn: false,
          posts: [], feedMeta: null, likedPostIds: [],
          collection: [], collectionMeta: null, collectionStats: null,
          wishlist: [], conversations: [], messages: {},
          notifications: [], listings: [], savedListings: [], stores: [],
          blogs: [], trendingAlbums: [], unreadMessageCount: 0,
          unreadNotifCount: 0,
        });
      },

      loadMe: async () => {
        if (!getRawAccessToken() && !getRefreshToken()) return;
        try {
          const res = await usersApi.getMe();
          // getMe() returns the full ApiUser including `tier`, so calling this
          // after a Stripe checkout / cancel is enough to pick up FREE <-> PREMIUM changes.
          if (res?.data) set({ user: res.data, isLoggedIn: true });
        } catch {}
      },

      updateProfile: async (formData) => {
        try {
          const res = await usersApi.updateMe(formData);
          if (res?.data) { set({ user: res.data }); get().showToast("Profile updated!"); }
        } catch (e: unknown) {
          get().showToast(e instanceof Error ? e.message : "Update failed", "error");
        }
      },

      // ── Feed ────────────────────────────────────────────────────────────────
      posts: [],
      feedMeta: null,
      feedLoading: false,
      likedPostIds: [],

      isPostLiked: (postId) => get().likedPostIds.includes(postId),

      loadFeed: async (cursor) => {
        set({ feedLoading: true });
        try {
          const res = await feedApi.getFeed(20, cursor);
          if (res?.data) {
            const localLiked = get().likedPostIds;

            // BUG #1 FIX: separate server-confirmed liked vs unliked so we can
            // remove stale local IDs that the server now says are not liked.
            const serverTrueIds  = res.data.filter(p => p.isLiked === true).map(p => p.id);
            const serverFalseIds = res.data.filter(p => p.isLiked === false).map(p => p.id);

            const combined = Array.from(new Set([
              // Keep local likes that the server has NOT explicitly returned as false
              ...localLiked.filter(id => !serverFalseIds.includes(id)),
              // Add any server-confirmed likes
              ...serverTrueIds,
            ]));

            const merged = res.data.map(p => ({
              ...p,
              isLiked: combined.includes(p.id),
            }));

            set(s => ({
              // BUG #4 FIX: deduplicate when appending cursor pages
              posts: cursor
                ? [
                    ...s.posts,
                    ...merged.filter(p => !s.posts.some(e => e.id === p.id)),
                  ]
                : merged,
              feedMeta: res.meta,
              feedLoading: false,
              likedPostIds: combined,
            }));
          } else {
            set({ feedLoading: false });
          }
        } catch {
          set({ feedLoading: false });
        }
      },

      createPost: async (content) => {
        try {
          const res = await feedApi.createPost(content);
          if (res?.data) {
            set(s => ({ posts: [res.data, ...s.posts] }));
            get().showToast("Post shared!");
            return res.data;
          }
          return null;
        } catch (e: unknown) {
          get().showToast(e instanceof Error ? e.message : "Failed", "error");
          return null;
        }
      },

      deletePost: async (postId) => {
        const prev = get().posts;
        set(s => ({ posts: s.posts.filter(p => p.id !== postId) }));
        try {
          await feedApi.deletePost(postId);
          get().showToast("Post deleted");
          return true;
        } catch (e: unknown) {
          set({ posts: prev });
          get().showToast(e instanceof Error ? e.message : "Delete failed", "error");
          return false;
        }
      },

      likePost: async (postId) => {
        // Guard: don't double-like
        if (get().likedPostIds.includes(postId)) return;
        set(s => ({
          likedPostIds: [...s.likedPostIds, postId],
          posts: s.posts.map(p => p.id === postId ? { ...p, likeCount: p.likeCount + 1, isLiked: true } : p),
        }));
        try {
          await feedApi.likePost(postId);
        } catch {
          // Rollback on API failure
          set(s => ({
            likedPostIds: s.likedPostIds.filter(id => id !== postId),
            posts: s.posts.map(p => p.id === postId ? { ...p, likeCount: Math.max(0, p.likeCount - 1), isLiked: false } : p),
          }));
        }
      },

      unlikePost: async (postId) => {
        // Guard: can't unlike something not liked
        if (!get().likedPostIds.includes(postId)) return;
        set(s => ({
          likedPostIds: s.likedPostIds.filter(id => id !== postId),
          posts: s.posts.map(p => p.id === postId ? { ...p, likeCount: Math.max(0, p.likeCount - 1), isLiked: false } : p),
        }));
        try {
          await feedApi.unlikePost(postId);
        } catch {
          // Rollback on API failure
          set(s => ({
            likedPostIds: [...s.likedPostIds, postId],
            posts: s.posts.map(p => p.id === postId ? { ...p, likeCount: p.likeCount + 1, isLiked: true } : p),
          }));
        }
      },

      // ── Collection ──────────────────────────────────────────────────────────
      collection: [],
      collectionMeta: null,
      collectionStats: null,
      collectionLoading: false,

      loadCollection: async () => {
        set({ collectionLoading: true });
        try {
          const res = await collectionApi.get();
          if (res?.data) set({
            collection: res.data, collectionMeta: res.meta,
            collectionStats: res.stats, collectionLoading: false,
          });
        } catch { set({ collectionLoading: false }); }
      },

      removeFromCollection: async (id) => {
        const prev = get().collection;
        set(s => ({ collection: s.collection.filter(c => c.id !== id) }));
        try {
          await collectionApi.remove(id);
          get().showToast("Removed from collection");
        } catch {
          set({ collection: prev });
          get().showToast("Remove failed", "error");
        }
      },

      // ── Wishlist ────────────────────────────────────────────────────────────
      wishlist: [],
      wishlistLoading: false,

      loadWishlist: async () => {
        set({ wishlistLoading: true });
        try {
          const res = await wishlistApi.get();
          if (res?.data) set({ wishlist: res.data, wishlistLoading: false });
        } catch { set({ wishlistLoading: false }); }
      },

      addToWishlist: async (albumId, notes) => {
        try {
          const res = await wishlistApi.add(albumId, notes);
          if (res?.data) {
            set(s => ({ wishlist: [res.data, ...s.wishlist] }));
            get().showToast("Added to wishlist!");
          }
        } catch (e: unknown) {
          get().showToast(e instanceof Error ? e.message : "Failed", "error");
        }
      },

      removeFromWishlist: async (id) => {
        const prev = get().wishlist;
        set(s => ({ wishlist: s.wishlist.filter(w => w.id !== id) }));
        try {
          await wishlistApi.remove(id);
          get().showToast("Removed from wishlist");
        } catch {
          set({ wishlist: prev });
          get().showToast("Remove failed", "error");
        }
      },

      // ── Marketplace ─────────────────────────────────────────────────────────
      listings: [],
      listingsMeta: null,
      listingsLoading: false,
      savedListings: [],

      loadListings: async (params) => {
        set({ listingsLoading: true });
        try {
          const res = await marketplaceApi.list(params);
          if (res?.data) set({ listings: res.data, listingsMeta: res.meta, listingsLoading: false });
        } catch { set({ listingsLoading: false }); }
      },

      loadSavedListings: async () => {
        try {
          const res = await marketplaceApi.getSaved();
          if (res?.data) set({ savedListings: res.data });
        } catch {}
      },

      createListing: async (data: ApiCreateListing) => {
        try {
          const res = await marketplaceApi.create(data);
          let listing = null;
          if (res && typeof res === "object") {
            if ("data" in res && (res as any).data) listing = (res as any).data;
            else if ("id" in res) listing = res;
          }
          if (listing && (listing as any).id) {
            get().showToast("Listing created successfully!");
            get().loadListings();
            return listing as ApiListing;
          }
          get().showToast("Failed to create listing", "error");
          return null;
        } catch (e: unknown) {
          get().showToast(e instanceof Error ? e.message : "Failed to create listing", "error");
          return null;
        }
      },

      saveListing: async (listingId) => {
        try { await marketplaceApi.save(listingId); get().showToast("Saved!"); } catch {}
      },

      unsaveListing: async (listingId) => {
        try {
          await marketplaceApi.unsave(listingId);
          set(s => ({ savedListings: s.savedListings.filter(l => l.id !== listingId) }));
        } catch {}
      },

      // ── Messaging ───────────────────────────────────────────────────────────
      conversations: [],
      conversationsLoading: false,
      messages: {},
      messagesLoading: false,
      unreadMessageCount: 0,
      typingUsers: {},

      loadConversations: async () => {
        set({ conversationsLoading: true });
        try {
          const res = await messagingApi.listConversations();
          if (res?.data) set({ conversations: res.data, conversationsLoading: false });
        } catch { set({ conversationsLoading: false }); }
      },

      loadMessages: async (conversationId) => {
        set({ messagesLoading: true });
        try {
          const res = await messagingApi.getMessages(conversationId);
          if (res?.data) {
            const sorted = [...res.data].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            set(s => ({ messages: { ...s.messages, [conversationId]: sorted }, messagesLoading: false }));
          } else {
            set({ messagesLoading: false });
          }
        } catch { set({ messagesLoading: false }); }
      },

      sendMessage: async (conversationId, content) => {
        try {
          const res = await messagingApi.sendMessage(conversationId, content);
          if (res?.data) {
            const newMessage = res.data;
            set(s => {
              const current = s.messages[conversationId] || [];
              if (current.some(m => m.id === newMessage.id)) return s;
              return {
                messages: { ...s.messages, [conversationId]: [...current, newMessage] },
                conversations: s.conversations.map(c =>
                  c.id === conversationId
                    ? {
                        ...c,
                        messages: [newMessage],
                        updatedAt: newMessage.createdAt,
                        participants: c.participants.map(p =>
                          p.userId === get().user?.id
                            ? { ...p, lastReadAt: new Date().toISOString() }
                            : p
                        ),
                      }
                    : c
                ),
              };
            });
          }
        } catch (e: unknown) {
          get().showToast(e instanceof Error ? e.message : "Send failed", "error");
          throw e;
        }
      },

      startConversation: async (recipientId, initialMessage, listingId) => {
        try {
          const res = await messagingApi.startConversation(recipientId, initialMessage, listingId);
          if (res?.data?.conversation) {
            const conv = res.data.conversation;
            set(s => ({
              conversations: s.conversations.some(c => c.id === conv.id)
                ? s.conversations.map(c => (c.id === conv.id ? conv : c))
                : [conv, ...s.conversations],
              messages: { ...s.messages, [conv.id]: res.data.message ? [res.data.message] : [] },
            }));
            return conv.id;
          }
          return null;
        } catch (err) {
          console.error("Failed to start conversation:", err);
          return null;
        }
      },

      addSocketMessage: (conversationId, message) => {
        set(s => {
          const existing = s.messages[conversationId] || [];
          if (existing.some(m => m.id === message.id)) return s;
          const currentUser = get().user;
          if (message.senderId === currentUser?.id) {
            const alreadyAdded = existing.some(
              m => m.senderId === message.senderId && m.content === message.content
            );
            if (alreadyAdded) return s;
          }
          return {
            messages: { ...s.messages, [conversationId]: [...existing, message] },
            conversations: s.conversations.map(c =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: [{
                      id: message.id, content: message.content,
                      createdAt: message.createdAt, senderId: message.senderId,
                      status: message.status || "SENT",
                    }],
                    updatedAt: message.createdAt,
                  }
                : c
            ),
          };
        });
        if (message.senderId !== get().user?.id) {
          get().loadUnreadMessageCount();
        }
      },

      setTyping: (conversationId, userId, isTyping) => {
        set(s => {
          const cur = s.typingUsers[conversationId] || [];
          return {
            typingUsers: {
              ...s.typingUsers,
              [conversationId]: isTyping
                ? Array.from(new Set([...cur, userId]))
                : cur.filter(u => u !== userId),
            },
          };
        });
      },

      loadUnreadMessageCount: async () => {
        try {
          const res = await messagingApi.getUnreadCount();
          if (res?.data) set({ unreadMessageCount: res.data.count });
        } catch {}
      },

      // ── Notifications ───────────────────────────────────────────────────────
      notifications: [],
      notificationsLoading: false,
      unreadNotifCount: 0,

      loadNotifications: async () => {
        set({ notificationsLoading: true });
        try {
          const res = await notificationsApi.get();
          if (res?.data) set({ notifications: res.data, notificationsLoading: false });
        } catch { set({ notificationsLoading: false }); }
      },

      loadUnreadNotifCount: async () => {
        try {
          const res = await notificationsApi.getUnreadCount();
          if (res?.data) set({ unreadNotifCount: res.data.count });
        } catch {}
      },

      markNotifRead: async (id) => {
        set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n) }));
        try { await notificationsApi.markOneRead(id); } catch {}
      },

      markAllNotifsRead: async () => {
        set(s => ({
          notifications: s.notifications.map(n => ({ ...n, isRead: true })),
          unreadNotifCount: 0,
        }));
        try { await notificationsApi.markAllRead(); } catch {}
      },

      deleteNotif: async (id) => {
        set(s => ({ notifications: s.notifications.filter(n => n.id !== id) }));
        try { await notificationsApi.delete(id); } catch {}
      },

      // ── Stores ──────────────────────────────────────────────────────────────
      stores: [],
      storesLoading: false,

      loadStores: async (search) => {
        set({ storesLoading: true });
        try {
          const res = await storesApi.list(50, undefined, undefined, search);
          if (res?.data) set({ stores: res.data, storesLoading: false });
        } catch { set({ storesLoading: false }); }
      },

      // ── Blog ────────────────────────────────────────────────────────────────
      blogs: [],
      blogsLoading: false,

      loadBlogs: async () => {
        set({ blogsLoading: true });
        try {
          const res = await blogApi.list();
          if (res?.data) set({ blogs: res.data, blogsLoading: false });
        } catch { set({ blogsLoading: false }); }
      },

      // ── Merch ───────────────────────────────────────────────────────────────
      merchProducts: [],
      merchLoading: false,
      cart: [],

      loadMerchProducts: async () => {
        set({ merchLoading: true });
        try {
          const res = await merchApi.listProducts();
          if (res?.data) set({ merchProducts: res.data, merchLoading: false });
        } catch { set({ merchLoading: false }); }
      },

      addToCart: (item) => set(s => {
        const exists = s.cart.find(c => c.productId === item.productId && c.size === item.size);
        if (exists) return {
          cart: s.cart.map(c =>
            c.productId === item.productId && c.size === item.size ? { ...c, qty: c.qty + 1 } : c
          ),
        };
        return { cart: [...s.cart, { ...item, qty: 1 }] };
      }),

      removeFromCart: (productId, size) => set(s => ({
        cart: s.cart.filter(c => !(c.productId === productId && c.size === size)),
      })),

      clearCart: () => set({ cart: [] }),

      checkoutLoading: false,
      checkoutCart: async () => {
        const s = get();
        if (s.cart.length === 0) { s.showToast("Your cart is empty", "error"); return false; }
        if (!s.isLoggedIn) { s.showToast("Please log in to checkout", "error"); return false; }

        set({ checkoutLoading: true });
        try {
          // 1. Sync every local cart line to the server-side cart
          //    (the backend checkout endpoint charges whatever is in THIS cart).
          for (const item of s.cart) {
            await merchApi.addCartItem(item.productId, item.qty);
          }

          // 2. Create the Stripe Checkout Session for the synced cart.
          const res = await merchApi.checkout();
          const url = res?.data?.url;
          if (!url) throw new Error("No checkout URL returned");

          // 3. Redirect the full page to Stripe's hosted checkout.
          if (typeof window !== "undefined") window.location.href = url;
          return true;
        } catch (e: unknown) {
          get().showToast(e instanceof Error ? e.message : "Checkout failed", "error");
          set({ checkoutLoading: false });
          return false;
        }
      },

      // ── Premium subscription (Stripe) ──────────────────────────────────────────
      subscription: null,
      subscriptionLoading: false,
      loadSubscriptionStatus: async () => {
        if (!get().isLoggedIn) return;
        set({ subscriptionLoading: true });
        try {
          const res = await webSubscriptionApi.status();
          if (res?.data) set({ subscription: res.data, subscriptionLoading: false });
          else set({ subscriptionLoading: false });
        } catch { set({ subscriptionLoading: false }); }
      },
      startPremiumCheckout: async () => {
        if (!get().isLoggedIn) { get().showToast("Please log in first", "error"); return false; }
        set({ checkoutLoading: true });
        try {
          const res = await webSubscriptionApi.checkout();
          const url = res?.data?.url;
          if (!url) throw new Error("No checkout URL returned");
          if (typeof window !== "undefined") window.location.href = url;
          return true;
        } catch (e: unknown) {
          get().showToast(e instanceof Error ? e.message : "Could not start checkout", "error");
          set({ checkoutLoading: false });
          return false;
        }
      },
      cancelSubscription: async () => {
        try {
          await webSubscriptionApi.cancel();
          // Access stays active until expiresAt — refresh status to reflect
          // cancelAtPeriodEnd:true rather than assuming an immediate downgrade.
          await get().loadSubscriptionStatus();
          get().showToast("Subscription will end at your current billing period.");
          return true;
        } catch (e: unknown) {
          get().showToast(e instanceof Error ? e.message : "Could not cancel subscription", "error");
          return false;
        }
      },

      // ── Home ────────────────────────────────────────────────────────────────
      trendingAlbums: [],
      homeLoading: false,

      loadHome: async () => {
        set({ homeLoading: true });
        try {
          const res = await homeApi.get();
          if (res?.data) set({
            trendingAlbums: res.data.trendingAlbums,
            blogs: res.data.blogs,
            homeLoading: false,
          });
        } catch { set({ homeLoading: false }); }
      },

      // ── Toast ────────────────────────────────────────────────────────────────
      toast: { show: false, message: "", type: "success" },
      showToast: (message, type = "success") => {
        if (typeof window !== "undefined" && (window as any)._toastTimeout) {
          clearTimeout((window as any)._toastTimeout);
        }
        set({ toast: { show: true, message, type } });
        if (typeof window !== "undefined") {
          (window as any)._toastTimeout = setTimeout(
            () => set({ toast: { show: false, message: "", type: "success" } }),
            2800
          );
        }
      },
    }),
    {
      name: "vhq-store-v5",
      partialize: (s) => ({
        user: s.user,
        isLoggedIn: s.isLoggedIn,
        cart: s.cart,
        // likedPostIds persisted so hearts stay red after reload
        likedPostIds: s.likedPostIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Ensure likedPostIds is always a plain array
        if (!Array.isArray(state.likedPostIds)) {
          state.likedPostIds = [];
        }

        // Only clear session if truly no tokens remain
        const hasAccessToken  = !!getRawAccessToken();
        const hasRefreshToken = !!getRefreshToken();
        if (!hasAccessToken && !hasRefreshToken) {
          state.isLoggedIn = false;
          state.user       = null;
          // Also clear likedPostIds on full logout — no tokens means no session
          state.likedPostIds = [];
        }

        // Reset all non-persisted state to empty defaults so stale
        // in-memory data never leaks between sessions
        state.posts           = [];
        state.feedMeta        = null;
        state.feedLoading     = false;
        state.collection      = [];
        state.collectionMeta  = null;
        state.collectionStats = null;
        state.wishlist        = [];
        state.conversations   = [];
        state.messages        = {};
        state.notifications   = [];
        state.listings        = [];
        state.savedListings   = [];
        state.stores          = [];
        state.blogs           = [];
        state.trendingAlbums  = [];
        state.unreadMessageCount = 0;
        state.unreadNotifCount   = 0;
      },
    }
  )
);

// ── Unauthorized event → clear all state ─────────────────────────────────────
onUnauthorized(() => {
  useStore.setState({
    user: null, isLoggedIn: false,
    posts: [], feedMeta: null, likedPostIds: [],
    collection: [], wishlist: [], conversations: [], messages: {},
    notifications: [], listings: [], savedListings: [], stores: [],
    blogs: [], trendingAlbums: [], unreadMessageCount: 0, unreadNotifCount: 0,
  });
  disconnectSocket();
});