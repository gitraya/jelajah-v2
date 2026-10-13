import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { REVIEW_COMMENT_MAX_LENGTH, REVIEW_MAX_RATING } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { formatRating, memberName, reviewsLabel } from "@/lib/adapters";
import { cn, formatDate, getErrorMessage } from "@/lib/utils";

const STAR = "#FF8A4C";

interface Props {
  trip: any;
  /** Re-fetch the trip so rating_avg / reviews_count / my_review update. */
  onChanged: () => unknown;
}

/**
 * Read-only row of 1–5 stars, rounded to the nearest half so a 4.5 average
 * shows four and a half stars rather than five.
 */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round((Number(value) || 0) * 2) / 2;
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${rounded} out of ${REVIEW_MAX_RATING} stars`}
    >
      {Array.from({ length: REVIEW_MAX_RATING }, (_, i) => {
        const fill = Math.max(0, Math.min(1, rounded - i)); // 0, 0.5 or 1
        return (
          <span key={i} className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
            <Star style={{ width: size, height: size, color: "#D5DAE3" }} fill="none" />
            {fill > 0 ? (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star style={{ width: size, height: size, color: STAR }} fill={STAR} />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

/** Clickable 1–5 star picker (radio group semantics). */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: REVIEW_MAX_RATING }, (_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-0.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-transform hover:scale-110"
          >
            <Star
              className="w-7 h-7"
              style={{ color: n <= shown ? STAR : "#D5DAE3" }}
              fill={n <= shown ? STAR : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Trip reviews: summary + distribution, the list, and your own review form.
 * Reviewing is open to signed-in non-owners on public trips or trips they're
 * an accepted member of (the backend enforces the same rule).
 */
export function ReviewsTab({ trip, onChanged }: Props) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { getRequest, postRequest, deleteRequest } = useApi();

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const myReview = trip.my_review as { rating: number; comment: string } | null;
  const isOwner = Boolean(user && trip.owner?.id === user.id);
  const canReview =
    isAuthenticated && !isOwner && (Boolean(trip.is_public) || Boolean(trip.is_member));

  const fetchReviews = useCallback(async () => {
    try {
      const res = await getRequest(`/trips/${trip.id}/reviews/`);
      setReviews(res.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load reviews"));
    } finally {
      setLoading(false);
    }
  }, [trip.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Seed the form from your existing review.
  useEffect(() => {
    setRating(myReview?.rating || 0);
    setComment(myReview?.comment || "");
  }, [myReview?.rating, myReview?.comment]);

  const refresh = async () => {
    await Promise.all([fetchReviews(), onChanged()]);
  };

  const submit = async () => {
    if (!rating) {
      toast.error("Pick a star rating first");
      return;
    }
    setSaving(true);
    try {
      await postRequest(`/trips/${trip.id}/reviews/`, {
        rating,
        comment: comment.trim(),
      });
      toast.success(myReview ? "Review updated" : "Thanks for your review!");
      setEditing(false);
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save your review"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await deleteRequest(`/trips/${trip.id}/reviews/mine/`);
    toast.success("Review deleted");
    setEditing(false);
    await refresh();
  };

  // Distribution from the loaded list; the summary number comes from the trip.
  const count = trip.reviews_count ?? reviews.length;
  const avg = formatRating(trip.rating_avg);
  const buckets = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: reviews.filter((r) => Number(r.rating) === n).length,
  }));
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

  const showForm = canReview && (!myReview || editing);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 md:gap-5">
      {/* Summary + your review */}
      <div className="space-y-4 min-w-0">
        <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <p
                className="text-foreground"
                style={{ fontWeight: 800, fontSize: 40, letterSpacing: "-0.03em", lineHeight: 1 }}
              >
                {avg ?? "–"}
              </p>
            </div>
            <div>
              <Stars value={Number(trip.rating_avg || 0)} size={16} />
              <p className="text-muted-foreground mt-1" style={{ fontSize: 12 }}>
                {count ? reviewsLabel(count) : "No reviews yet"}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {buckets.map((b) => (
              <div key={b.n} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                <span className="w-3 text-muted-foreground text-right">{b.n}</span>
                <Star className="w-3 h-3 shrink-0" style={{ color: STAR }} fill={STAR} />
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(b.count / maxBucket) * 100}%`, background: STAR }}
                  />
                </div>
                <span className="w-6 text-muted-foreground text-right">{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        {showForm ? (
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
            <p className="text-foreground mb-2" style={{ fontWeight: 700, fontSize: 15 }}>
              {myReview ? "Edit your review" : "Rate this trip"}
            </p>
            <StarPicker value={rating} onChange={setRating} />
            <Textarea
              rows={4}
              value={comment}
              maxLength={REVIEW_COMMENT_MAX_LENGTH}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What made this itinerary great (or not)?"
              className="mt-3"
              aria-label="Review comment"
            />
            <p className="text-muted-foreground text-right mt-1" style={{ fontSize: 11 }}>
              {comment.length}/{REVIEW_COMMENT_MAX_LENGTH}
            </p>
            <div className="flex justify-end gap-2 mt-2">
              {editing ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setRating(myReview?.rating || 0);
                    setComment(myReview?.comment || "");
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              ) : null}
              <Button onClick={submit} disabled={saving || !rating}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {myReview ? "Update review" : "Post review"}
              </Button>
            </div>
          </div>
        ) : canReview && myReview ? (
          <div className="bg-secondary border border-primary/20 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-secondary-foreground" style={{ fontWeight: 700, fontSize: 14 }}>
                Your review
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit your review"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-card transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete your review"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <Stars value={myReview.rating} />
            {myReview.comment ? (
              <p className="text-foreground mt-2" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {myReview.comment}
              </p>
            ) : null}
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-4 md:p-5 text-center">
            <p className="text-muted-foreground mb-3" style={{ fontSize: 13 }}>
              Sign in to rate this trip.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/login?redirect=${encodeURIComponent(`/trips/${trip.id}`)}`)
              }
            >
              Sign in
            </Button>
          </div>
        ) : null}
      </div>

      {/* List */}
      <div className="min-w-0">
        {loading ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-14 bg-card border border-border rounded-2xl">
            <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-3 text-2xl">
              ⭐
            </div>
            <p className="text-foreground mb-1" style={{ fontWeight: 700, fontSize: 15 }}>
              No reviews yet
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>
              {canReview ? "Be the first to share how this trip went." : "Reviews from travelers will show up here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const mine = r.user?.id && r.user.id === user?.id;
              return (
                <div
                  key={r.id}
                  className={cn(
                    "bg-card border rounded-2xl p-4",
                    mine ? "border-primary/30" : "border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar person={r.user} className="w-10 h-10 rounded-full" style={{ fontSize: 12 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className="text-foreground truncate min-w-0" style={{ fontWeight: 700, fontSize: 14 }}>
                          {memberName(r.user || {})}
                        </p>
                        {mine ? (
                          <span className="text-primary" style={{ fontSize: 11, fontWeight: 600 }}>
                            You
                          </span>
                        ) : null}
                        <span className="text-muted-foreground ml-auto" style={{ fontSize: 11 }}>
                          {formatDate(r.updated_at || r.created_at)}
                        </span>
                      </div>
                      <Stars value={Number(r.rating)} size={13} />
                      {r.comment ? (
                        <p
                          className="text-foreground mt-1.5 whitespace-pre-wrap break-words"
                          style={{ fontSize: 13, lineHeight: 1.55 }}
                        >
                          {r.comment}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete your review?"
        description="Your rating and comment will be removed from this trip."
        onConfirm={remove}
      />
    </div>
  );
}
