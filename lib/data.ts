// ─── Types ───────────────────────────────────────────────────────────────────

export type User = {
  id: string; name: string; username: string; avatar: string; bio: string;
  isPremium: boolean; isSeller: boolean; shopName?: string; shopBio?: string;
  followers: number; following: number; collectionCount: number;
  badges: string[]; joinedYear: number; genres: string[];
};

export type Record = {
  id: string; title: string; artist: string; year: number; genre: string;
  condition: "M" | "NM" | "VG+" | "VG" | "G"; price: number;
  coverEmoji: string; coverColor: string; sellerId: string; sellerName: string;
  sellerAvatar: string; description: string; label: string; format: string;
  trending: boolean; isNew: boolean; wishlisted?: boolean;
};

export type Post = {
  id: string; userId: string; userName: string; userAvatar: string;
  type: "haul" | "setup" | "new" | "favorite" | "sell";
  content: string; emoji: string; likes: number; comments: number;
  liked: boolean; saved: boolean; timestamp: string; recordId?: string;
  recordTitle?: string; images?: string[];
};

export type Message = {
  id: string; senderId: string; receiverId: string; text: string;
  timestamp: string; read: boolean;
};

export type Conversation = {
  id: string; userId: string; userName: string; userAvatar: string;
  lastMessage: string; lastTime: string; unread: number; recordTitle?: string;
};

export type Store = {
  id: string; name: string; city: string; country: string; address: string;
  rating: number; reviews: number; specialty: string[]; hours: string;
  phone: string; website: string; emoji: string; color: string;
  description: string; verified: boolean;
};

export type Product = {
  id: string; name: string; category: string; price: number;
  emoji: string; color: string; description: string; sizes?: string[];
  inStock: boolean;
};

export type WishlistItem = {
  id: string; recordId: string; title: string; artist: string;
  targetPrice: number; currentPrice: number; priceAlert: boolean;
  addedDate: string; available: boolean;
};

// ─── Current User ─────────────────────────────────────────────────────────────

