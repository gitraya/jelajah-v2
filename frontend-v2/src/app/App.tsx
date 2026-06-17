import { Route, Routes, useLocation, useNavigate, useParams } from "react-router";

import { Toaster } from "./components/ui/sonner";
import { DesktopAIBuilder } from "./components/DesktopAIBuilder";
import { DesktopBuddies } from "./components/DesktopBuddies";
import { DesktopExplore } from "./components/DesktopExplore";
import { DesktopPlanHome } from "./components/DesktopPlanHome";
import { DesktopTripDetail } from "./components/DesktopTripDetail";
import { DesktopTrips } from "./components/DesktopTrips";
import { Onboarding } from "./components/Onboarding";

import AppShell from "@/components/layouts/AppShell";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ResendSetPasswordEmail from "@/pages/auth/ResendSetPasswordEmail";
import SetPassword from "@/pages/auth/SetPassword";
import NotFound from "@/pages/NotFound";
import { AuthProvider } from "@/contexts/AuthContext";
import { TripsProvider } from "@/contexts/TripsContext";
import { TripProvider } from "@/contexts/TripContext";
import { MembersProvider } from "@/contexts/MembersContext";
import { ItinerariesProvider } from "@/contexts/ItinerariesContext";
import { ExpensesProvider } from "@/contexts/ExpensesContext";
import { ChecklistProvider } from "@/contexts/ChecklistContext";
import { PackingItemsProvider } from "@/contexts/PackingItemsContext";

function PlanHomePage() {
  const navigate = useNavigate();
  return (
    <DesktopPlanHome
      onPlanIt={(q: string) => navigate("/ai-builder", { state: { query: q } })}
    />
  );
}

function AIBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const query =
    (location.state as any)?.query ||
    "5 days in Osaka with my 3 friends, food-focused, mid budget";
  return <DesktopAIBuilder initialQuery={query} onSave={() => navigate("/trips")} />;
}

function TripDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  return (
    <TripProvider>
      <MembersProvider>
        <ItinerariesProvider>
          <ExpensesProvider>
            <ChecklistProvider>
              <PackingItemsProvider>
                <DesktopTripDetail
                  tripId={id as string}
                  onBack={() => navigate("/trips")}
                />
              </PackingItemsProvider>
            </ChecklistProvider>
          </ExpensesProvider>
        </ItinerariesProvider>
      </MembersProvider>
    </TripProvider>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();
  return <Onboarding onFinish={() => navigate("/")} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Auth & full-screen routes (no app shell) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/set-password/:userId/:token" element={<SetPassword />} />
        <Route
          path="/resend-set-password-email"
          element={<ResendSetPasswordEmail />}
        />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* App shell routes */}
        <Route
          element={
            <TripsProvider>
              <AppShell />
            </TripsProvider>
          }
        >
          <Route index element={<PlanHomePage />} />
          <Route path="/explore" element={<DesktopExplore />} />
          <Route path="/ai-builder" element={<AIBuilderPage />} />
          <Route path="/buddies" element={<DesktopBuddies />} />
          <Route path="/trips/:id" element={<TripDetailPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/trips" element={<DesktopTrips />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
}
