import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "react-router";

import { ITINERARY_STATUSES_ENUM } from "@/config";
import { useApi } from "@/hooks/useApi";
import { getAPIData } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

const { SKIPPED } = ITINERARY_STATUSES_ENUM;

const ItinerariesContext = createContext<any>(null);

export const useItineraries = () => {
  const context = useContext(ItinerariesContext);
  if (!context) {
    throw new Error("useItineraries must be used within an ItinerariesProvider");
  }
  return context;
};

export const ItinerariesProvider = ({ children }: { children: ReactNode }) => {
  const { id: defaultTripId } = useParams();
  const { getRequest, deleteRequest, patchRequest, postRequest } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [types, setTypes] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({});
  const [isDataMustRefreshed, setIsDataMustRefreshed] = useState<any>(null);

  const fetchTypes = useCallback(async () => {
    try {
      const response = await getAPIData("/itineraries/types/");
      const typesWithAll = [{ id: "all", name: "All" }, ...response.data];
      setTypes(typesWithAll);
      return typesWithAll;
    } catch (error) {
      console.error("Failed to fetch itinerary types:", getErrorMessage(error));
      return [];
    }
  }, []);

  const fetchStatistics = useCallback(async (tripId: string) => {
    try {
      const response = await getRequest(`/trips/${tripId}/itineraries/statistics/`);
      setStatistics(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch itinerary statistics:", getErrorMessage(error));
      return {};
    }
  }, []);

  const fetchLocations = useCallback(
    async (tripId: string) => {
      try {
        const params = new URLSearchParams();
        if (selectedStatus !== "all") params.append("status", selectedStatus);
        if (selectedType !== "all") params.append("type_id", selectedType);

        const queryString = params.toString();
        const response = await getRequest(
          `/trips/${tripId}/itineraries/items${queryString ? `?${queryString}` : ""}`
        );
        setLocations(response.data);
        return response.data;
      } catch (error) {
        console.error("Failed to fetch locations:", getErrorMessage(error));
        return [];
      }
    },
    [selectedStatus, selectedType]
  );

  const fetchItineraries = useCallback(async (tripId: string) => {
    try {
      const response = await getRequest(`/trips/${tripId}/itineraries/organized/`);
      setItineraries(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch organized itineraries:", getErrorMessage(error));
      return [];
    }
  }, []);

  const createItinerary = useCallback(
    async (data: any, tripId: string = defaultTripId as string) => {
      try {
        setError("");
        const response = await postRequest(
          `/trips/${tripId}/itineraries/items/`,
          data
        );

        setLocations((prev) => [...prev, response.data]);
        setItineraries((prev) =>
          [...prev, response.data].sort(
            (a, b) =>
              new Date(a.visit_time).getTime() - new Date(b.visit_time).getTime()
          )
        );
        setStatistics((prev: any) => ({
          ...prev,
          total: prev.total + 1,
          [response.data.status.toLowerCase()]:
            (prev[response.data.status.toLowerCase()] || 0) + 1,
        }));

        return response.data;
      } catch (error) {
        setError(
          getErrorMessage(
            error,
            "An error occurred while creating the itinerary item. Please try again later."
          )
        );
        throw error;
      }
    },
    []
  );

  const deleteLocation = useCallback(
    async (id: string, tripId: string = defaultTripId as string) => {
      const deletedLocation = locations.find((location) => location.id === id);
      if (!deletedLocation) return;

      setLocations((prev) => prev.filter((location) => location.id !== id));
      setItineraries((prev) => prev.filter((location) => location.id !== id));
      setStatistics((prev: any) => ({
        ...prev,
        total: prev.total - 1,
        [deletedLocation.status.toLowerCase()]:
          (prev[deletedLocation.status.toLowerCase()] || 1) - 1,
      }));

      deleteRequest(`/trips/${tripId}/itineraries/items/${id}/`);
    },
    [locations]
  );

  const updateStatus = useCallback(
    async (id: string, status: string, tripId: string = defaultTripId as string) => {
      const location = locations.find((loc) => loc.id === id);
      if (!location) return;

      const oldStatus = location.status;

      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? { ...loc, status } : loc))
      );
      setItineraries((prev) =>
        prev
          .map((loc) => (loc.id === id ? { ...loc, status } : loc))
          .filter((loc) => loc.status !== SKIPPED)
      );
      setStatistics((prev: any) => ({
        ...prev,
        [oldStatus.toLowerCase()]: (prev[oldStatus.toLowerCase()] || 1) - 1,
        [status.toLowerCase()]: (prev[status.toLowerCase()] || 0) + 1,
      }));

      patchRequest(`/trips/${tripId}/itineraries/items/${id}/`, { status });
    },
    [locations]
  );

  const refreshData = useCallback(() => {
    setIsDataMustRefreshed(Math.random());
  }, []);

  // An edit can change type/status/visit_time at once, so resync from the
  // server instead of trying to patch the statistics buckets by hand.
  const updateItinerary = useCallback(
    async (id: string, data: any, tripId: string = defaultTripId as string) => {
      try {
        setError("");
        const response = await patchRequest(
          `/trips/${tripId}/itineraries/items/${id}/`,
          data
        );
        refreshData();
        return response.data;
      } catch (error) {
        setError(
          getErrorMessage(
            error,
            "An error occurred while updating the itinerary item. Please try again later."
          )
        );
        throw error;
      }
    },
    [refreshData]
  );

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    if (!defaultTripId) return;
    setIsLoading(true);
    Promise.all([
      fetchStatistics(defaultTripId),
      fetchItineraries(defaultTripId),
      fetchLocations(defaultTripId),
    ]).finally(() => setIsLoading(false));
  }, [selectedType, selectedStatus, isDataMustRefreshed]);

  return (
    <ItinerariesContext.Provider
      value={{
        error,
        isLoading,
        itineraries,
        locations,
        selectedType,
        selectedStatus,
        types,
        statistics,
        setError,
        setSelectedType,
        setSelectedStatus,
        createItinerary,
        updateItinerary,
        deleteLocation,
        updateStatus,
        refreshData,
      }}
    >
      {children}
    </ItinerariesContext.Provider>
  );
};
