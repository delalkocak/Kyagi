export const colors = {
  // Backgrounds
  bg: "#F4EDD8",
  card: "#FEFCF6",
  bgInput: "rgba(122, 31, 46, 0.03)",
  // Primary
  accent: "#7A1F2E",       // wine red — primary CTA, active nav, "you" badge
  cobalt: "#3B5EBF",       // AI/system color
  redOrange: "#D93D12",    // hearts active, sparingly
  electricIndigo: "#6C6AE8", // vibrant purple-indigo accent
  // Supporting
  amberGold: "#C99A2E",
  blueGray: "#8090AC",     // inactive nav, secondary text
  blueGrayLight: "#B8C4D8", // inactive dots, subtle borders
  // Tinted neutrals
  softRose: "#EACED0",     // hearted card tint, new indicators
  palePeriwinkle: "#D4DAE8", // calendar/schedule, info badges
  // Text
  text: "#2C2E3A",         // navy-charcoal
  textMuted: "#5A5A6A",    // secondary text
  textTertiary: "#8A8A96", // timestamps, placeholders
  // Borders & surfaces
  border: "rgba(122, 31, 46, 0.08)",
  warmGray: "#F4EDD8",     // reuse bg for subtle surfaces, or use bgInput
  // Legacy aliases (keeping for compatibility, mapped to new values)
  maroon: "#7A1F2E",
  cream: "#F4EDD8",
  ivory: "#FEFCF6",
  periwinkle: "#3B5EBF",
  crimson: "#D93D12",
  amber: "#C99A2E",
};

export interface Prompt {
  id: string;
  icon: string;
  label: string;
  color: string;
}

export const RECOMMENDATION_CATEGORIES = [
  { key: "reading", emoji: "📚", label: "books / articles" },
  { key: "dining", emoji: "🍽️", label: "restaurants / food" },
  { key: "watching", emoji: "🎬", label: "film / TV" },
  { key: "listening", emoji: "🎵", label: "music / podcasts" },
  { key: "culture", emoji: "🎨", label: "arts / culture" },
] as const;

export type RecommendationCategory = typeof RECOMMENDATION_CATEGORIES[number]["key"];

export const CATEGORY_DISPLAY: Record<string, { emoji: string; label: string }> = {
  reading: { emoji: "📚", label: "books / articles" },
  dining: { emoji: "🍽️", label: "restaurants / food" },
  watching: { emoji: "🎬", label: "film / TV" },
  listening: { emoji: "🎵", label: "music / podcasts" },
  culture: { emoji: "🎨", label: "arts / culture" },
  // Legacy mappings for old posts
  book: { emoji: "📚", label: "book rec" },
  restaurant: { emoji: "🍽️", label: "restaurant rec" },
  art: { emoji: "🎨", label: "art rec" },
  movie: { emoji: "🎬", label: "movie/show rec" },
  music: { emoji: "🎵", label: "music rec" },
  activity: { emoji: "🏃", label: "activity rec" },
  other: { emoji: "✨", label: "rec" },
};

export const PROMPTS: Prompt[] = [
  { id: "recommend", icon: "arrow", label: "here's a rec...", color: "#D93D12" },
  { id: "grateful", icon: "flower", label: "i'm grateful for...", color: "#7A1F2E" },
  { id: "question", icon: "quest", label: "a question on my mind...", color: "#3B5EBF" },
  { id: "learned", icon: "sparkle", label: "today i learned", color: "#C99A2E" },
  { id: "surprised", icon: "sparkle", label: "a rabbit hole i went down...", color: "#C99A2E" },
  { id: "thinking", icon: "quest", label: "my latest hot take", color: "#3B5EBF" },
  { id: "changed_mind", icon: "quest", label: "i changed my mind about...", color: "#3B5EBF" },
  { id: "craving", icon: "arrow", label: "currently obsessed with...", color: "#D93D12" },
  { id: "highlight", icon: "sparkle", label: "a highlight of my day", color: "#7A1F2E" },
  { id: "looking_forward", icon: "sparkle", label: "looking forward to...", color: "#C99A2E" },
  { id: "laughed", icon: "arrow", label: "this made me laugh...", color: "#D93D12" },
  { id: "with_friend", icon: "flower", label: "who wants to...", color: "#7A1F2E" },
  { id: "overheard", icon: "quest", label: "overheard...", color: "#3B5EBF" },
  { id: "remember", icon: "flower", label: "note to self...", color: "#7A1F2E" },
  { id: "custom", icon: "sparkle", label: "custom", color: "#5A5A6A" },
  { id: "no_context", icon: "arrow", label: "no context", color: "#D93D12" },
  { id: "only_20", icon: "flower", label: "something i'd only tell 20 people", color: "#7A1F2E" },
];

export interface PostMedia {
  type: "photo" | "video" | "music" | "article";
  url?: string;
  thumbnail?: string;
  duration?: string;
  artist?: string;
  title?: string;
  cover?: string;
  source?: string;
}