export const currentUser: User = {
  id: "u1", name: "Alex Vinyl", username: "alexvinyl",
  avatar: "#FF006E", bio: "Vinyl obsessive since 2015. Jazz, Soul & 70s Rock collector. 🎵",
  isPremium: false, isSeller: false,
  followers: 1247, following: 389, collectionCount: 47,
  badges: ["Early Adopter", "Jazz Head", "Top Collector"],
  joinedYear: 2022, genres: ["Jazz", "Soul", "Rock", "Funk"],
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const users: User[] = [
  { id: "u2", name: "Marcus Williams", username: "vinyl_mark", avatar: "#00F5FF", bio: "Selling rare 70s pressings. DM for deals.", isPremium: true, isSeller: true, shopName: "Mark's Wax Shop", shopBio: "Rare vinyl since 1998. Specialist in 70s soul and funk.", followers: 3421, following: 210, collectionCount: 312, badges: ["Top Seller", "Verified", "Premium"], joinedYear: 2021, genres: ["Soul", "Funk", "R&B"] },
  { id: "u3", name: "Rania Al-Hassan", username: "record_rania", avatar: "#7B2FFF", bio: "Indie & post-punk collector. Open to trades.", isPremium: true, isSeller: true, shopName: "Rania's Records", shopBio: "Curated indie, post-punk and new wave vinyl.", followers: 2180, following: 445, collectionCount: 189, badges: ["Verified Seller", "Premium"], joinedYear: 2022, genres: ["Indie", "Post-Punk", "New Wave"] },
  { id: "u4", name: "James Park", username: "jazzhead_92", avatar: "#FFE600", bio: "Jazz is life. Blue Note original pressings hunter.", isPremium: true, isSeller: false, followers: 891, following: 234, collectionCount: 567, badges: ["Jazz Head", "Premium", "Top Collector"], joinedYear: 2020, genres: ["Jazz", "Blues", "Bebop"] },
  { id: "u5", name: "Sofie Larsson", username: "nordic_wax", avatar: "#4ADE80", bio: "Scandinavian folk and jazz. Record fair addict.", isPremium: false, isSeller: false, followers: 445, following: 123, collectionCount: 203, badges: ["Explorer"], joinedYear: 2023, genres: ["Folk", "Jazz", "Classical"] },
  { id: "u6", name: "Devon Clarke", username: "waxpoetic", avatar: "#FF8800", bio: "Hip-hop vinyl only. Running a tight ship.", isPremium: true, isSeller: true, shopName: "Wax Poetic Shop", shopBio: "Hip-hop, rap and boom-bap vinyl specialist.", followers: 5600, following: 89, collectionCount: 441, badges: ["Top Seller", "Premium", "OG"], joinedYear: 2020, genres: ["Hip-Hop", "Rap", "Electronic"] },
  { id: "u7", name: "Yuki Tanaka", username: "tokyovinyl", avatar: "#FF006E", bio: "Japanese pressings collector. City pop enthusiast.", isPremium: false, isSeller: false, followers: 678, following: 312, collectionCount: 88, badges: ["City Pop Expert"], joinedYear: 2023, genres: ["City Pop", "J-Jazz", "Ambient"] },
];

// ─── Records / Marketplace ────────────────────────────────────────────────────

export const records: Record[] = [
  { id: "r1", title: "The Dark Side of the Moon", artist: "Pink Floyd", year: 1973, genre: "Prog Rock", condition: "NM", price: 89, coverEmoji: "🌙", coverColor: "#FF006E", sellerId: "u2", sellerName: "Marcus Williams", sellerAvatar: "#00F5FF", description: "UK original pressing, gatefold, both posters and stickers present. Plays flawlessly.", label: "Harvest", format: "LP", trending: true, isNew: false },
  { id: "r2", title: "Kind of Blue", artist: "Miles Davis", year: 1959, genre: "Jazz", condition: "VG+", price: 120, coverEmoji: "🎷", coverColor: "#00F5FF", sellerId: "u3", sellerName: "Rania Al-Hassan", sellerAvatar: "#7B2FFF", description: "Columbia six-eye pressing. Some light marks but plays perfectly. Classic recording.", label: "Columbia", format: "LP", trending: false, isNew: false },
  { id: "r3", title: "Rumours", artist: "Fleetwood Mac", year: 1977, genre: "Rock", condition: "M", price: 55, coverEmoji: "💃", coverColor: "#7B2FFF", sellerId: "u6", sellerName: "Devon Clarke", sellerAvatar: "#FF8800", description: "Factory sealed! Never played. Perfect for the collection.", label: "Warner Bros.", format: "LP", trending: true, isNew: true },
  { id: "r4", title: "Horses", artist: "Patti Smith", year: 1975, genre: "Punk", condition: "NM", price: 67, coverEmoji: "🐴", coverColor: "#FFE600", sellerId: "u2", sellerName: "Marcus Williams", sellerAvatar: "#00F5FF", description: "US original press. Arista label. Minimal wear, great sound.", label: "Arista", format: "LP", trending: false, isNew: false },
  { id: "r5", title: "Blue", artist: "Joni Mitchell", year: 1971, genre: "Folk", condition: "VG+", price: 48, coverEmoji: "💙", coverColor: "#00F5FF", sellerId: "u3", sellerName: "Rania Al-Hassan", sellerAvatar: "#7B2FFF", description: "Reprise original. Iconic album in great shape. Light surface noise.", label: "Reprise", format: "LP", trending: false, isNew: false },
  { id: "r6", title: "Nevermind", artist: "Nirvana", year: 1991, genre: "Grunge", condition: "NM", price: 45, coverEmoji: "🏊", coverColor: "#4ADE80", sellerId: "u6", sellerName: "Devon Clarke", sellerAvatar: "#FF8800", description: "DGC original pressing. First press. Plays perfectly.", label: "DGC", format: "LP", trending: true, isNew: false },
  { id: "r7", title: "Abbey Road", artist: "The Beatles", year: 1969, genre: "Rock", condition: "VG+", price: 150, coverEmoji: "🛣️", coverColor: "#FF006E", sellerId: "u2", sellerName: "Marcus Williams", sellerAvatar: "#00F5FF", description: "UK Apple pressing, matrix 1/1. Some light marks as expected, sounds brilliant.", label: "Apple", format: "LP", trending: false, isNew: false },
  { id: "r8", title: "Purple Rain", artist: "Prince", year: 1984, genre: "Funk", condition: "M", price: 78, coverEmoji: "☔", coverColor: "#7B2FFF", sellerId: "u3", sellerName: "Rania Al-Hassan", sellerAvatar: "#7B2FFF", description: "Sealed original. Warner Bros. Original soundtrack. Perfect gift.", label: "Warner Bros.", format: "LP", trending: true, isNew: true },
  { id: "r9", title: "Pet Sounds", artist: "The Beach Boys", year: 1966, genre: "Pop", condition: "VG", price: 35, coverEmoji: "🐾", coverColor: "#FFE600", sellerId: "u7", sellerName: "Yuki Tanaka", sellerAvatar: "#FF006E", description: "Capitol mono pressing. Some wear but plays well. Great record at a great price.", label: "Capitol", format: "LP", trending: false, isNew: false },
  { id: "r10", title: "Thriller", artist: "Michael Jackson", year: 1982, genre: "Pop", condition: "NM", price: 60, coverEmoji: "🕺", coverColor: "#FF8800", sellerId: "u6", sellerName: "Devon Clarke", sellerAvatar: "#FF8800", description: "Epic Records pressing. Near mint condition. The greatest selling album on vinyl.", label: "Epic", format: "LP", trending: false, isNew: false },
  { id: "r11", title: "Illmatic", artist: "Nas", year: 1994, genre: "Hip-Hop", condition: "NM", price: 85, coverEmoji: "🗽", coverColor: "#00F5FF", sellerId: "u6", sellerName: "Devon Clarke", sellerAvatar: "#FF8800", description: "Columbia original. One of the greatest hip-hop albums ever made. Excellent condition.", label: "Columbia", format: "LP", trending: true, isNew: false },
  { id: "r12", title: "Bitches Brew", artist: "Miles Davis", year: 1970, genre: "Jazz", condition: "VG+", price: 95, coverEmoji: "🌊", coverColor: "#7B2FFF", sellerId: "u3", sellerName: "Rania Al-Hassan", sellerAvatar: "#7B2FFF", description: "Columbia double LP. Gatefold. Both discs in great shape.", label: "Columbia", format: "2xLP", trending: false, isNew: false },
];

// ─── Collection (current user's) ─────────────────────────────────────────────

export const myCollection: (Record & { addedDate: string; personalNotes: string })[] = [
  { ...records[1], id: "c1", addedDate: "2024-01-15", personalNotes: "Found at Academy Records NYC. Amazing condition." },
  { ...records[3], id: "c2", addedDate: "2024-02-03", personalNotes: "Record fair haul. One of my favourites." },
  { ...records[4], id: "c3", addedDate: "2024-02-20", personalNotes: "Traded for my duplicate Beatles." },
  { ...records[6], id: "c4", addedDate: "2024-03-10", personalNotes: "UK press. Matrix 1/1. Holy grail." },
  { ...records[1], id: "c5", title: "A Love Supreme", artist: "John Coltrane", year: 1965, coverEmoji: "🎺", addedDate: "2024-03-25", personalNotes: "Impulse! orange label. Beautiful." },
  { ...records[0], id: "c6", addedDate: "2024-04-01", personalNotes: "UK Harvest, both inserts. Stunning." },
];

// ─── Feed Posts ────────────────────────────────────────────────────────────────

export const posts: Post[] = [
  { id: "p1", userId: "u2", userName: "vinyl_mark", userAvatar: "#00F5FF", type: "haul", content: "Weekend record fair haul! Five first pressings from the 70s 🎉 Spent $340 but absolutely worth it. The Marvin Gaye alone is worth triple.", emoji: "🛍️", likes: 234, comments: 42, liked: false, saved: false, timestamp: "2h ago", recordTitle: "What's Going On" },
  { id: "p2", userId: "u3", userName: "record_rania", userAvatar: "#7B2FFF", type: "new", content: "Just added Rumours to the collection. Factory sealed! Found it at an estate sale for $8. Sometimes the universe is kind 🙏", emoji: "💿", likes: 312, comments: 67, liked: true, saved: false, timestamp: "4h ago", recordTitle: "Rumours" },
  { id: "p3", userId: "u4", userName: "jazzhead_92", userAvatar: "#FFE600", type: "setup", content: "Finally got the Pro-Ject Debut Carbon EVO set up properly. The difference with the new stylus is night and day. Running through a Rega Brio. Pure bliss 🎵", emoji: "🎵", likes: 189, comments: 28, liked: false, saved: true, timestamp: "6h ago" },
  { id: "p4", userId: "u6", userName: "waxpoetic", userAvatar: "#FF8800", type: "sell", content: "Just listed Illmatic original press on the marketplace. Grab it before it's gone — priced to sell fast 🔥", emoji: "🏷️", likes: 156, comments: 19, liked: false, saved: false, timestamp: "8h ago", recordTitle: "Illmatic" },
  { id: "p5", userId: "u5", userName: "nordic_wax", userAvatar: "#4ADE80", type: "favorite", content: "Rediscovering Kind of Blue this evening. There's something about the way Cannonball plays on Freddie Freeloader that gets me every time. Pure magic.", emoji: "✨", likes: 445, comments: 89, liked: true, saved: true, timestamp: "12h ago", recordTitle: "Kind of Blue" },
  { id: "p6", userId: "u7", userName: "tokyovinyl", userAvatar: "#FF006E", type: "haul", content: "City pop haul from Tokyo Disques! Tatsuro Yamashita, Mariya Takeuchi, Anri. The Japanese pressed vinyl quality is just on another level entirely.", emoji: "🗾", likes: 678, comments: 134, liked: false, saved: false, timestamp: "1d ago" },
  { id: "p7", userId: "u2", userName: "vinyl_mark", userAvatar: "#00F5FF", type: "new", content: "Abbey Road UK Apple press just arrived. Matrix 1/1. This is why I collect. 40 years old and it sounds like it was pressed yesterday.", emoji: "🛣️", likes: 521, comments: 76, liked: false, saved: false, timestamp: "1d ago", recordTitle: "Abbey Road" },
  { id: "p8", userId: "u3", userName: "record_rania", userAvatar: "#7B2FFF", type: "setup", content: "New shelf setup done! 📚 Finally organised by genre. Jazz → Rock → Punk → Electronic. 189 records and growing every week.", emoji: "📚", likes: 267, comments: 44, liked: true, saved: false, timestamp: "2d ago" },
];

// ─── Conversations / Messages ─────────────────────────────────────────────────

export const conversations: Conversation[] = [
  { id: "cv1", userId: "u2", userName: "vinyl_mark", userAvatar: "#00F5FF", lastMessage: "Yeah I can do $80 shipped, let me know!", lastTime: "2h ago", unread: 2, recordTitle: "Abbey Road" },
  { id: "cv2", userId: "u6", userName: "waxpoetic", userAvatar: "#FF8800", lastMessage: "Is the Illmatic still available?", lastTime: "5h ago", unread: 0, recordTitle: "Illmatic" },
  { id: "cv3", userId: "u3", userName: "record_rania", userAvatar: "#7B2FFF", lastMessage: "Thanks! Shipping tomorrow 📦", lastTime: "1d ago", unread: 0, recordTitle: "Blue" },
  { id: "cv4", userId: "u4", userName: "jazzhead_92", userAvatar: "#FFE600", lastMessage: "Would you trade for A Love Supreme?", lastTime: "2d ago", unread: 0, recordTitle: "Kind of Blue" },
];

export const messages: Record<string, Message[]> = {
  cv1: [
    { id: "m1", senderId: "u1", receiverId: "u2", text: "Hey! Is the Abbey Road still available?", timestamp: "10:30 AM", read: true },
    { id: "m2", senderId: "u2", receiverId: "u1", text: "Yes it is! Great pressing, plays flawlessly.", timestamp: "10:35 AM", read: true },
    { id: "m3", senderId: "u1", receiverId: "u2", text: "What's the best price you can do?", timestamp: "10:40 AM", read: true },
    { id: "m4", senderId: "u2", receiverId: "u1", text: "Yeah I can do $80 shipped, let me know!", timestamp: "11:00 AM", read: false },
  ],
  cv2: [
    { id: "m5", senderId: "u1", receiverId: "u6", text: "Is the Illmatic still available?", timestamp: "Yesterday", read: true },
  ],
  cv3: [
    { id: "m6", senderId: "u3", receiverId: "u1", text: "Payment received! Thanks so much.", timestamp: "2d ago", read: true },
    { id: "m7", senderId: "u1", receiverId: "u3", text: "Amazing, can't wait!", timestamp: "2d ago", read: true },
    { id: "m8", senderId: "u3", receiverId: "u1", text: "Thanks! Shipping tomorrow 📦", timestamp: "1d ago", read: true },
  ],
  cv4: [
    { id: "m9", senderId: "u4", receiverId: "u1", text: "Would you trade for A Love Supreme?", timestamp: "2d ago", read: true },
  ],
};

// ─── Stores ───────────────────────────────────────────────────────────────────

export const stores: Store[] = [
  { id: "s1", name: "Amoeba Music", city: "Los Angeles", country: "USA", address: "6200 Hollywood Blvd, Hollywood, CA", rating: 4.9, reviews: 12400, specialty: ["All Genres", "New & Used", "Rarities"], hours: "Mon-Sat 10am-8pm, Sun 11am-7pm", phone: "+1 323-245-6400", website: "amoeba.com", emoji: "🎵", color: "#FF006E", description: "The world's largest independent record store. Over 100,000 titles across every genre.", verified: true },
  { id: "s2", name: "Academy Records", city: "New York", country: "USA", address: "415 W 14th St, New York, NY", rating: 4.8, reviews: 3200, specialty: ["Jazz", "Classical", "Soul"], hours: "Daily 10am-9pm", phone: "+1 212-243-3000", website: "academyrecords.com", emoji: "🎷", color: "#00F5FF", description: "NYC institution for over 30 years. Specialists in jazz and classical with an incredible used selection.", verified: true },
  { id: "s3", name: "Rough Trade NYC", city: "Brooklyn", country: "USA", address: "64 N 9th St, Brooklyn, NY", rating: 4.7, reviews: 2800, specialty: ["Indie", "Alternative", "New Releases"], hours: "Mon-Sat 9am-9pm, Sun 10am-8pm", phone: "+1 718-388-4111", website: "roughtrade.com", emoji: "🎸", color: "#7B2FFF", description: "Sister store to the legendary London original. New releases, indie gems and in-store performances.", verified: true },
  { id: "s4", name: "Grimey's", city: "Nashville", country: "USA", address: "1604 8th Ave S, Nashville, TN", rating: 4.9, reviews: 1900, specialty: ["Americana", "Country", "Rock"], hours: "Mon-Sat 10am-8pm, Sun 12pm-6pm", phone: "+1 615-254-4801", website: "grimeys.com", emoji: "🤠", color: "#FFE600", description: "Nashville's premier independent record store. Americana, country and rock vinyl paradise.", verified: true },
  { id: "s5", name: "Sister Ray", city: "London", country: "UK", address: "75 Berwick St, Soho, London", rating: 4.8, reviews: 4100, specialty: ["Indie", "Electronic", "Jazz"], hours: "Mon-Sat 10am-8pm, Sun 12pm-6pm", phone: "+44 20 7734 3297", website: "sisterray.co.uk", emoji: "🎹", color: "#4ADE80", description: "Soho legend since 1987. Electronic, indie and jazz vinyl specialists in the heart of London.", verified: true },
  { id: "s6", name: "Tokyo Disques", city: "Tokyo", country: "Japan", address: "2-12-5 Shimokitazawa, Setagaya", rating: 4.9, reviews: 890, specialty: ["City Pop", "J-Jazz", "Ambient"], hours: "Wed-Mon 12pm-8pm", phone: "+81 3-3421-0022", website: "tokyodisques.jp", emoji: "🗾", color: "#FF006E", description: "Shimokitazawa's finest. Specialising in Japanese city pop, J-jazz and ambient pressings.", verified: false },
];

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const wishlist: WishlistItem[] = [
  { id: "w1", recordId: "r7", title: "Abbey Road", artist: "The Beatles", targetPrice: 100, currentPrice: 150, priceAlert: true, addedDate: "2024-02-01", available: true },
  { id: "w2", recordId: "r2", title: "Kind of Blue", artist: "Miles Davis", targetPrice: 80, currentPrice: 120, priceAlert: true, addedDate: "2024-02-15", available: true },
  { id: "w3", recordId: "r11", title: "Illmatic", artist: "Nas", targetPrice: 70, currentPrice: 85, priceAlert: false, addedDate: "2024-03-01", available: true },
  { id: "w4", recordId: "r8", title: "Purple Rain", artist: "Prince", targetPrice: 60, currentPrice: 78, priceAlert: true, addedDate: "2024-03-20", available: true },
  { id: "w5", recordId: "r12", title: "Bitches Brew", artist: "Miles Davis", targetPrice: 75, currentPrice: 95, priceAlert: false, addedDate: "2024-04-01", available: false },
];

// ─── Shop Products ─────────────────────────────────────────────────────────────

export const shopProducts: Product[] = [
  { id: "sp1", name: "VHQ Classic Tee", category: "Apparel", price: 35, emoji: "👕", color: "#FF006E", description: "Premium 100% organic cotton. Oversized fit. VHQ logo on chest, tagline on back.", sizes: ["XS","S","M","L","XL","XXL"], inStock: true },
  { id: "sp2", name: "VHQ Tote Bag", category: "Accessories", price: 28, emoji: "👜", color: "#00F5FF", description: "Heavy duty canvas tote. Holds up to 20 records comfortably. VHQ neon print.", inStock: true },
  { id: "sp3", name: "Record Cleaning Kit", category: "Accessories", price: 45, emoji: "✨", color: "#7B2FFF", description: "Professional grade cleaning kit. Fluid, brush and microfibre cloth. Keeps your vinyl pristine.", inStock: true },
  { id: "sp4", name: "VHQ Enamel Pin Set", category: "Accessories", price: 18, emoji: "📌", color: "#FFE600", description: "Set of 4 enamel pins. Vinyl record, needle, speaker and VHQ logo designs.", inStock: true },
  { id: "sp5", name: "VHQ Hoodie", category: "Apparel", price: 65, emoji: "🧥", color: "#FF006E", description: "Heavyweight fleece hoodie. VHQ embroidered logo. Perfect for record fair mornings.", sizes: ["S","M","L","XL","XXL"], inStock: true },
  { id: "sp6", name: "Inner Sleeves Pack", category: "Accessories", price: 22, emoji: "📀", color: "#4ADE80", description: "50 anti-static poly inner sleeves. Protect your records the right way.", inStock: false },
  { id: "sp7", name: "VHQ Snapback", category: "Apparel", price: 38, emoji: "🧢", color: "#00F5FF", description: "Structured 6-panel snapback. Embroidered VHQ logo. One size fits all.", inStock: true },
  { id: "sp8", name: "Outer Sleeves Pack", category: "Accessories", price: 26, emoji: "🗂️", color: "#7B2FFF", description: "50 crystal clear outer sleeves. 3mil thickness. Resealable flap.", inStock: true },
];

// ─── Genres ───────────────────────────────────────────────────────────────────

export const genres = ["All","Rock","Jazz","Hip-Hop","Electronic","Soul","Funk","Punk","Folk","Pop","Classical","Ambient","R&B","Country","Indie","Grunge","Prog Rock","City Pop"];

export const conditions = ["All", "M", "NM", "VG+", "VG", "G"];

export const conditionColor: Record<string, string> = {
  M: "#00F5FF", NM: "#4ADE80", "VG+": "#FFE600", VG: "#FF8800", G: "#FF006E",
};
