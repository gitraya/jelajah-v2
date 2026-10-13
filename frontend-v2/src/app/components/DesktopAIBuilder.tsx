import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { TripFormModal } from "@/components/modals/TripFormModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTrips } from "@/contexts/TripsContext";
import { useApi } from "@/hooks/useApi";
import {
  formatDateRange,
  formatDayLabel,
  formatRpShort,
  stopIcon,
  stopPrice,
} from "@/lib/adapters";
import { getErrorMessage } from "@/lib/utils";
import { useIsMobile } from "./ui/use-mobile";

interface Props {
  /** The prompt from Plan home; empty shows a "where to?" prompt instead. */
  initialQuery: string;
  onSave: (trip: any) => void;
}

/* Shapes of POST /planner/itinerary/ (see the planner API contract). */
type DraftStop = {
  time: string; // "HH:MM"
  name: string;
  type: string; // ItineraryType name
  description: string;
  address: string;
  estimated_time: string;
  cost: number | null; // IDR per person, 0 = free
  booking_url: string;
};
type DraftDay = { day: number; title: string; date: string; stops: DraftStop[] };
type Draft = {
  title: string;
  destination: string;
  country_flag: string;
  description: string;
  start_date: string;
  end_date: string;
  travelers: number;
  difficulty: string;
  days: DraftDay[];
};
type ChatMessage = { role: "user" | "assistant"; content: string };
type Status = "idle" | "loading" | "error" | "unconfigured";

const blankStop = (): DraftStop => ({
  time: "",
  name: "",
  type: "Other",
  description: "",
  address: "",
  estimated_time: "",
  cost: null,
  booking_url: "",
});

const suggestions = [
  "5 days in Osaka with friends, food-focused, mid budget",
  "Relaxed long weekend in Bali for 2",
  "A week backpacking Vietnam on a budget",
];

const stopsOf = (draft: Draft | null) =>
  (draft?.days || []).reduce((n, d) => n + (d.stops || []).length, 0);

const perPersonOf = (draft: Draft | null) =>
  (draft?.days || []).reduce(
    (sum, d) =>
      sum + (d.stops || []).reduce((s, st) => s + (Number(st.cost) || 0), 0),
    0
  );