export interface PostItem {
  prompt: Prompt;
  text: string;
  media: PostMedia | null;
}

export interface Comment {
  from: string;
  avatar: string;
  color: string;
  text: string;
  itemIndex: number;
  isReply?: boolean;
}

export interface Post {
  id: number;
  name: string;
  avatar: string;
  color: string;
  date: string;
  time: string;
  items: PostItem[];
  comments: Comment[];
  hearts: number;
}

export const SAMPLE_POSTS: Post[] = [
  {
    id: 1, name: "Sonal", avatar: "S", color: "#3B5EBF", date: "today", time: "8:42 am",
    items: [
      { prompt: PROMPTS[0], text: "morning light coming through the kitchen window while making chai", media: { type: "photo", url: "https://images.unsplash.com/photo-1495774856032-8b90bbb32b32?w=600&h=400&fit=crop" } },
      { prompt: PROMPTS[4], text: "halfway through 'the goldfinch' and it's consuming my every free moment", media: null },
      { prompt: PROMPTS[1], text: "rooftop sunset with the whole crew last night", media: { type: "photo", url: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=600&h=400&fit=crop" } },
    ],
    comments: [{ from: "maya", avatar: "M", color: "#3B5EBF", text: "that sunset!! i miss you guys", itemIndex: 2 }],
    hearts: 3,
  },
  {
    id: 2, name: "Maya", avatar: "M", color: "#3B5EBF", date: "today", time: "7:15 am",
    items: [
      { prompt: PROMPTS[4], text: "this japanese breakfast album is everything right now", media: { type: "music", artist: "Japanese Breakfast", title: "Jubilee", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&h=120&fit=crop" } },
      { prompt: PROMPTS[0], text: "my mom called just to say she was proud of me, completely out of nowhere", media: null },
      { prompt: PROMPTS[1], text: "morning run through the fog", media: { type: "video", thumbnail: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop", duration: "0:12" } },
    ],
    comments: [], hearts: 5,
  },
  {
    id: 3, name: "Jordan", avatar: "J", color: "#3B5EBF", date: "yesterday", time: "9:30 pm",
    items: [
      { prompt: PROMPTS[3], text: "in negotiation class today: the best deals leave both sides feeling slightly uncomfortable. sitting with that one.", media: null },
      { prompt: PROMPTS[1], text: "this tiny ramen spot on 2nd ave, nakamura. the tonkotsu is unreal.", media: { type: "photo", url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop" } },
      { prompt: PROMPTS[2], text: "whether we're actually more connected than ever or just more observed", media: null },
    ],
    comments: [
      { from: "leo", avatar: "L", color: "#2C2E3A", text: "need that ramen spot address asap", itemIndex: 1 },
      { from: "jordan", avatar: "J", color: "#3B5EBF", text: "143 2nd ave. go at lunch, no wait.", itemIndex: 1, isReply: true },
    ],
    hearts: 4,
  },
  {
    id: 4, name: "Priya", avatar: "P", color: "#C99A2E", date: "2 days ago", time: "6:00 pm",
    items: [
      { prompt: PROMPTS[1], text: "cooked my grandmother's dal recipe and it actually turned out right for the first time", media: { type: "photo", url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop" } },
      { prompt: PROMPTS[3], text: "a student asked a question in my section that made me think differently", media: null },
      { prompt: PROMPTS[4], text: "finally started 'demon copperhead'. the voice is incredible.", media: null },
    ],
    comments: [{ from: "sonal", avatar: "S", color: "#7A1F2E", text: "can you send me the dal recipe?", itemIndex: 0 }],
    hearts: 6,
  },
  {
    id: 5, name: "Leo", avatar: "L", color: "#2C2E3A", date: "3 days ago", time: "11:20 am",
    items: [
      { prompt: PROMPTS[0], text: "watched my daughter figure out how to tie her shoes by herself. she looked up at me like she'd conquered the world.", media: { type: "video", thumbnail: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=400&fit=crop", duration: "0:08" } },
      { prompt: PROMPTS[1], text: "this article on why walking meetings are better. i sent it to my whole team.", media: { type: "article", title: "The Case for Walking Meetings", source: "hbr.org" } },
      { prompt: PROMPTS[1], text: "found this incredible mural on my new commute route", media: { type: "photo", url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=400&fit=crop" } },
    ],
    comments: [], hearts: 8,
  },
];

export const ARCHIVE_MONTHS = [
  { month: "March 2026", count: 8, highlight: "Morning chai, rooftop sunsets, grandmother's recipes" },
  { month: "February 2026", count: 24, highlight: "Winter walks, new book discoveries, cooking experiments" },
  { month: "January 2026", count: 21, highlight: "New year intentions, first snowfall, reconnecting" },
  { month: "December 2025", count: 18, highlight: "Holiday gatherings, year in review, cozy evenings" },
];
