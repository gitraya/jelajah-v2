import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "react-router";

import { useApi } from "@/hooks/useApi";
import { getErrorMessage, withTripLabels } from "@/lib/utils";

const TripContext = createContext<any>(null);

export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error("useTrip must be used within a TripProvider");
  }
  return context;
};

export const TripProvider = ({ children }: { children: ReactNode }) => {
  const { id: defaultTripId } = useParams();
  const { getRequest } = useApi();
  const [isLoading, setIsLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [itinerarySummary, setItinerarySummary] = useState<any[]>([]);

  const fetchItinerarySummary = useCallback(async (tripId: string) => {
    try {
      const response = await getRequest(`/trips/${tripId}/itineraries/summary/`);
      setItinerarySummary(response.data || []);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch itinerary summary:", getErrorMessage(error));
      return [];
    }
  }, []);

  const fetchTripDetails = useCallback(async (tripId: string) => {
    setIsLoading(true);
    try {
      const response = await getRequest(`/trips/${tripId}/`);
      setTrip(withTripLabels(response.data));
      return response.data;
    } catch (error) {
      console.error("Failed to fetch trip details:", getErrorMessage(error));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!defaultTripId) return;
    fetchItinerarySummary(defaultTripId);
    fetchTripDetails(defaultTripId);
  }, []);

  return (
    <TripContext.Provider
      value={{
        itinerarySummary,
        trip,
        isLoading,
        fetchTripDetails,
        fetchItinerarySummary,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};
