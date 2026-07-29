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
  const { getRequest, postRequest, patchRequest, deleteRequest } = useApi();
  const [publicTrips, setPublicTrips] = useState<any[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [tripsStatistics, setTripsStatistics] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

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

  const createTrip = useCallback(async (data: any) => {
    try {
      setError(null);
      const response = await postRequest(`/trips/`, data);
      const trip = withTripLabels(response.data);
      setMyTrips((prev) => [trip, ...prev]);
      return trip;
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "An error occurred while creating the trip. Please try again later."
        )
      );
      throw error;
    }
  }, []);

  const updateTrip = useCallback(async (id: string, data: any) => {
    try {
      setError(null);
      const response = await patchRequest(`/trips/${id}/`, data);
      const trip = withTripLabels(response.data);
      setMyTrips((prev) => prev.map((t) => (t.id === id ? trip : t)));
      return trip;
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "An error occurred while updating the trip. Please try again later."
        )
      );
      throw error;
    }
  }, []);

  const deleteTrip = useCallback(async (id: string) => {
    try {
      setError(null);
      setMyTrips((prev) => prev.filter((t) => t.id !== id));
      await deleteRequest(`/trips/${id}/`);
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "An error occurred while deleting the trip. Please try again later."
        )
      );
      throw error;
    }
  }, []);

  // Self-join a public trip. The backend creates a PENDING TripMember and
  // emails the owner, so this is a *request* — not immediate membership.
  const joinTrip = useCallback(async (id: string) => {
    try {
      setError(null);
      const response = await postRequest(`/trips/${id}/join/`, {});
      setPublicTrips((prev) =>
        prev.map((t) => (t.id === id ? { ...t, join_requested: true } : t))
      );
      return response.data;
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "An error occurred while joining the trip. Please try again later."
        )
      );
      throw error;
    }
  }, []);

  return (
    <TripsContext.Provider
      value={{
        error,
        setError,
        publicTrips,
        fetchPublicTrips,
        myTrips,
        setMyTrips,
        fetchMyTrips,
        tripsStatistics,
        fetchTripsStatistics,
        createTrip,
        updateTrip,
        deleteTrip,
        joinTrip,
      }}
    >
      {children}
    </TripsContext.Provider>
  );
};
