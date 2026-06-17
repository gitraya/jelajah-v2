import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
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

export function DialogDemo() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tripName, setTripName] = useState("");

  const handleCreateTrip = () => {
    if (tripName.trim()) {
      toast.success("Trip created!", {
        description: `"${tripName}" has been added to your trips.`,
      });
      setTripName("");
      setIsDialogOpen(false);
    } else {
      toast.error("Please enter a trip name");
    }
  };

  const handleDeleteTrip = () => {
    toast.success("Trip deleted", {
      description: "Your trip has been permanently removed.",
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Toast Examples Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-lg"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Demo
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Toast & Dialog Examples</DialogTitle>
            <DialogDescription>
              Try different types of notifications and dialogs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">Toast Notifications:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success("Success!", { description: "Your action was successful" })}
                >
                  Success
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.error("Error!", { description: "Something went wrong" })}
                >
                  Error
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info("Info", { description: "Here's some information" })}
                >
                  Info
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.warning("Warning!", { description: "Please be careful" })}
                >
                  Warning
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.loading("Loading...", { description: "Please wait" })}
                >
                  Loading
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast("Custom", {
                    description: "This is a custom toast",
                    action: {
                      label: "Undo",
                      onClick: () => toast.info("Undo clicked!"),
                    },
                  })}
                >
                  With Action
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Dialogs:</p>
              <div className="flex flex-wrap gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      Create Trip Dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Trip</DialogTitle>
                      <DialogDescription>
                        Add a new trip to your collection
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <input
                        type="text"
                        placeholder="Trip name"
                        value={tripName}
                        onChange={(e) => setTripName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={(e) => e.key === "Enter" && handleCreateTrip()}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTrip}>
                        Create Trip
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      Delete Confirmation
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your trip
                        and remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={handleDeleteTrip}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
