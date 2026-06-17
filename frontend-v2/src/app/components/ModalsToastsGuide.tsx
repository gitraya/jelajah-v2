/**
 * MODALS, TOASTS, AND DIALOGS USAGE GUIDE
 * ========================================
 *
 * This file provides examples and best practices for using modals, toasts,
 * and dialogs in the Jelajah travel app.
 */

import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
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
} from "./ui/alert-dialog";

/**
 * ===================
 * 1. TOAST NOTIFICATIONS
 * ===================
 *
 * Use toasts for quick, non-blocking feedback to user actions.
 * The Toaster component must be included in App.tsx (already done).
 */

// Basic toast examples
export function ToastExamples() {
  return (
    <div className="space-y-2">
      <h3>Toast Examples</h3>

      {/* Success toast */}
      <Button onClick={() => toast.success("Trip saved successfully!")}>
        Success Toast
      </Button>

      {/* Error toast */}
      <Button onClick={() => toast.error("Failed to load trip details")}>
        Error Toast
      </Button>

      {/* Info toast */}
      <Button onClick={() => toast.info("New buddy request received")}>
        Info Toast
      </Button>

      {/* Warning toast */}
      <Button onClick={() => toast.warning("Your session will expire soon")}>
        Warning Toast
      </Button>

      {/* Loading toast */}
      <Button onClick={() => toast.loading("Searching for flights...")}>
        Loading Toast
      </Button>

      {/* Toast with description */}
      <Button
        onClick={() =>
          toast.success("Booking confirmed!", {
            description: "Check your email for confirmation details.",
          })
        }
      >
        Toast with Description
      </Button>

      {/* Toast with action button */}
      <Button
        onClick={() =>
          toast("Trip removed", {
            description: "Osaka Foodie has been removed from your trips.",
            action: {
              label: "Undo",
              onClick: () => toast.success("Trip restored!"),
            },
          })
        }
      >
        Toast with Action
      </Button>

      {/* Toast with custom duration */}
      <Button
        onClick={() =>
          toast.success("Quick notification!", {
            duration: 2000, // 2 seconds
          })
        }
      >
        Short Duration Toast
      </Button>

      {/* Promise toast (for async operations) */}
      <Button
        onClick={() => {
          const promise = new Promise((resolve) =>
            setTimeout(() => resolve({ name: "Bali Adventure" }), 2000)
          );

          toast.promise(promise, {
            loading: "Creating trip...",
            success: (data: any) => `${data.name} created successfully!`,
            error: "Failed to create trip",
          });
        }}
      >
        Promise Toast
      </Button>
    </div>
  );
}

/**
 * ===================
 * 2. DIALOG (MODALS)
 * ===================
 *
 * Use dialogs for capturing user input or displaying detailed information
 * that requires user interaction.
 */

export function DialogExamples() {
  // Controlled dialog example
  const [isOpen, setIsOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({ destination: "", budget: "" });

  const handleSubmit = () => {
    toast.success("Trip created!", {
      description: `${formData.destination} - IDR ${formData.budget}`,
    });
    setIsOpen(false);
    setFormData({ destination: "", budget: "" });
  };

  return (
    <div className="space-y-2">
      <h3>Dialog Examples</h3>

      {/* Basic dialog with trigger */}
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Basic Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan Your Trip</DialogTitle>
            <DialogDescription>
              Tell us about your dream destination
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>Dialog content goes here...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Controlled dialog with form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>Create New Trip</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Trip</DialogTitle>
            <DialogDescription>
              Enter your trip details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Destination</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg mt-1"
                placeholder="e.g., Bali"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Budget (IDR)</label>
              <input
                type="text"
                value={formData.budget}
                onChange={(e) =>
                  setFormData({ ...formData, budget: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg mt-1"
                placeholder="e.g., 5000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * ===================
 * 3. ALERT DIALOG
 * ===================
 *
 * Use alert dialogs for important confirmations or warnings that require
 * explicit user action (typically destructive actions).
 */

export function AlertDialogExamples() {
  const handleDelete = () => {
    toast.success("Trip deleted", {
      description: "The trip has been permanently removed.",
    });
  };

  const handleCancel = () => {
    toast.success("Booking cancelled", {
      description: "Your booking has been cancelled successfully.",
    });
  };

  return (
    <div className="space-y-2">
      <h3>Alert Dialog Examples</h3>

      {/* Delete confirmation */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Delete Trip</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your trip
              "Osaka Foodie" and all associated data including bookings and notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel booking confirmation */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">Cancel Booking</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your booking for "Grand Hyatt Bali"?
              You may be charged a cancellation fee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * ===================
 * 4. PRACTICAL EXAMPLES FOR JELAJAH APP
 * ===================
 */

export function JelajahPracticalExamples() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Jelajah App Use Cases</h2>

      {/* Trip Management */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Trip Management</h3>

        {/* Save trip - Use toast */}
        <Button
          onClick={() =>
            toast.success("Trip saved!", {
              description: "Your trip has been saved to your collection.",
            })
          }
        >
          Save Trip (Toast)
        </Button>

        {/* Delete trip - Use alert dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Trip (Alert)</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete trip?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove "Bali Adventure" from your trips.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white"
                onClick={() => toast.success("Trip deleted")}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit trip - Use dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Edit Trip (Dialog)</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Trip Details</DialogTitle>
              <DialogDescription>
                Update your trip information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <input
                type="text"
                defaultValue="Bali Adventure"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <DialogFooter>
              <Button onClick={() => toast.success("Trip updated!")}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Buddy System */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Buddy System</h3>

        <Button
          onClick={() =>
            toast.success("Buddy request sent!", {
              description: "Sarah will receive your connection request.",
            })
          }
        >
          Send Buddy Request (Toast)
        </Button>

        <Button
          onClick={() =>
            toast.info("New buddy request", {
              description: "John wants to connect with you.",
              action: {
                label: "View",
                onClick: () => toast.success("Opening profile..."),
              },
            })
          }
        >
          Receive Buddy Request (Toast with Action)
        </Button>
      </div>

      {/* Booking Actions */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Bookings</h3>

        <Button
          onClick={() => {
            const promise = new Promise((resolve) =>
              setTimeout(() => resolve({ hotel: "Grand Hyatt" }), 2000)
            );

            toast.promise(promise, {
              loading: "Processing booking...",
              success: "Booking confirmed!",
              error: "Booking failed",
            });
          }}
        >
          Book Hotel (Promise Toast)
        </Button>
      </div>
    </div>
  );
}

/**
 * ===================
 * BEST PRACTICES
 * ===================
 *
 * 1. TOASTS - Use for:
 *    - Success/error feedback
 *    - Non-critical information
 *    - Temporary notifications
 *    - Quick confirmations
 *
 * 2. DIALOGS - Use for:
 *    - Forms and data input
 *    - Detailed information
 *    - Multi-step processes
 *    - Content that needs focus
 *
 * 3. ALERT DIALOGS - Use for:
 *    - Destructive actions (delete, cancel)
 *    - Important confirmations
 *    - Critical warnings
 *    - Actions that can't be undone
 *
 * TIPS:
 * - Keep toast messages concise and actionable
 * - Use appropriate toast types (success, error, warning, info)
 * - Provide undo actions when possible
 * - Use controlled dialogs when you need to manage state
 * - Always provide clear action labels in alert dialogs
 * - Make dialogs accessible with proper descriptions
 */

import React from "react";
