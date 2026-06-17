export const IS_DEVELOPMENT = import.meta.env.MODE === "development";

// Trips
export const TRIP_MEMBER_ROLES = {
  ORGANIZER: ["ORGANIZER", "Organizer"],
  CO_ORGANIZER: ["CO_ORGANIZER", "Co-Organizer"],
  MEMBER: ["MEMBER", "Member"],
};

export const TRIP_MEMBER_STATUSES = {
  ACCEPTED: "Accepted",
  PENDING: "Pending",
  DECLINED: "Declined",
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
