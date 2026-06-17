import { useState } from "react";
import { ArrowLeft, MapPin, Users, Calendar, Wallet, Plus, ExternalLink, CheckCircle, Clock, AlertCircle, MoreHorizontal } from "lucide-react";

interface Props {
  tripId: string;
  onBack: () => void;
}

const tripData: Record<string, {
  name: string; flag: string; country: string; dates: string; img: string;
  travelers: { initials: string; color: string; name: string; paid: boolean }[];
  budget: string; spent: string; progress: number;
  days: { num: number; date: string; title: string; stops: { time: string; icon: string; name: string; meta: string; price: string; free?: boolean; booking?: boolean; status: "done" | "pending" | "cancelled" }[] }[];
}> = {
  canada: {
    name: "Canada Trip", flag: "🇨🇦", country: "Canada", dates: "24–30 Jul 2026",
    img: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1200&h=400&fit=crop&auto=format",
    travelers: [
      { initials: "RA", color: "#16B364", name: "Raya (you)", paid: true },
      { initials: "CY", color: "#FF8A4C", name: "Cinta Yusuf", paid: true },
      { initials: "VW", color: "#0B6B3A", name: "Vina Widjaja", paid: false },
      { initials: "SF", color: "#F5A623", name: "Sasha Fauzia", paid: true },
      { initials: "WY", color: "#1a7aaa", name: "Wahyu Yanto", paid: false },
    ],
    budget: "Rp 18.500.000", spent: "Rp 1.200.000", progress: 72,
    days: [
      {
        num: 1, date: "Thu 24 Jul", title: "Arrival in Toronto",
        stops: [
          { time: "14:00", icon: "✈️", name: "Flight to YYZ", meta: "Garuda GA-880 · Terminal 3", price: "Rp 8.200.000", booking: true, status: "done" },
          { time: "20:00", icon: "🏨", name: "Fairfield Inn Downtown", meta: "King room · 6 nights", price: "Rp 2.800.000", booking: true, status: "done" },
          { time: "22:00", icon: "🍶", name: "Kinka Izakaya", meta: "Dinner · walk from hotel", price: "Rp 80.000", status: "pending" },
        ],
      },
      {
        num: 2, date: "Fri 25 Jul", title: "City exploration",
        stops: [
          { time: "10:00", icon: "🏙️", name: "Nathan Phillips Square", meta: "City Hall · free entry", price: "Free", free: true, status: "pending" },
          { time: "13:00", icon: "🗼", name: "CN Tower", meta: "Glass floor + EdgeWalk optional", price: "Rp 220.000", booking: true, status: "pending" },
          { time: "17:00", icon: "🛍️", name: "Kensington Market", meta: "Vintage shopping & food stalls", price: "Rp 150.000", status: "pending" },
        ],
      },
    ],
  },
  osaka: {
    name: "Osaka Foodie", flag: "🇯🇵", country: "Japan", dates: "12–16 Sep 2026",
    img: "https://images.unsplash.com/photo-1659094438327-493ee9cc0c4c?w=1200&h=400&fit=crop&auto=format",
    travelers: [
      { initials: "RA", color: "#16B364", name: "Raya (you)", paid: true },
      { initials: "CY", color: "#FF8A4C", name: "Cinta Yusuf", paid: false },
      { initials: "VW", color: "#0B6B3A", name: "Vina Widjaja", paid: false },
      { initials: "SF", color: "#F5A623", name: "Sasha Fauzia", paid: false },
    ],
    budget: "Rp 33.600.000", spent: "Rp 0", progress: 45,
    days: [
      {
        num: 1, date: "Fri 12 Sep", title: "Arrival & Dotonbori",
        stops: [
          { time: "14:00", icon: "🏨", name: "Cross Hotel Osaka", meta: "Near Dotonbori · 4 nights", price: "Rp 2.800.000", booking: true, status: "done" },
          { time: "18:00", icon: "🍜", name: "Ichiran Ramen Dotonbori", meta: "Solo booth ramen", price: "Rp 120.000", status: "pending" },
          { time: "20:00", icon: "🚶", name: "Dotonbori canal walk", meta: "Glico man + street snacks", price: "Free", free: true, status: "pending" },
        ],
      },
    ],
  },
  bangkok: {
    name: "Bangkok Getaway", flag: "🇹🇭", country: "Thailand", dates: "5–10 Oct 2026",
    img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1200&h=400&fit=crop&auto=format",
    travelers: [
      { initials: "RA", color: "#16B364", name: "Raya (you)", paid: true },
      { initials: "VW", color: "#0B6B3A", name: "Vina Widjaja", paid: false },
      { initials: "WY", color: "#1a7aaa", name: "Wahyu Yanto", paid: false },
    ],
    budget: "Rp 9.000.000", spent: "Rp 0", progress: 20,
    days: [
      {
        num: 1, date: "Sun 5 Oct", title: "Arrival & temples",
        stops: [
          { time: "13:00", icon: "✈️", name: "Flight to BKK", meta: "Lion Air · Suvarnabhumi", price: "Rp 1.800.000", status: "pending" },
          { time: "17:00", icon: "🏨", name: "Novotel Bangkok Sukhumvit", meta: "Deluxe room · 5 nights", price: "Rp 2.200.000", booking: true, status: "pending" },
        ],
      },
    ],
  },
  kl: {
    name: "KL Long Weekend", flag: "🇲🇾", country: "Malaysia", dates: "15–18 Mar 2026",
    img: "https://images.unsplash.com/photo-1470217957101-da7150b9b681?w=1200&h=400&fit=crop&auto=format",
    travelers: [
      { initials: "RA", color: "#16B364", name: "Raya (you)", paid: true },
      { initials: "CY", color: "#FF8A4C", name: "Cinta Yusuf", paid: true },
      { initials: "SF", color: "#F5A623", name: "Sasha Fauzia", paid: true },
      { initials: "WY", color: "#1a7aaa", name: "Wahyu Yanto", paid: true },
    ],
    budget: "Rp 12.000.000", spent: "Rp 12.000.000", progress: 100,
    days: [
      {
        num: 1, date: "Sun 15 Mar", title: "Petronas & KLCC",
        stops: [
          { time: "09:00", icon: "🏙️", name: "Petronas Twin Towers", meta: "Sky bridge + observation deck", price: "Rp 190.000", status: "done" },
          { time: "13:00", icon: "🍛", name: "Nasi Lemak Wanjo", meta: "Classic Malaysian lunch", price: "Rp 45.000", status: "done" },
          { time: "19:00", icon: "🛍️", name: "Bukit Bintang night market", meta: "Shopping & street food", price: "Rp 200.000", status: "done" },
        ],
      },
    ],
  },
};