export function DesktopAIBuilder({ initialQuery, onSave }: Props) {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { createTrip, uploadTripCover, removeTripCover, fetchMyTrips } =
    useTrips();
  const { postRequest } = useApi();

  const [formOpen, setFormOpen] = useState(false);
  /** Confirmed history: alternating user/assistant turns the API has seen. */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** The user turn in flight (or that failed and can be retried). */
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [input, setInput] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Mobile only: the chat (with inline draft) or the full editable canvas. */
  const [mobileView, setMobileView] = useState<"chat" | "itinerary">("chat");
  const isMobile = useIsMobile();
  const startedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loading = status === "loading";

  const goToLogin = (prompt = initialQuery) => {
    const back = prompt ? `/ai-builder?q=${encodeURIComponent(prompt)}` : "/ai-builder";
    navigate(`/login?redirect=${encodeURIComponent(back)}`);
  };

  /** Shared error handling for both planner endpoints. */
  const handleApiError = (error: any, prompt: string, fallback: string) => {
    const code = error?.response?.status;
    if (code === 503) {
      setStatus("unconfigured");
      return;
    }
    if (code === 401) {
      goToLogin(prompt);
      return;
    }
    const message = getErrorMessage(error, fallback);
    setErrorMsg(message);
    setStatus("error");
    toast.error(fallback, { description: message });
  };

  const ask = async (text: string) => {
    if (!isAuthenticated) {
      goToLogin(text);
      return;
    }
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setPending(text);
    setStatus("loading");
    setErrorMsg("");
    try {
      const response = await postRequest("/planner/itinerary/", {
        messages: history,
        draft,
      });
      const { reply, draft: next } = response.data || {};
      setMessages([...history, { role: "assistant", content: reply || "" }]);
      if (next) setDraft(next);
      setPending(null);
      setStatus("idle");
    } catch (error) {
      handleApiError(error, text, "The AI planner couldn't answer");
    }
  };

  // Kick off with the Plan-home prompt once auth is known. The ref keeps
  // StrictMode's double effect run from sending it twice.
  useEffect(() => {
    if (authLoading || startedRef.current || !initialQuery.trim()) return;
    startedRef.current = true;
    ask(initialQuery.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, initialQuery]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending, loading, mobileView]);

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading || status === "unconfigured") return;
    setInput("");
    ask(text);
  };

  const retry = () => pending && ask(pending);

  const startManualPlanning = () => {
    if (!isAuthenticated) {
      goToLogin();
      return;
    }
    setFormOpen(true);
  };

  /* ---- local draft edits (kept when saving) ---- */
  const updateDays = (fn: (days: DraftDay[]) => DraftDay[]) =>
    setDraft((d) => (d ? { ...d, days: fn(d.days || []) } : d));

  const updateStop = (dayIdx: number, stopIdx: number, patch: Partial<DraftStop>) =>
    updateDays((days) =>
      days.map((day, i) =>
        i !== dayIdx
          ? day
          : {
              ...day,
              stops: day.stops.map((s, j) => (j === stopIdx ? { ...s, ...patch } : s)),
            }
      )
    );

  const removeStop = (dayIdx: number, stopIdx: number) =>
    updateDays((days) =>
      days.map((day, i) =>
        i !== dayIdx ? day : { ...day, stops: day.stops.filter((_, j) => j !== stopIdx) }
      )
    );

  const addStop = (dayIdx: number) => {
    updateDays((days) =>
      days.map((day, i) =>
        i !== dayIdx ? day : { ...day, stops: [...(day.stops || []), blankStop()] }
      )
    );
    setEditMode(true);
  };

  const saveTrip = async () => {
    if (!draft || saving) return;
    if (!isAuthenticated) {
      goToLogin();
      return;
    }
    // Blank stops added but never filled in aren't worth saving.
    const cleaned: Draft = {
      ...draft,
      days: draft.days.map((day) => ({
        ...day,
        stops: day.stops.filter((s) => s.name.trim()),
      })),
    };
    setSaving(true);
    try {
      const response = await postRequest("/planner/itinerary/save/", {
        draft: cleaned,
      });
      const trip = response.data;
      toast.success(`${trip?.title || draft.title} saved!`, {
        description: "Your itinerary is ready to tweak and share.",
      });
      fetchMyTrips();
      onSave(trip);
    } catch (error) {
      const code = (error as any)?.response?.status;
      if (code === 503) setStatus("unconfigured");
      else if (code === 401) goToLogin();
      else toast.error(getErrorMessage(error, "Could not save this trip"));
    } finally {
      setSaving(false);
    }
  };

  const travelers = Math.max(1, Number(draft?.travelers) || 1);
  const perPerson = perPersonOf(draft);
  const headerTitle = draft
    ? `${draft.title}${draft.country_flag ? ` ${draft.country_flag}` : ""}`
    : "New trip";
  const headerSub = draft
    ? [
        formatDateRange(draft.start_date, draft.end_date),
        `${travelers} ${travelers === 1 ? "traveler" : "travelers"}`,
        "draft by AI",
      ]
        .filter(Boolean)
        .join(" · ")
    : loading
    ? "Jelajah AI is drafting your itinerary…"
    : "Describe your trip and Jelajah AI will draft it";

  const unconfiguredBanner =
    status === "unconfigured" ? (
      <div className="mx-4 md:mx-8 mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900 flex flex-col sm:flex-row sm:items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div className="flex-1">
          <p style={{ fontWeight: 700, fontSize: 14 }}>
            AI planner isn't configured on this server
          </p>
          <p style={{ fontSize: 13 }}>
            You can still create the trip yourself and add stops from the trip page.
          </p>
        </div>
        <button
          type="button"
          onClick={startManualPlanning}
          className="bg-primary text-white rounded-xl px-4 py-2 hover:bg-[#13a058] transition-colors shrink-0"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          Create trip manually
        </button>
      </div>
    ) : null;

  const canvasContent =
    draft ? (
      <>
        {/* Summary strip */}
        <div className="mx-4 md:mx-8 mt-6 bg-secondary rounded-2xl px-4 md:px-6 py-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Days", value: (draft.days || []).length },
            { label: "Stops", value: stopsOf(draft) },
            { label: "Per person", value: formatRpShort(perPerson) },
            { label: "Group total", value: formatRpShort(perPerson * travelers) },
          ].map((s) => (
            <div key={s.label}>
              <p
                className="text-secondary-foreground"
                style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em" }}
              >
                {s.value}
              </p>
              <p
                className="text-secondary-foreground/70"
                style={{ fontSize: 12, fontWeight: 500 }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Itinerary */}
        <div className={`px-4 md:px-8 py-6 space-y-7 ${loading ? "opacity-60" : ""}`}>
          {(draft.days || []).map((day, dayIdx) => (
            <section key={`${day.day}-${dayIdx}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <span className="text-white" style={{ fontWeight: 800, fontSize: 14 }}>
                    {day.day || dayIdx + 1}
                  </span>
                </div>
                <div>
                  <h2 className="text-foreground" style={{ fontWeight: 700, fontSize: 15 }}>
                    {day.title || `Day ${day.day || dayIdx + 1}`}
                  </h2>
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                    {formatDayLabel(day.date)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 ml-0 sm:ml-11">
                {(day.stops || []).map((stop, stopIdx) => (
                  <StopCard
                    key={stopIdx}
                    stop={stop}
                    editing={editMode}
                    onChange={(patch) => updateStop(dayIdx, stopIdx, patch)}
                    onRemove={() => removeStop(dayIdx, stopIdx)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => addStop(dayIdx)}
                  className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                  style={{ fontSize: 13 }}
                >
                  <Plus className="w-4 h-4" />
                  Add a stop to day {day.day || dayIdx + 1}
                </button>
              </div>
            </section>
          ))}
        </div>
      </>
    ) : loading ? (
      <CanvasSkeleton />
    ) : status !== "unconfigured" ? (
      <div className="px-4 md:px-8 py-16 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-3xl">
          🗺️
        </div>
        <p className="text-foreground mb-2" style={{ fontWeight: 700, fontSize: 18 }}>
          Where do you want to go?
        </p>
        <p className="text-muted-foreground mb-5 max-w-md" style={{ fontSize: 14 }}>
          Tell Jelajah AI your destination, dates, and travel crew in the chat —
          or start with one of these.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="bg-card border border-border rounded-full px-3.5 py-1.5 hover:border-primary hover:bg-secondary transition-all text-foreground"
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const statusTone = status === "unconfigured" || status === "error";
  const statusLabel = loading
    ? "Building your trip"
    : status === "unconfigured"
    ? "Unavailable"
    : status === "error"
    ? "Something went wrong"
    : draft
    ? "Draft ready"
    : "Ready to plan";

  const tripForm = (
    <TripFormModal
      open={formOpen}
      onOpenChange={setFormOpen}
      onSave={createTrip}
      onCoverUpload={uploadTripCover}
      onCoverRemove={removeTripCover}
      onSaved={onSave}
    />
  );

  if (isMobile) {
    const lastAiIdx = messages.map((m) => m.role).lastIndexOf("assistant");
    const inlineDraft = draft ? (
      <div className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
        {(draft.days || []).map((day, dayIdx) => (
          <div key={`${day.day}-${dayIdx}`} className="space-y-1.5">
            <div
              className="inline-flex items-center bg-primary text-white rounded-full px-3 py-1"
              style={{ fontSize: 11, fontWeight: 700 }}
            >
              Day {day.day || dayIdx + 1}
              {formatDayLabel(day.date) ? ` · ${formatDayLabel(day.date)}` : ""}
            </div>
            {(day.stops || []).map((stop, stopIdx) => (
              <MiniStopCard key={stopIdx} stop={stop} />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setMobileView("itinerary")}
            className="flex-1 bg-card border border-border rounded-xl py-2 text-foreground flex items-center justify-center gap-1.5"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            View full itinerary
          </button>
          <button
            type="button"
            onClick={() => {
              setEditMode(true);
              setMobileView("itinerary");
            }}
            className="bg-secondary text-secondary-foreground rounded-xl px-3 py-2 flex items-center gap-1.5"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>
    ) : null;

    return (
      <div className="flex-1 min-h-0 flex flex-col bg-background">
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0"
        >
          <button
            type="button"
            onClick={() =>
              mobileView === "itinerary" ? setMobileView("chat") : navigate(-1)
            }
            aria-label={mobileView === "itinerary" ? "Back to chat" : "Go back"}
            className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate" style={{ fontWeight: 700, fontSize: 13, color: "#16213E" }}>
              {mobileView === "itinerary" ? headerTitle : "Jelajah AI"}
            </p>
            <div className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusTone ? "bg-amber-500" : "bg-primary"} ${
                  loading ? "animate-pulse" : ""
                }`}
              />
              <span
                className={`truncate ${statusTone ? "text-amber-700" : "text-primary"}`}
                style={{ fontSize: 10, fontWeight: 500 }}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          {draft && mobileView === "itinerary" && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              aria-pressed={editMode}
              className={`border rounded-xl px-2.5 py-1.5 flex items-center gap-1 shrink-0 ${
                editMode
                  ? "border-primary bg-secondary text-secondary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {editMode ? "Done" : "Edit"}
            </button>
          )}
        </div>

        {/* Body */}
        {mobileView === "itinerary" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <p className="px-4 pt-3 text-muted-foreground" style={{ fontSize: 12 }}>
              {headerSub}
            </p>
            {unconfiguredBanner}
            {canvasContent}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && !pending && (
              <MobileBubble role="assistant">
                Hi! Where do you want to go? Tell me the destination, dates, and who's
                coming — I'll draft a day-by-day itinerary with prices in IDR.
              </MobileBubble>
            )}

            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <MobileBubble role={m.role}>{m.content}</MobileBubble>
                {i === lastAiIdx && inlineDraft}
              </div>
            ))}

            {pending && <MobileBubble role="user">{pending}</MobileBubble>}

            {loading && (
              <div className="flex items-center gap-1.5 px-1 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-muted-foreground ml-1" style={{ fontSize: 11 }}>
                  Finding options…
                </span>
              </div>
            )}

            {status === "error" && pending && (
              <div
                className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive"
                style={{ fontSize: 12, lineHeight: 1.5 }}
                role="alert"
              >
                <p className="mb-1.5">{errorMsg || "That didn't work."}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2.5 py-1 text-foreground"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  <RotateCcw className="w-3 h-3" /> Try again
                </button>
              </div>
            )}

            {status === "unconfigured" && <div className="-mx-3 -mt-3">{unconfiguredBanner}</div>}

            {!draft && !loading && !pending && messages.length === 0 && status !== "unconfigured" && (
              <div className="flex flex-col items-start gap-1.5 pt-1">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => ask(sug)}
                    className="bg-secondary text-secondary-foreground rounded-full px-3 py-1.5 text-left"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Bottom bar: chat input + save */}
        <div
          className="px-3 pt-3 border-t border-border space-y-2 bg-card shrink-0"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <form onSubmit={send} className="flex items-center gap-2 bg-muted rounded-xl pl-3 pr-1.5 py-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status === "unconfigured"}
              placeholder={draft ? "Add a beach day…" : "5 days Osaka, food, 4 friends…"}
              aria-label="Message Jelajah AI"
              className="flex-1 min-w-0 bg-transparent border-none outline-none py-1 text-foreground placeholder-muted-foreground disabled:opacity-50"
              style={{ fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || status === "unconfigured"}
              aria-label="Send message"
              className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </form>
          {draft && (
            <button
              type="button"
              onClick={saveTrip}
              disabled={saving || loading}
              className="w-full bg-primary text-white rounded-2xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ fontSize: 13, fontWeight: 700 }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Saving…" : "Save this trip"}
            </button>
          )}
        </div>

        {tripForm}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
      {/* Left chat panel */}
      <aside className="w-full lg:w-[300px] shrink-0 bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col lg:h-full max-h-[48vh] lg:max-h-none">
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-foreground" style={{ fontWeight: 700, fontSize: 14 }}>
              Jelajah AI
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === "unconfigured" || status === "error"
                    ? "bg-amber-500"
                    : "bg-primary"
                } ${loading ? "animate-pulse" : ""}`}
              />
              <span
                className={status === "unconfigured" || status === "error" ? "text-amber-700" : "text-primary"}
                style={{ fontSize: 11, fontWeight: 500 }}
              >
                {loading
                  ? "Building your trip"
                  : status === "unconfigured"
                  ? "Unavailable"
                  : status === "error"
                  ? "Something went wrong"
                  : draft
                  ? "Draft ready"
                  : "Ready to plan"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && !pending && (
            <AiBubble>
              Hi! Where do you want to go? Tell me the destination, dates, and who's
              coming — I'll draft a day-by-day itinerary with prices in IDR.
            </AiBubble>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <UserBubble key={i}>{m.content}</UserBubble>
            ) : (
              <AiBubble key={i}>{m.content}</AiBubble>
            )
          )}

          {pending && <UserBubble>{pending}</UserBubble>}

          {loading && (
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-muted-foreground" style={{ fontSize: 11 }}>
                Finding options…
              </span>
            </div>
          )}

          {status === "error" && pending && (
            <div
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive"
              style={{ fontSize: 12, lineHeight: 1.5 }}
              role="alert"
            >
              <p className="mb-1.5">{errorMsg || "That didn't work."}</p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2.5 py-1 text-foreground hover:bg-muted"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                <RotateCcw className="w-3 h-3" /> Try again
              </button>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={send} className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status === "unconfigured"}
              placeholder={
                draft ? "Make day 3 more relaxed…" : "Osaka, 5 days in October, with friends…"
              }
              aria-label="Message Jelajah AI"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground disabled:opacity-50"
              style={{ fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || status === "unconfigured"}
              aria-label="Send message"
              className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center hover:bg-[#13a058] transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 text-white" strokeWidth={2} />
            </button>
          </div>
        </form>
      </aside>

      {/* Right canvas */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3 z-10">
          <div className="min-w-0">
            <h1
              className="text-foreground truncate"
              style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}
            >
              {headerTitle}
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>
              {headerSub}
            </p>
          </div>
          {draft && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditMode((v) => !v)}
                aria-pressed={editMode}
                className={`border rounded-xl px-4 py-2 transition-colors flex items-center gap-1.5 ${
                  editMode
                    ? "border-primary bg-secondary text-secondary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                {editMode ? "Done editing" : "Edit manually"}
              </button>
              <button
                type="button"
                onClick={saveTrip}
                disabled={saving || loading}
                className="bg-primary text-white rounded-xl px-4 py-2 hover:bg-[#13a058] transition-colors flex items-center gap-1.5 disabled:opacity-60"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {saving ? "Saving…" : "Save trip"}
              </button>
            </div>
          )}
        </div>

        {unconfiguredBanner}


        {canvasContent}
      </main>

      {tripForm}
    </div>
  );
}

/** Mobile chat bubble, per the reference AI chat screen. */
function MobileBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const user = role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] px-3 py-2 whitespace-pre-wrap"
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          background: user ? "#16B364" : "#F4F8F5",
          color: user ? "#fff" : "#16213E",
          borderRadius: user ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Compact read-only draft stop shown inline in the mobile chat. */
function MiniStopCard({ stop }: { stop: DraftStop }) {
  const price = stopPrice(stop.cost, true);
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
      <span className="shrink-0" style={{ fontSize: 16 }}>{stopIcon(stop.type)}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: 11, fontWeight: 600, color: "#16213E" }}>
          {stop.name || "Untitled stop"}
        </p>
        {stop.booking_url && (
          <a
            href={stop.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 bg-secondary rounded-full px-1.5 py-0.5"
          >
            <ExternalLink className="w-2 h-2 text-secondary-foreground" />
            <span style={{ fontSize: 9, fontWeight: 600, color: "#0B6B3A" }}>Booking link added</span>
          </a>
        )}
      </div>
      {price && (
        <span
          className="shrink-0"
          style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", color: price.free ? "#16B364" : "#16213E" }}
        >
          {price.label}
        </span>
      )}
    </div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[88%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 bg-secondary text-secondary-foreground whitespace-pre-wrap"
        style={{ fontSize: 13, lineHeight: 1.5 }}
      >
        {children}
      </div>
    </div>
  );
}

function AiBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="w-6 h-6 bg-secondary rounded-lg flex items-center justify-center mr-2 mt-0.5 shrink-0">
        <Sparkles className="w-3 h-3 text-primary" strokeWidth={2} />
      </div>
      <div
        className="max-w-[82%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-muted text-foreground whitespace-pre-wrap"
        style={{ fontSize: 13, lineHeight: 1.5 }}
      >
        {children}
      </div>
    </div>
  );
}

function StopCard({
  stop,
  editing,
  onChange,
  onRemove,
}: {
  stop: DraftStop;
  editing: boolean;
  onChange: (patch: Partial<DraftStop>) => void;
  onRemove: () => void;
}) {
  const price = stopPrice(stop.cost);
  const meta = [stop.description, stop.estimated_time].filter(Boolean).join(" · ");
  const inputCls =
    "bg-muted rounded-lg px-2 py-1 border border-transparent focus:border-primary outline-none text-foreground";

  if (editing) {
    return (
      <div className="bg-card border border-primary/30 rounded-xl px-3 sm:px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
        <input
          type="time"
          value={stop.time}
          onChange={(e) => onChange({ time: e.target.value })}
          aria-label="Time"
          className={`${inputCls} w-[92px] shrink-0`}
          style={{ fontSize: 12 }}
        />
        <span className="text-lg shrink-0">{stopIcon(stop.type)}</span>
        <input
          value={stop.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Stop name"
          aria-label="Stop name"
          autoFocus={!stop.name}
          className={`${inputCls} flex-1 min-w-[140px]`}
          style={{ fontSize: 13, fontWeight: 600 }}
        />
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={stop.cost ?? ""}
          onChange={(e) =>
            onChange({ cost: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })
          }
          placeholder="Rp / person"
          aria-label="Cost per person (IDR)"
          className={`${inputCls} w-[120px] shrink-0`}
          style={{ fontSize: 12 }}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${stop.name || "stop"}`}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <article className="bg-card border border-border rounded-xl px-3 sm:px-4 py-3 flex items-start gap-2 sm:gap-3 hover:border-primary/30 transition-colors">
      <span
        className="text-primary shrink-0 mt-0.5"
        style={{ fontSize: 13, fontWeight: 600, minWidth: 44 }}
      >
        {stop.time || "—"}
      </span>
      <span className="text-lg shrink-0">{stopIcon(stop.type)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-foreground" style={{ fontWeight: 600, fontSize: 14 }}>
          {stop.name || "Untitled stop"}
        </p>
        {meta && (
          <p className="text-muted-foreground" style={{ fontSize: 12 }}>
            {meta}
          </p>
        )}
        {stop.booking_url && (
          <a
            href={stop.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 mt-1 hover:bg-primary hover:text-white transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            <span style={{ fontSize: 10, fontWeight: 600 }}>Booking link added</span>
          </a>
        )}
      </div>
      {price && (
        <span
          className={price.free ? "text-primary shrink-0" : "text-foreground shrink-0"}
          style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}
        >
          {price.label}
        </span>
      )}
    </article>
  );
}

function CanvasSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading itinerary">
      <div className="mx-4 md:mx-8 mt-6 bg-secondary rounded-2xl px-6 py-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-6 w-16 rounded bg-primary/15 mb-2" />
            <div className="h-3 w-12 rounded bg-primary/10" />
          </div>
        ))}
      </div>
      <div className="px-4 md:px-8 py-6 space-y-7">
        {[3, 2].map((n, d) => (
          <div key={d}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
            </div>
            <div className="space-y-2 ml-0 sm:ml-11">
              {Array.from({ length: n }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl border border-border bg-card" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
