import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { useApi } from "@/hooks/useApi";
import { getErrorMessage, withTripLabels } from "@/lib/utils";

const TripsContext = createContext<any>(null);

export const useTrips = () => {
  const context = useContext(TripsContext);
  if (!context) {
    throw new Error("useTrips must be used within a TripsProvider");
  }
  return context;
};

export const TripsProvider = ({ children }: { children: ReactNode }) => {
  const { getRequest } = useApi();
  const [publicTrips, setPublicTrips] = useState<any[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [tripsStatistics, setTripsStatistics] = useState<any>({});

  const fetchTripsStatistics = useCallback(async () => {
    try {
      const response = await getRequest(`/trips/statistics/`);
      setTripsStatistics(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch trips statistics:", getErrorMessage(error));
      return {};
    }
  }, []);

  const fetchPublicTrips = useCallback(async (queryString = "") => {
    try {
      const response = await getRequest(
        `/trips/?is_public=true&${queryString}`
      );
      const trips = (response.data || []).map(withTripLabels);
      setPublicTrips(trips);
      return trips;
    } catch (error) {
      console.error("Failed to fetch public trips:", getErrorMessage(error));
      return [];
    }
  }, []);

  const fetchMyTrips = useCallback(async () => {
    try {
      const response = await getRequest(`/trips/`);
      const trips = (response.data || []).map(withTripLabels);
      setMyTrips(trips);
      return trips;
    } catch (error) {
      console.error("Failed to fetch my trips:", getErrorMessage(error));
      return [];
    }
  }, []);

  return (
    <TripsContext.Provider
      value={{
        publicTrips,
        fetchPublicTrips,
        myTrips,
        setMyTrips,
        fetchMyTrips,
        tripsStatistics,
        fetchTripsStatistics,
      }}
    >
      {children}
    </TripsContext.Provider>
  );
};