const statusIcon = {
  done: { icon: CheckCircle, color: "#16B364" },
  pending: { icon: Clock, color: "#F5A623" },
  cancelled: { icon: AlertCircle, color: "#E5605B" },
};

type DetailTab = "itinerary" | "budget" | "travelers";

export function DesktopTripDetail({ tripId, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>("itinerary");
  const trip = tripData[tripId] || tripData["canada"];

  const spentNum = parseInt(trip.spent.replace(/[^\d]/g, "")) || 0;
  const budgetNum = parseInt(trip.budget.replace(/[^\d]/g, "")) || 1;
  const spentPct = Math.round((spentNum / budgetNum) * 100);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Cover image header */}
      <div className="relative h-52 overflow-hidden bg-slate-700">
        <img src={trip.img} alt={trip.name} className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-5 left-6 flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-xl px-3 py-2 hover:bg-white/30 transition-colors"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="absolute bottom-5 left-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/90 text-foreground rounded-full px-2.5 py-1" style={{ fontSize: 12, fontWeight: 600 }}>
              {trip.flag} {trip.country}
            </span>
          </div>
          <h1 className="text-white mb-0.5" style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em" }}>{trip.name}</h1>
          <p className="text-white/80" style={{ fontSize: 13 }}>{trip.dates} · {trip.travelers.length} travelers</p>
        </div>

        {/* Member avatars */}
        <div className="absolute bottom-5 right-6 flex -space-x-2">
          {trip.travelers.map((t) => (
            <div
              key={t.initials}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center"
              style={{ background: t.color, fontSize: 10, fontWeight: 700, color: "#fff" }}
            >
              {t.initials}
            </div>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-6 mt-5 bg-secondary rounded-2xl px-6 py-4 grid grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: "Dates", value: trip.dates.split(" ")[0] + " →" },
          { icon: Users, label: "Travelers", value: `${trip.travelers.length} people` },
          { icon: Wallet, label: "Budget", value: trip.budget },
          { icon: MapPin, label: "Progress", value: `${trip.progress}% ready` },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground" style={{ fontSize: 11, fontWeight: 500 }}>{s.label}</p>
              <p className="text-secondary-foreground" style={{ fontWeight: 700, fontSize: 13 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-6 mt-5 bg-muted rounded-xl p-1 w-fit">
        {(["itinerary", "budget", "travelers"] as DetailTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg capitalize transition-all ${
              activeTab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 13, fontWeight: activeTab === t ? 600 : 500 }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-6 py-5">
        {/* ITINERARY TAB */}
        {activeTab === "itinerary" && (
          <div className="space-y-6">
            {trip.days.map((day) => (
              <div key={day.num}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <span className="text-white" style={{ fontWeight: 800, fontSize: 12 }}>{day.num}</span>
                  </div>
                  <div>
                    <p className="text-foreground" style={{ fontWeight: 700, fontSize: 14 }}>{day.title}</p>
                    <p className="text-muted-foreground" style={{ fontSize: 12 }}>{day.date}</p>
                  </div>
                </div>
                <div className="space-y-2 ml-10">
                  {day.stops.map((stop, i) => {
                    const si = statusIcon[stop.status];
                    const SIcon = si.icon;
                    return (
                      <div key={i} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3 hover:border-primary/20 transition-colors">
                        <span className="text-primary shrink-0 mt-0.5" style={{ fontSize: 12, fontWeight: 600, minWidth: 44 }}>{stop.time}</span>
                        <span className="text-lg shrink-0">{stop.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground" style={{ fontWeight: 600, fontSize: 14 }}>{stop.name}</p>
                          <p className="text-muted-foreground" style={{ fontSize: 12 }}>{stop.meta}</p>
                          {stop.booking && (
                            <div className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 mt-1">
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span style={{ fontSize: 10, fontWeight: 600 }}>Booking link added</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={stop.free ? "text-primary" : "text-foreground"}
                            style={{ fontWeight: 700, fontSize: 13 }}
                          >
                            {stop.price}
                          </span>
                          <SIcon className="w-4 h-4" style={{ color: si.color }} />
                        </div>
                      </div>
                    );
                  })}
                  <button className="w-full border-2 border-dashed border-border rounded-xl py-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5" style={{ fontSize: 12 }}>
                    <Plus className="w-3.5 h-3.5" /> Add a stop to day {day.num}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BUDGET TAB */}
        {activeTab === "budget" && (
          <div>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total budget", value: trip.budget, sub: `${trip.travelers.length} travelers`, color: "#16213E" },
                { label: "Per person", value: `Rp ${Math.round(parseInt(trip.budget.replace(/[^\d]/g, "")) / trip.travelers.length / 1000000 * 10) / 10}M`, sub: "estimated", color: "#16213E" },
                { label: "Spent so far", value: trip.spent, sub: `${spentPct}% of budget`, color: spentPct > 80 ? "#E5605B" : "#16B364" },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-muted-foreground mb-1" style={{ fontSize: 12 }}>{s.label}</p>
                  <p style={{ fontWeight: 800, fontSize: 22, color: s.color, letterSpacing: "-0.03em" }}>{s.value}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 11 }}>{s.sub}</p>
                </div>
              ))}
            </div>
            {/* Budget bar */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-foreground" style={{ fontWeight: 600, fontSize: 14 }}>Budget usage</p>
                <p className="text-muted-foreground" style={{ fontSize: 13 }}>{spentPct}% used</p>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${spentPct}%`, background: spentPct > 80 ? "#E5605B" : "#16B364" }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-muted-foreground" style={{ fontSize: 11 }}>Rp 0</span>
                <span className="text-muted-foreground" style={{ fontSize: 11 }}>{trip.budget}</span>
              </div>
            </div>
            {/* Payment status */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-foreground mb-4" style={{ fontWeight: 700, fontSize: 15 }}>Payment collection</p>
              <div className="space-y-3">
                {trip.travelers.map((t) => (
                  <div key={t.initials} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: t.color, fontSize: 10, fontWeight: 700 }}
                    >
                      {t.initials}
                    </div>
                    <p className="flex-1 text-foreground" style={{ fontSize: 14 }}>{t.name}</p>
                    <span
                      className="flex items-center gap-1 rounded-full px-2.5 py-1"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: t.paid ? "#16B364" : "#F5A623",
                        background: t.paid ? "#E6F7EE" : "#FFF8E6",
                      }}
                    >
                      {t.paid ? <><CheckCircle className="w-3 h-3" /> Paid</> : <><Clock className="w-3 h-3" /> Pending</>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TRAVELERS TAB */}
        {activeTab === "travelers" && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              {trip.travelers.map((t) => (
                <div key={t.initials} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                    style={{ background: t.color, fontSize: 14, fontWeight: 800 }}
                  >
                    {t.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground" style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</p>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: t.paid ? "#16B364" : "#F5A623",
                        background: t.paid ? "#E6F7EE" : "#FFF8E6",
                      }}
                    >
                      {t.paid ? "✓ Confirmed" : "⏳ Pending payment"}
                    </span>
                  </div>
                </div>
              ))}
              {/* Add traveler */}
              <button className="bg-card border-2 border-dashed border-border rounded-2xl p-4 flex items-center gap-3 hover:border-primary hover:bg-secondary transition-all">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground" style={{ fontSize: 14 }}>Invite someone</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
