// ─── VHQ API Client ──────────────────────────────────────────────────────────
// Base URL is read from NEXT_PUBLIC_API_BASE_URL (see .env.example).
// Falls back to the production API if the env var isn't set.

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.thevinylheadquarters.com/v1";

// ── Event emitter for unauthorized events ──────────────────────────────────────
const authEventListeners = new Set<() => void>();
export function onUnauthorized(cb: () => void) {
  authEventListeners.add(cb);
  return () => authEventListeners.delete(cb);
}
function emitUnauthorized() {
  authEventListeners.forEach(cb => cb());
}

// ── Token helpers with expiry check ─────────────────────────────────────────────
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("vhq_access_token");
  const expiry = localStorage.getItem("vhq_token_expiry");

  if (token && expiry) {
    const expiryTime = parseInt(expiry, 10);
    // Give 30s buffer — don't clear yet, let refresh handle it
    if (Date.now() >= expiryTime - 30_000) {
      return null; // Signal "needs refresh" without clearing tokens
    }
  }
  return token;
}

export function getRawAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vhq_access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vhq_refresh_token");
}

export function setTokens(access: string, refresh: string) {
  const expiryTime = Date.now() + 60 * 60 * 1000; // 1 hour
  localStorage.setItem("vhq_access_token", access);
  localStorage.setItem("vhq_refresh_token", refresh);
  localStorage.setItem("vhq_token_expiry", expiryTime.toString());

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("token-updated", { detail: { access, refresh } }));
  }
}

export function clearTokens() {
  localStorage.removeItem("vhq_access_token");
  localStorage.removeItem("vhq_refresh_token");
  localStorage.removeItem("vhq_token_expiry");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth-logout"));
  }
}

// ── Token refresh — single in-flight promise, no aggressive retry blocking ────
let refreshPromise: Promise<boolean> | null = null;
let lastRefreshFailed = 0; // timestamp of last failure

