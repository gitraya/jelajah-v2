What to design
Design a modern, cheerful travel planning app called Jelajah for both desktop (web app) and mobile (iOS). The core idea: users don't start from a blank page. They either tell an AI assistant where they want to go in plain language and it builds the whole trip, or they use a light guided flow to build it manually. It should feel like a friendly travel companion, NOT a corporate management dashboard.
Audience: young travelers (20s–30s) in Southeast Asia planning group trips. Currency is Indonesian Rupiah (IDR), shown as "Rp 5.000.000" or shortened "Rp 5M".

Brand & visual style

Vibe: cheerful, fresh, optimistic, clean. Light and airy. Lots of white space. Soft rounded cards with gentle shadows. Friendly, not clinical.
Background: white #FFFFFF and very light grey-green #F4F8F5 for page backgrounds.
Primary color (cheerful green): #16B364 — used for primary buttons, active states, key accents, progress bars.
Mint tint: #E6F7EE — used for soft fills, icon backgrounds, highlight pills.
Deep green: #0B6B3A — text and icons sitting on mint backgrounds.
Ink (primary text): #16213E (near-navy, not pure black).
Muted text: #8A93A6.
Warm accent (use sparingly): #FF8A4C orange — only for ratings, "new", and special highlights. Green is the hero; orange is the spice.
Semantic: success = green, warning = amber #F5A623, danger = soft red #E5605B.
Borders: #E7ECF4 (light), 1px.
Corner radius: cards 16px, buttons & inputs 12–14px, pills/chips fully rounded (20px+).
Shadows: very soft, e.g. 0 4px 20px rgba(22,179,100,0.08) on key elements like the AI prompt bar; subtle 0 4px 16px rgba(0,0,0,0.06) on cards.

Typography

Font: Plus Jakarta Sans (or Figma fallback: Inter, but prefer Jakarta).
Big headlines: 800 weight, tight letter-spacing (-0.03em), e.g. "Where do you want to go next?"
Section titles: 700–800 weight.
Body: 400–500 weight.
Numbers in stat cards: 800 weight for an "expensive" feel.
Always sentence case. Never ALL CAPS.

Iconography

Use a clean outline icon set (Tabler / Lucide style). Examples used: compass (logo), sparkles (AI), pencil (manual), copy (template), map-2, users, calendar, wallet, circle-check, tools-kitchen (food), walk, building-arch (landmark), external-link (booking link), plane, star.


App concept & key screens
The whole app is organized around 4 sections (bottom tab bar on mobile, left sidebar on desktop):

Plan (default, AI sparkle icon) — the AI planner home
Explore — browse public/community trips & destinations
Trips — your saved trips
Buddies — travel friends / members

