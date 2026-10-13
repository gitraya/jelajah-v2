export const IS_DEVELOPMENT = import.meta.env.MODE === "development";

// OAuth client ID from Google Cloud Console. Empty means "Sign in with Google"
// is simply not offered on this environment.
export const GOOGLE_CLIENT_ID: string =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Trips
export const TRIP_MEMBER_ROLES = {
  ORGANIZER: ["ORGANIZER", "Organizer"],
  CO_ORGANIZER: ["CO_ORGANIZER", "Co-Organizer"],
  MEMBER: ["MEMBER", "Member"],
};

// NOTE: MembersContext derives its "accepted" key from the first entry here,
// so ACCEPTED must stay first.
export const TRIP_MEMBER_STATUSES = {
  ACCEPTED: "Accepted",
  PENDING: "Pending",
  DECLINED: "Declined",
  BLOCKED: "Blocked",
};

export const TRIP_STATUSES = {
  PLANNING: "Planning",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const DIFFICULTY_LEVELS = {
  EASY: "Easy",
  MODERATE: "Moderate",
  CHALLENGING: "Challenging",
};

// Itineraries
export const ITINERARY_STATUSES = {
  PLANNED: "Planned",
  VISITED: "Visited",
  SKIPPED: "Skipped",
};

export const ITINERARY_STATUSES_ENUM = {
  PLANNED: "PLANNED",
  VISITED: "VISITED",
  SKIPPED: "SKIPPED",
};

export const ITINERARY_TYPES_ICONS: Record<string, string> = {
  Cultural: "🏛️",
  Nature: "🌳",
  Beach: "🏖️",
  Restaurant: "🍽️",
  Shopping: "🛍️",
  Activity: "🎯",
  Other: "📍",
};

// Expenses
export const EXPENSE_SPLIT_TYPES = [
  { label: "Split Equally", value: "EQUAL" },
  { label: "Custom Amount", value: "CUSTOM" },
  { label: "By Percentage", value: "PERCENTAGE" },
];

// Checklist
export const CHECKLIST_CATEGORIES = {
  PRE_TRIP: "Pre-Trip",
  DURING_TRIP: "During Trip",
  POST_TRIP: "Post-Trip",
};

export const CHECKLIST_PRIORITY = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

// Profile interests (backend validates the same limits on User.interests).
export const INTERESTS_MAX = 6;
export const INTEREST_MAX_LENGTH = 30;
export const INTEREST_SUGGESTIONS = [
  "Beach",
  "Food",
  "City",
  "Culture",
  "Nature",
  "Adventure",
  "Hiking",
  "Budget",
];

// Trip reviews: TripReview.rating is 1–5, comment up to 1000 chars.
export const REVIEW_MAX_RATING = 5;
export const REVIEW_COMMENT_MAX_LENGTH = 1000;

// Direct messages
export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_POLL_MS = 5_000;
export const UNREAD_POLL_MS = 30_000;
