# Modals, Toasts & Dialogs Guide

This document explains how to use modals, toasts, and dialogs in the Jelajah travel app.

## 📋 Table of Contents

1. [Toast Notifications](#toast-notifications)
2. [Dialogs (Modals)](#dialogs-modals)
3. [Alert Dialogs](#alert-dialogs)
4. [Practical Examples](#practical-examples)
5. [Best Practices](#best-practices)

---

## 🔔 Toast Notifications

Toast notifications provide quick, non-blocking feedback to users. They appear at the bottom of the screen and auto-dismiss.

### Setup

The `Toaster` component is already added to `App.tsx`. No additional setup needed!

### Basic Usage

```tsx
import { toast } from "sonner";

// Success toast
toast.success("Trip saved!");

// Error toast
toast.error("Failed to load trip");

// Info toast
toast.info("New buddy request received");

// Warning toast
toast.warning("Your session will expire soon");

// Loading toast
toast.loading("Searching for flights...");
```

### With Description

```tsx
toast.success("Booking confirmed!", {
  description: "Check your email for confirmation details.",
});
```

### With Action Button

```tsx
toast("Trip removed", {
  description: "Osaka Foodie has been removed from your trips.",
  action: {
    label: "Undo",
    onClick: () => toast.success("Trip restored!"),
  },
});
```

### Custom Duration

```tsx
toast.success("Quick notification!", {
  duration: 2000, // 2 seconds (default is 4000)
});
```

### Promise Toast (Async Operations)

```tsx
const promise = new Promise((resolve) =>
  setTimeout(() => resolve({ name: "Bali Adventure" }), 2000)
);

toast.promise(promise, {
  loading: "Creating trip...",
  success: (data) => `${data.name} created successfully!`,
  error: "Failed to create trip",
});
```

---

## 💬 Dialogs (Modals)

Dialogs are modal windows that require user interaction. Use them for forms, detailed information, or multi-step processes.

### Import Components

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Button } from "./components/ui/button";
```

### Basic Dialog

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Plan Your Trip</DialogTitle>
      <DialogDescription>
        Tell us about your dream destination
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Your content here */}
    </div>
  </DialogContent>
</Dialog>
```

### Controlled Dialog (with State)

```tsx
const [isOpen, setIsOpen] = useState(false);
const [tripName, setTripName] = useState("");

const handleSubmit = () => {
  toast.success(`Trip "${tripName}" created!`);
  setIsOpen(false);
  setTripName("");
};

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Create Trip</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New Trip</DialogTitle>
      <DialogDescription>Enter your trip details</DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <input
        type="text"
        value={tripName}
        onChange={(e) => setTripName(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
        placeholder="Trip name"
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit}>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## ⚠️ Alert Dialogs

Alert dialogs are used for important confirmations, especially destructive actions like deleting data.

### Import Components

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog";
```

### Basic Alert Dialog

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Trip</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your trip
        and all associated data.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-white hover:bg-destructive/90"
        onClick={() => toast.success("Trip deleted")}
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Controlled Alert Dialog

```tsx
const [deleteDialog, setDeleteDialog] = useState({ open: false, tripId: null });

const handleDelete = () => {
  toast.success("Trip deleted");
  setDeleteDialog({ open: false, tripId: null });
};

<AlertDialog 
  open={deleteDialog.open} 
  onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete trip?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently remove your trip.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 💡 Practical Examples

### Trip Management

#### Save Trip
```tsx
toast.success("Trip saved!", {
  description: "Your trip has been saved to your collection.",
});
```

#### Edit Trip
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Edit Trip</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Trip Details</DialogTitle>
    </DialogHeader>
    {/* Form fields */}
    <DialogFooter>
      <Button onClick={() => toast.success("Trip updated!")}>
        Save Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Delete Trip
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Trip</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete "Osaka Foodie"?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently remove this trip.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => toast.success("Trip deleted")}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Buddy System

```tsx
// Send buddy request
toast.success("Buddy request sent!", {
  description: "Sarah will receive your connection request.",
});

// Receive buddy request with action
toast.info("New buddy request", {
  description: "John wants to connect with you.",
  action: {
    label: "View",
    onClick: () => {/* Navigate to profile */},
  },
});
```

### Booking Actions

```tsx
// Booking confirmation with promise
const bookHotel = async () => {
  const promise = fetch('/api/book-hotel', { method: 'POST' });
  
  toast.promise(promise, {
    loading: "Processing booking...",
    success: "Booking confirmed!",
    error: "Booking failed. Please try again.",
  });
};
```

---

## ✅ Best Practices

### When to Use What

#### Use **Toasts** for:
- ✅ Success/error feedback
- ✅ Non-critical information
- ✅ Temporary notifications
- ✅ Quick confirmations
- ✅ Background process updates

#### Use **Dialogs** for:
- ✅ Forms and data input
- ✅ Detailed information
- ✅ Multi-step processes
- ✅ Content that needs user focus
- ✅ Editing existing data

#### Use **Alert Dialogs** for:
- ✅ Destructive actions (delete, cancel)
- ✅ Important confirmations
- ✅ Critical warnings
- ✅ Actions that cannot be undone

### Toast Tips
- Keep messages concise and actionable
- Use appropriate types (success, error, warning, info)
- Provide undo actions when possible
- Use promise toasts for async operations
- Don't overuse toasts - they can be distracting

### Dialog Tips
- Use controlled dialogs when managing form state
- Clear form data when dialog closes
- Provide clear action labels
- Handle keyboard interactions (Enter to submit, Escape to close)
- Make dialogs accessible with proper titles and descriptions

### Alert Dialog Tips
- Always explain the consequences clearly
- Use for destructive actions only
- Provide an easy way to cancel
- Make the primary action stand out visually
- Never use for non-critical confirmations

---

## 🎨 Styling

All components support custom styling via the `className` prop:

```tsx
<DialogContent className="sm:max-w-2xl">
  {/* Wider dialog */}
</DialogContent>

<AlertDialogAction className="bg-destructive text-white">
  Delete
</AlertDialogAction>
```

---

## 📝 Real Implementation

Check these files for working examples:
- **Demo Component**: `src/app/components/DialogDemo.tsx`
- **Practical Usage**: `src/app/components/DesktopTrips.tsx`
- **Comprehensive Examples**: `src/app/components/ModalsToastsGuide.tsx`

---

## 🚀 Quick Reference

```tsx
// Toast
import { toast } from "sonner";
toast.success("Message");

// Dialog
import { Dialog, DialogContent, DialogTrigger } from "./components/ui/dialog";
<Dialog><DialogTrigger /><DialogContent /></Dialog>

// Alert Dialog
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from "./components/ui/alert-dialog";
<AlertDialog><AlertDialogTrigger /><AlertDialogContent /></AlertDialog>
```

---

Happy coding! 🎉