Logo
"Jelajah" in 800-weight Jakarta with a green period "." at the end. Logo mark = a green rounded square (#16B364) with a white compass icon.

DESKTOP SCREENS
1. Plan home (the front door — most important screen)
Layout: left sidebar (172px) + main content area.

Left sidebar (white card): logo at top; nav sections "Plan" (Plan a trip [active], Explore, Travel buddies) and "Your trips" (list with flag emoji + country: 🇹🇭 Bangkok, 🇲🇾 Kuala Lumpur, 🇯🇵 Osaka, 🇨🇦 Canada); user profile chip pinned to bottom (avatar "RA", name "Raya", email).
Main area:

Small greeting "Good evening, Raya"
Huge headline: "Where do you want to go next?" (the word "next?" in green)
A large prominent AI prompt bar (white, rounded 18px, soft green shadow): sparkle icon on left, placeholder text "5 days in Osaka with my 3 friends, food-focused, mid budget…", and a green "Plan it →" button on the right.
Suggestion chips below: "Weekend beach escape", "Hiking in Bali", "Culture trip Japan", "Budget Southeast Asia" (each with a small green icon).
Divider with text "or start your own way"
Two side-by-side path cards: "Build it step by step" (green pencil icon, desc: "A light guided flow — pick dates, add stops, invite friends. No blank pages.") and "Start from a template" (green copy icon, desc: "Copy a ready-made itinerary from the community and tweak it.").
Section "Continue planning" with a 3-column grid of trip cards. Each trip card: a colored cover image area with a flag pill (e.g. "🇨🇦 Canada") top-left and a thin white progress bar at the bottom, then below the image the trip name and "24 Jul · 72% ready".



2. AI building a trip (the result of "Plan it")
Layout: left chat panel (280px) + right canvas.

Left chat panel (white card): header with green sparkle mark, "Jelajah AI", and a green-dot status "Building your trip". Below, a conversation: a user bubble (mint background) "5 days in Osaka with my 3 friends, food-focused, mid budget", then AI text replies "Nice! I put together a 5-day Osaka food trip for 4 people…" and "Total comes to about Rp 8.4M per person… Want me to find hotels near Dotonbori?". A subtle "thinking" indicator: pulsing green dot + "Finding hotels with booking links…". At the bottom, a chat input "Make day 3 more relaxed…" with a green send button.
Right canvas: header "Osaka Foodie 🇯🇵" with subtext "12–16 Sep 2026 · 4 travelers · draft by AI", and two buttons top-right: "Edit manually" (ghost) and green "✓ Save trip".

A mint summary strip with 4 numbers: 5 Days, 14 Stops, Rp 8.4M Per person, Rp 33.6M Group total.
Day-by-day itinerary. Each day has a green rounded number badge (1, 2…), day title, and date. Under each day, itinerary cards: a time (green, e.g. "15:00"), a colored icon, the activity name, a meta line, and a price (e.g. "Rp 2.8M"). Some cards show a small mint pill "Booking link added". Each day ends with a dashed "+ Add a stop to day 2" button.




MOBILE SCREENS (iPhone, 9:41 status bar, bottom tab bar)
1. Plan home (mobile)

Top row: logo left, round avatar "RA" right.
Greeting "Good evening, Raya", big headline "Where to next?".
AI prompt bar (light fill, green sparkle icon): "5 days Osaka, food, 4 friends…"
A row of chips: "Beach", "Hiking", "Budget".
Divider "or your way".
Two stacked path cards: "Build step by step" (green pencil), "Use a template" (green copy).
Bottom tab bar: Plan (active, sparkle), Explore (map), Trips (briefcase), Buddies (users).

2. AI building a trip (mobile)

Header: back arrow, green sparkle mark, "Jelajah AI" + green "Building your trip".
Chat: user bubble (green background, white text) "5 days Osaka, food, 4 friends, mid budget"; AI bubble (light fill) "Done! A 5-day Osaka food trip for 4 — about Rp 8.4M each. Here's day 1:". Then two mini itinerary cards (hotel "Booking link added" Rp 2.8M; "Dotonbori crawl" street food Rp 250K).
Chat input "Add a beach day…" with green send button.
Full-width green "Save this trip" button.

3. Trip overview (mobile)

Header: back arrow, "Canada Trip", more-dots.
Cover image (rounded) with flag pill "🇨🇦 Canada" and overlaid text "7 days in Toronto" / "24–30 Jul · 5 travelers".
A row of 3 mini stat tiles (light fill): "72% Ready", "Rp 1.2M Spent", "5 Stops".
A green day pill "Day 1 · Fri 24 Jul".
Itinerary mini-cards: "Kinka Izakaya / Dinner / Rp 80K", "Nathan Phillips Sq / Walk / Free" (green Free), "CN Tower / Tickets linked / Rp 220K".
Bottom tab bar with "Trips" active.

4. Onboarding (3 slides) — optional but nice
Three intro slides with big bold headlines, an illustration or photo, a dots indicator (active dot is a green pill), and a green "Get started" button:

"Your journey, perfectly planned"
"Plan with AI, or your own way"
"Travel together with friends"


Tone & micro-details to include

Everything in IDR. Use "Rp 8.4M" short form in tight spaces, "Rp 8.400.000" in detail views.
Booking links appear as small mint pills with an external-link icon ("Booking link added", "Tickets linked") — this is how hotel/ticket integration shows up.
Member avatars are colored initials circles (RA, CY, VW, SF, WY).
Paid/unpaid/status badges: green "Done", amber pending, soft-red "Cancelled".
No blank empty states — always show a friendly prompt + a CTA.
Keep the AI always feel transparent: when it builds a trip, show the actual editable itinerary, never a black box.


Screen-by-screen prompts (if generating one at a time)

"Design a desktop web app home screen for a travel planning app called Jelajah. Cheerful green (#16B364) on white. Left sidebar with logo and nav. Main area has a greeting, a huge bold headline 'Where do you want to go next?', a large AI prompt input bar with a sparkle icon and green 'Plan it' button, suggestion chips, two 'start manually' path cards, and a 3-column grid of trip cards with cover images and progress bars. Plus Jakarta Sans font, rounded 16px cards, soft shadows, friendly not corporate."
"Design a desktop AI trip-builder screen. Left panel is a chat with an AI assistant (green sparkle avatar, conversation bubbles, thinking indicator, chat input). Right panel is a live editable day-by-day itinerary: a mint summary strip with totals in Indonesian Rupiah, numbered day badges, itinerary cards with time/icon/name/price, some with 'Booking link added' pills, and dashed 'add stop' buttons. Cheerful green and white, Plus Jakarta Sans."
"Design 3 iPhone screens for a travel app called Jelajah in cheerful green on white: (1) Plan home with a big 'Where to next?' headline, an AI prompt bar, chips, two manual path cards, and a bottom tab bar (Plan/Explore/Trips/Buddies); (2) an AI chat building a trip with bubbles and mini itinerary cards and a 'Save this trip' button; (3) a trip overview with a cover image, 3 stat tiles, a day pill, and itinerary cards. Plus Jakarta Sans, rounded cards, prices in Indonesian Rupiah."
"Design 3 onboarding slides for a travel app (iPhone) in cheerful green: big bold headlines, illustration, a dots page indicator with a green pill active dot, and a green 'Get started' button. Headlines: 'Your journey, perfectly planned', 'Plan with AI, or your own way', 'Travel together with friends'."