export async function tryRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  // Back-off: don't retry within 10s of a failure (not 30s — that was too aggressive)
  if (Date.now() - lastRefreshFailed < 10_000) return false;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        lastRefreshFailed = Date.now();
        return false;
      }

      const data = await res.json();
      if (data?.data?.accessToken) {
        setTokens(data.data.accessToken, data.data.refreshToken ?? refreshToken);
        lastRefreshFailed = 0;
        return true;
      }
      lastRefreshFailed = Date.now();
      return false;
    } catch (err) {
      console.error("Token refresh error:", err);
      lastRefreshFailed = Date.now();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean; isFormData?: boolean; _retry?: boolean } = {}
): Promise<T> {
  const { auth = true, isFormData = false, _retry = false, ...init } = options;

  // Always try to refresh proactively if token is near expiry
  if (auth && !getAccessToken() && getRefreshToken()) {
    await tryRefresh();
  }

  const headers: Record<string, string> = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getRawAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> || {}) },
  });

  // 401 handling — try refresh once
  if (res.status === 401 && auth && !_retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Retry with new token
      return apiFetch(path, { ...options, _retry: true });
    }

    // Real 401 — only logout if refresh token is also gone
    if (!getRefreshToken()) {
      clearTokens();
      emitUnauthorized();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/auth")) {
        window.location.href = "/auth?session=expired";
      }
    }
    throw new Error("Session expired. Please login again.");
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 AUTH
// ═══════════════════════════════════════════════════════════════════════════════
export const authApi = {
  register: (email: string, username: string, password: string) =>
    apiFetch<{ data: { message: string } }>("/auth/register", {
      method: "POST", auth: false,
      body: JSON.stringify({ email, username, password }),
    }),

  login: async (email: string, password: string) => {
    const res = await apiFetch<{ data: { accessToken: string; refreshToken: string; user: ApiUser } }>("/auth/login", {
      method: "POST", auth: false,
      body: JSON.stringify({ email, password }),
    });
    if (res?.data?.accessToken) setTokens(res.data.accessToken, res.data.refreshToken);
    return res;
  },

  logout: () => apiFetch("/auth/logout", { method: "POST" }).catch(() => {}),

  getMe: () => apiFetch<{ data: ApiUser }>("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch("/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  forgotPassword: (email: string) =>
    apiFetch("/auth/forgot-password", {
      method: "POST", auth: false,
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    apiFetch("/auth/reset-password", {
      method: "POST", auth: false,
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  verifyEmail: (email: string, otp: string) =>
    apiFetch("/auth/verify-email", {
      method: "POST", auth: false,
      body: JSON.stringify({ email, otp }),
    }),

  resendOtp: (email: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET") =>
    apiFetch("/auth/resend-verification", {
      method: "POST", auth: false,
      body: JSON.stringify({ email, type }),
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 USERS
// ═══════════════════════════════════════════════════════════════════════════════
export const usersApi = {
  getMe: () => apiFetch<{ data: ApiUser }>("/users/me"),

  updateMe: (formData: FormData) =>
    apiFetch<{ data: ApiUser }>("/users/me", {
      method: "PATCH", isFormData: true, body: formData,
    }),

  search: (search: string, limit = 20) =>
    apiFetch<{ data: ApiUserPreview[]; meta: ApiMeta }>(`/users/search?search=${encodeURIComponent(search)}&limit=${limit}`),

  getByUsername: (username: string) =>
    apiFetch<{ data: ApiUser }>(`/users/${username}`),

  follow: (username: string) =>
    apiFetch(`/users/${username}/follow`, { method: "POST" }),

  unfollow: (username: string) =>
    apiFetch(`/users/${username}/follow`, { method: "DELETE" }),

  getFollowers: (username: string, limit = 20) =>
    apiFetch<{ data: ApiUserPreview[]; meta: ApiMeta }>(`/users/${username}/followers?limit=${limit}`),

  getFollowing: (username: string, limit = 20) =>
    apiFetch<{ data: ApiUserPreview[]; meta: ApiMeta }>(`/users/${username}/following?limit=${limit}`),

  getCollection: (userId: string, limit = 20) =>
    apiFetch<{ data: ApiCollectionItem[]; meta: ApiMeta }>(`/users/${userId}/collection?limit=${limit}`),

  getPosts: (userId: string, limit = 20) =>
    apiFetch<{ data: ApiPost[]; meta: ApiMeta }>(`/users/${userId}/posts?limit=${limit}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏠 HOME
// ═══════════════════════════════════════════════════════════════════════════════
export const homeApi = {
  get: (albumLimit = 10, blogLimit = 10) =>
    apiFetch<{ data: { trendingAlbums: ApiAlbumPreview[]; blogs: ApiBlogPost[] } }>(
      `/home?albumLimit=${albumLimit}&blogLimit=${blogLimit}`
    ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📰 FEED & POSTS
// ═══════════════════════════════════════════════════════════════════════════════
export const feedApi = {
  getFeed: (limit = 20, cursor?: string) =>
    apiFetch<{ data: ApiPost[]; meta: ApiMeta & { isDiscovery?: boolean } }>(
      `/feed?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`
    ),

  createPost: (content: string, visibility: "PUBLIC" | "FOLLOWERS" = "PUBLIC") =>
    apiFetch<{ data: ApiPost }>("/posts", {
      method: "POST",
      body: JSON.stringify({ content, visibility }),
    }),

  deletePost: (postId: string) =>
    apiFetch(`/posts/${postId}`, { method: "DELETE" }),

  likePost: (postId: string) =>
    apiFetch(`/posts/${postId}/like`, { method: "POST" }),

  unlikePost: (postId: string) =>
    apiFetch(`/posts/${postId}/like`, { method: "DELETE" }),

  reportPost: (postId: string, reason: string) =>
    apiFetch(`/posts/${postId}/report`, {
      method: "POST", body: JSON.stringify({ reason }),
    }),

  getComments: (postId: string, limit = 20) =>
    apiFetch<{ data: ApiComment[]; meta: ApiMeta }>(`/posts/${postId}/comments?limit=${limit}`),

  addComment: (postId: string, content: string, parentId?: string | null) =>
    apiFetch<{ data: ApiComment }>(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parentId: parentId || null }),
    }),

  deleteComment: (commentId: string) =>
    apiFetch(`/comments/${commentId}`, { method: "DELETE" }),

  likeComment: (commentId: string) =>
    apiFetch(`/comments/${commentId}/like`, { method: "POST" }),

  unlikeComment: (commentId: string) =>
    apiFetch(`/comments/${commentId}/like`, { method: "DELETE" }),

  getCommentReplies: (commentId: string, limit = 20) =>
    apiFetch<{ data: ApiComment[]; meta: ApiMeta }>(`/comments/${commentId}/replies?limit=${limit}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 💿 ALBUMS
// ═══════════════════════════════════════════════════════════════════════════════
export const albumsApi = {
  list: (q?: string, limit = 20, cursor?: string) =>
    apiFetch<{ data: ApiAlbumPreview[]; meta: ApiMeta }>(
      `/albums?${q ? `q=${encodeURIComponent(q)}&` : ""}limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`
    ),

  getTrending: (limit = 20) =>
    apiFetch<{ data: ApiAlbumPreview[] }>(`/albums/trending?limit=${limit}`),

  getById: (albumId: string) =>
    apiFetch<{ data: ApiAlbumDetail }>(`/albums/${albumId}`),

  searchExternal: (q: string) =>
    apiFetch<{ data: ApiExternalAlbum[] }>(`/albums/external/search?q=${encodeURIComponent(q)}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════
export const collectionApi = {
  get: (limit = 20, cursor?: string, search?: string, condition?: string, sortBy?: string, sortOrder?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    if (search) params.set("search", search);
    if (condition) params.set("condition", condition);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    return apiFetch<{ data: ApiCollectionItem[]; meta: ApiMeta; stats: ApiCollectionStats }>(`/collection?${params}`);
  },

  addFromCatalog: (albumId: string, options?: Partial<ApiAddCollectionOptions>) =>
    apiFetch<{ data: ApiCollectionItem }>("/collection", {
      method: "POST",
      body: JSON.stringify({ albumId, ...options }),
    }),

  addFromExternal: (source: "DISCOGS" | "MUSICBRAINZ", externalId: string, options?: Partial<ApiAddCollectionOptions>) =>
    apiFetch<{ data: ApiCollectionItem }>("/collection", {
      method: "POST",
      body: JSON.stringify({ source, externalId, ...options }),
    }),
  addManual: (data: ApiManualCollectionAdd) =>
    apiFetch<{ data: ApiCollectionItem }>("/collection/manual", {
      method: "POST", body: JSON.stringify(data),
    }),

  update: (collectionItemId: string, data: Partial<ApiAddCollectionOptions>) =>
    apiFetch<{ data: ApiCollectionItem }>(`/collection/${collectionItemId}`, {
      method: "PATCH", body: JSON.stringify(data),
    }),

  remove: (collectionItemId: string) =>
    apiFetch(`/collection/${collectionItemId}`, { method: "DELETE" }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// ❤️ WISHLIST
// ═══════════════════════════════════════════════════════════════════════════════
export const wishlistApi = {
  get: (limit = 20, cursor?: string) =>
    apiFetch<{ data: ApiWishlistItem[]; meta: ApiMeta }>(
      `/wishlist?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`
    ),

  check: (albumId: string) =>
    apiFetch<{ data: { inWishlist: boolean; id?: string } }>(`/wishlist/check/${albumId}`),

  add: (albumId: string, notes?: string) =>
    apiFetch<{ data: ApiWishlistItem }>("/wishlist", {
      method: "POST", body: JSON.stringify({ albumId, notes }),
    }),

  remove: (wishlistItemId: string) =>
    apiFetch(`/wishlist/${wishlistItemId}`, { method: "DELETE" }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🛒 MARKETPLACE
// ═══════════════════════════════════════════════════════════════════════════════
export const marketplaceApi = {
  list: (params?: ApiMarketplaceParams) => {
    const q = new URLSearchParams({ limit: String(params?.limit || 20) });
    if (params?.q) q.set("q", params.q);
    if (params?.category) q.set("category", params.category);
    if (params?.condition) q.set("condition", params.condition);
    if (params?.location) q.set("location", params.location);
    if (params?.minPrice) q.set("minPrice", String(params.minPrice));
    if (params?.maxPrice) q.set("maxPrice", String(params.maxPrice));
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.cursor) q.set("cursor", params.cursor);
    return apiFetch<{ data: ApiListing[]; meta: ApiMeta }>(`/marketplace?${q}`);
  },

  getFeatured: () => apiFetch<{ data: ApiListing[] }>("/marketplace/featured"),
  getSaved: () => apiFetch<{ data: ApiListing[] }>("/marketplace/saved"),
  getMyListings: () => apiFetch<{ data: ApiListing[] }>("/marketplace/my-listings"),
  getById: (listingId: string) => apiFetch<ApiListing>(`/marketplace/${listingId}`),

  create: (data: ApiCreateListing) =>
    apiFetch<ApiListing>("/marketplace", { method: "POST", body: JSON.stringify(data) }),

  update: (listingId: string, data: Partial<ApiCreateListing>) =>
    apiFetch<ApiListing>(`/marketplace/${listingId}`, { method: "PATCH", body: JSON.stringify(data) }),

  markSold: (listingId: string) =>
    apiFetch(`/marketplace/${listingId}/sold`, { method: "PATCH" }),

  delete: (listingId: string) =>
    apiFetch(`/marketplace/${listingId}`, { method: "DELETE" }),

  save: (listingId: string) =>
    apiFetch(`/marketplace/${listingId}/save`, { method: "POST" }),

  unsave: (listingId: string) =>
    apiFetch(`/marketplace/${listingId}/save`, { method: "DELETE" }),

  report: (listingId: string, reason: string) =>
    apiFetch(`/marketplace/${listingId}/report`, { method: "POST", body: JSON.stringify({ reason }) }),

  uploadImages: async (listingId: string, formData: FormData): Promise<any> => {
    const token = getRawAccessToken();
    if (!token) throw new Error("No access token");

    const res = await fetch(`${BASE_URL}/marketplace/${listingId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  deleteImage: (listingId: string, imageId: string) =>
    apiFetch(`/marketplace/${listingId}/images/${imageId}`, { method: "DELETE" }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 MESSAGING
// ═══════════════════════════════════════════════════════════════════════════════
export const messagingApi = {
  listConversations: (limit = 20) =>
    apiFetch<{ data: ApiConversation[]; meta: ApiMeta }>(`/messaging/conversations?limit=${limit}`),

  getUnreadCount: () =>
    apiFetch<{ data: { count: number } }>("/messaging/conversations/unread"),

  getConversation: (conversationId: string) =>
    apiFetch<{ data: ApiConversation }>(`/messaging/conversations/${conversationId}`),

  startConversation: (recipientId: string, initialMessage: string, listingId?: string) =>
    apiFetch<{ data: { conversation: ApiConversation; message: ApiMessage; isNew: boolean } }>("/messaging/conversations", {
      method: "POST",
      body: JSON.stringify({ recipientId, initialMessage, ...(listingId ? { listingId } : {}) }),
    }),

  getMessages: (conversationId: string, limit = 20, cursor?: string) =>
    apiFetch<{ data: ApiMessage[]; meta: ApiMeta }>(
      `/messaging/conversations/${conversationId}/messages?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`
    ),

  sendMessage: (conversationId: string, content: string) =>
    apiFetch<{ data: ApiMessage }>(`/messaging/conversations/${conversationId}/messages`, {
      method: "POST", body: JSON.stringify({ content }),
    }),

  deleteMessage: (messageId: string) =>
    apiFetch(`/messaging/messages/${messageId}`, { method: "DELETE" }),

  markAsRead: (conversationId: string) =>
    apiFetch(`/messaging/conversations/${conversationId}/read`, { method: "PATCH" }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export const notificationsApi = {
  get: (limit = 20, unreadOnly = false, cursor?: string) =>
    apiFetch<{ data: ApiNotification[]; meta: ApiMeta }>(
      `/notifications?limit=${limit}&unreadOnly=${unreadOnly}${cursor ? `&cursor=${cursor}` : ""}`
    ),

  getUnreadCount: () =>
    apiFetch<{ data: { count: number } }>("/notifications/unread-count"),

  markAllRead: () => apiFetch("/notifications/read-all", { method: "PATCH" }),
  markOneRead: (notificationId: string) =>
    apiFetch(`/notifications/${notificationId}/read`, { method: "PATCH" }),
  delete: (notificationId: string) =>
    apiFetch(`/notifications/${notificationId}`, { method: "DELETE" }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏪 STORES
// ═══════════════════════════════════════════════════════════════════════════════
export const storesApi = {
  list: (limit = 20, city?: string, country?: string, search?: string) => {
    const p = new URLSearchParams({ limit: String(limit) });
    if (city) p.set("city", city);
    if (country) p.set("country", country);
    if (search) p.set("search", search);
    return apiFetch<{ data: ApiStore[]; meta: ApiMeta }>(`/stores?${p}`);
  },

  getFeatured: () => apiFetch<{ data: ApiStore[] }>("/stores/featured"),
  getById: (storeId: string) => apiFetch<{ data: ApiStore }>(`/stores/${storeId}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 BLOG
// ═══════════════════════════════════════════════════════════════════════════════
export const blogApi = {
  list: (limit = 20, featured?: boolean) =>
    apiFetch<{ data: ApiBlogPost[]; meta: ApiMeta }>(
      `/blog?limit=${limit}${featured !== undefined ? `&featured=${featured}` : ""}`,
      { auth: false }
    ),

  getBySlug: (slug: string) =>
    apiFetch<{ data: ApiBlogPostDetail }>(`/blog/${slug}`, { auth: false }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 👕 MERCH
// ═══════════════════════════════════════════════════════════════════════════════
export const merchApi = {
  listCategories: () =>
    apiFetch<{ data: ApiMerchCategory[] }>("/merch/categories", { auth: false }),

  listProducts: (limit = 20, categoryId?: string) =>
    apiFetch<{ data: ApiMerchProduct[]; meta: ApiMeta }>(
      `/merch/products?limit=${limit}${categoryId ? `&categoryId=${categoryId}` : ""}`,
      { auth: false }
    ),

  getProduct: (productId: string) =>
    apiFetch<{ data: ApiMerchProduct }>(`/merch/products/${productId}`, { auth: false }),

  getMyOrders: (limit = 20) =>
    apiFetch<{ data: ApiMerchOrder[]; meta: ApiMeta }>(`/merch/orders?limit=${limit}`),

  getOrder: (orderId: string) =>
    apiFetch<{ data: ApiMerchOrder }>(`/merch/orders/${orderId}`),

  // ── Server-side cart (synced before Stripe checkout) ──────────────────────
  addCartItem: (productId: string, quantity: number) =>
    apiFetch<{ data: ApiCart }>("/merch/cart/items", {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    }),

  getCart: () => apiFetch<{ data: ApiCart }>("/merch/cart"),

  // Creates a Stripe Checkout Session for whatever is currently in the
  // server-side cart. Returns a hosted Stripe URL to redirect the browser to.
  checkout: () =>
    apiFetch<{ data: ApiCheckoutSession }>("/merch/checkout", { method: "POST" }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 💳 WEB SUBSCRIPTION (Stripe — Premium plan)
// ═══════════════════════════════════════════════════════════════════════════════
export const webSubscriptionApi = {
  // Creates a Stripe Checkout Session for the Premium subscription.
  // Returns a hosted Stripe URL — redirect the full page to it.
  checkout: () =>
    apiFetch<{ data: ApiCheckoutSession }>("/web-subscription/checkout", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  // Current subscription state for the logged-in user.
  status: () => apiFetch<{ data: ApiSubscriptionStatus }>("/web-subscription/status"),

  // Cancels at period end — access remains active until `expiresAt`.
  cancel: () =>
    apiFetch<{ data: ApiSubscriptionStatus } | void>("/web-subscription/cancel", {
      method: "POST",
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📷 SCANNER
// ═══════════════════════════════════════════════════════════════════════════════
export const scannerApi = {
  barcodeLookup: (barcode: string) =>
    apiFetch<{ data: ApiAlbumDetail | null }>(`/scanner/barcode?barcode=${barcode}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 API TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ApiUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  tier: "FREE" | "PREMIUM";
  createdAt: string;
  email: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  _count: {
    followedBy: number;
    following: number;
    collection: number;
    posts: number;
  };
};

export type ApiUserPreview = {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  tier: "FREE" | "PREMIUM";
};

export type ApiPost = {
  id: string;
  content: string;
  visibility: "PUBLIC" | "FOLLOWERS";
  likeCount: number;
  commentCount: number;
  createdAt: string;
  isLiked?: boolean;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    tier: "FREE" | "PREMIUM";
  };
  images: { id: string; url: string; position: number }[];
};

export type ApiComment = {
  id: string;
  content: string;
  parentId: string | null;
  likeCount: number;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
  _count?: { replies: number };
};

export type ApiAlbumPreview = {
  id: string;
  title: string;
  year: number;
  coverUrl: string;
  format?: string;
  trendingScore: number;
  albumArtists: { artist: { name: string } }[];
};

export type ApiAlbumDetail = {
  id: string;
  title: string;
  year: number;
  country: string;
  format: string;
  coverUrl: string;
  barcode?: string;
  catNumber?: string;
  notes?: string;
  source: string;
  discogsId?: string;
  mbId?: string;
  trendingScore: number;
  createdAt: string;
  label?: { id: string; name: string };
  albumArtists: { role: string; artist: { id: string; name: string } }[];
  albumGenres: { genre: { id: string; name: string } }[];
  tracks: { id: string; position: string; title: string; duration: number }[];
};

export type ApiExternalAlbum = {
  externalId: string;
  source: "DISCOGS" | "MUSICBRAINZ";
  title: string;
  artists: string[];
  year?: number;
  coverUrl?: string;
  format?: string;
  label?: string;
  country?: string;
  catNumber?: string;
};

export type ApiCollectionItem = {
  id: string;
  condition: string | null;
  notes: string | null;
  purchaseDate: string | null;
  purchasePrice: string | null;
  isPublic: boolean;
  createdAt: string;
  album: {
    id: string;
    title: string;
    year: number;
    coverUrl: string;
    format: string;
    country: string;
    albumArtists: { artist: { name: string } }[];
    albumGenres: { genre: { name: string } }[];
  };
};

export type ApiCollectionStats = {
  total: number;
  tier: string;
  limit: number;
  byCondition: Record<string, number>;
  estimatedValue: string | null;
};

export type ApiAddCollectionOptions = {
  condition: string;
  notes: string;
  purchasePrice: number;
  purchaseDate: string;
  isPublic: boolean;
};

export type ApiManualCollectionAdd = {
  title: string;
  artistNames: string[];
  year?: number;
  format?: string;
  coverUrl?: string;
  labelName?: string;
  country?: string;
  condition?: string;
  notes?: string;
  purchasePrice?: number;
  isPublic?: boolean;
};

export type ApiWishlistItem = {
  id: string;
  notes: string | null;
  createdAt: string;
  album: {
    id: string;
    title: string;
    year: number;
    coverUrl: string;
    format: string;
    trendingScore: number;
    albumArtists: { artist: { name: string } }[];
  };
};

export type ApiListing = {
  id: string;
  title: string;
  description?: string;
  price: string;
  currency: string;
  category: "VINYL" | "CD" | "EQUIPMENT";
  condition: string;
  location: string;
  status: "ACTIVE" | "SOLD" | "INACTIVE";
  moderationStatus: string;
  isFeatured: boolean;
  viewCount?: number;
  createdAt: string;
  updatedAt?: string;
  user: { id: string; username: string; avatarUrl: string | null };
  images: { id?: string; url: string; position?: number }[];
  album: { id: string; title: string; coverUrl: string; year?: number; albumArtists?: { artist: { name: string } }[] } | null;
};

export type ApiCreateListing = {
  title: string;
  description: string;
  price: number;
  currency?: string;
  category: "VINYL" | "CD" | "EQUIPMENT";
  condition: string;
  location: string;
  albumId?: string;
};

export type ApiMarketplaceParams = {
  limit?: number;
  q?: string;
  category?: string;
  condition?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  cursor?: string;
};

export type ApiConversation = {
  id: string;
  listingId: string | null;
  updatedAt: string;
  participants: {
    userId: string;
    lastReadAt: string | null;
    user: { id: string; username: string; avatarUrl: string | null };
  }[];
  messages: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    status: string;
  }[];
  listing: { id: string; title: string; price: string; images: { url: string }[] } | null;
};

export type ApiMessage = {
  id: string;
  content: string;
  status: string;
  senderId: string;
  isDeleted: boolean;
  createdAt: string;
  sender: { id: string; username: string; avatarUrl: string | null };
};

export type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: string;
};

export type ApiStore = {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  website: string;
  instagramUrl: string | null;
  imageUrl: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  createdAt: string;
};

export type ApiBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverUrl: string | null;
  author: { id: string; username: string; avatarUrl: string | null };
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: string;
  createdAt: string;
  tags: { tag: { name: string } }[];
};

export type ApiBlogPostDetail = ApiBlogPost & {
  content: string;
  updatedAt: string;
};

export type ApiMerchCategory = {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
};

export type ApiMerchProduct = {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  coverUrl: string | null;
  isActive: boolean;
  stock: number;
  revenueCatId: string | null;
  createdAt: string;
  category: { id: string; name: string; slug: string };
  images: { url: string }[];
};

export type ApiMerchOrder = {
  id: string;
  status: string;
  totalAmount: string;
  currency: string;
  revenueCatTxId: string | null;
  shippingAddress: string | null;
  createdAt: string;
  updatedAt: string;
  items: {
    id: string;
    quantity: number;
    unitPrice: string;
    product: { id: string; name: string; coverUrl: string | null };
  }[];
};

export type ApiCartItem = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    price: string;
    currency: string;
    coverUrl: string | null;
    isActive: boolean;
    stock: number;
  };
};

export type ApiCart = {
  id: string;
  items: ApiCartItem[];                                           
  itemCount: number;
  total: number;
};

// Returned by both /merch/checkout and /web-subscription/checkout —
// same Stripe Checkout Session pattern for both flows.
export type ApiCheckoutSession = {
  url: string;
  sessionId: string;
};

export type ApiSubscriptionStatus = {
  active: boolean;
  source: "WEB_STRIPE" | null | string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED" | null | string;
  productId: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  managedOnOtherPlatform: boolean;
};

export type ApiMeta = {
  cursor: string | null;
  hasNext: boolean;
};

// ── Image URL helper ──────────────────────────────────────────────────────────
const API_ORIGIN = BASE_URL.replace(/\/v1\/?$/, "");
export function imgUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_ORIGIN}${url}`;
}