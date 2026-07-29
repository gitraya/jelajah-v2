import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const validator = {
  required: { value: true, message: "Required field" },
  isRequired: (value: any) => ({ value, message: "Required field" }),
  pattern: (pattern: RegExp) => ({ value: pattern, message: `Invalid format` }),
  url: {
    value:
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/,
    message: `Invalid URL format`,
  },
  username: {
    value: /^[a-zA-Z0-9_]{3,30}$/,
    message: `Username must be 3-30 characters long and can only contain letters, numbers, and underscores`,
  },
  password: {
    value: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
    message: `Password must be at least 8 characters long and contain at least one letter, one number, and one special character`,
  },
  email: {
    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
    message: `Invalid email format`,
  },
  phone: {
    value: /^((\+\d{2}|0)(\d{2,3}))[ .-]?\d{1,4}[ .-]?\d{2,4}[ .-]?\d{2,4}/i,
    message: `Invalid phone format. Use + country code (e.g., +62) at the beginning for non-local numbers`,
  },
  min: (min: number) => ({ value: min, message: `Must be at least $${min}` }),
  max: (max: number) => ({ value: max, message: `Must not exceed $${max}` }),
  minAndFree: (min: number) => ({
    value: min,
    message: `Must be at least $${min} or 0 for free`,
  }),
  minLength: (min: number) => ({
    value: min,
    message: `Must contain at least ${min} characters`,
  }),
  maxLength: (max: number) => ({
    value: max,
    message: `Must not exceed ${max} characters`,
  }),
};

export const getErrorMessage = (error: any, defaultMessage?: string) => {
  let errorMessage = defaultMessage || "Something went wrong";

  try {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (
      Array.isArray(error.response?.data) ||
      typeof error.response?.data === "object"
    ) {
      const [field, messages] = Object.entries(error.response.data)[0] as [
        string,
        string[]
      ];
      const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
      errorMessage = `${capitalizedField}: ${
        Array.isArray(messages) ? messages.join(", ") : messages
      }`;
    }
    return errorMessage;
  } catch {
    return error.response?.data?.detail || errorMessage;
  }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString?: string) => {
  if (!dateString) return "Not scheduled";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatDateTime = (dateString?: string) => {
  if (!dateString) return "Not scheduled";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getInitials = (name: string) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export const calculateDuration = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const isOverdue = (dueDate: string, completed: boolean) => {
  if (completed) return false;
  return new Date(dueDate) < new Date();
};

export const validatePassword = (password = "") => {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
};

// Adds the duration_label + "dates" display fields v1 attaches to trips.
export const withTripLabels = <T extends Record<string, any>>(
  trip: T
): T & { duration_label: string; dates: string } => {
  const duration = trip.duration || 0;
  const fmt = (d?: string, withYear = false) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          ...(withYear ? { year: "numeric" } : {}),
        })
      : "";
  return {
    ...trip,
    duration_label: `${duration} ${duration > 1 ? "days" : "day"}`,
    dates: `${fmt(trip.start_date)}-${fmt(trip.end_date, true)}`,
  };
};
