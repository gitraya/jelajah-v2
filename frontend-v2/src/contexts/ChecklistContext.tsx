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
import { getErrorMessage } from "@/lib/utils";

const updateCategoryStats = (prevStats: any, item: any, operation: string) => {
  const categoryStats = [...prevStats.category_stats];
  const categoryIndex = categoryStats.findIndex(
    (cat) => cat.category === item.category
  );

  if (operation === "add") {
    if (categoryIndex >= 0) {
      categoryStats[categoryIndex] = {
        ...categoryStats[categoryIndex],
        total: categoryStats[categoryIndex].total + 1,
      };
    } else {
      categoryStats.push({ category: item.category, total: 1, completed: 0 });
    }
  } else if (operation === "remove") {
    if (categoryIndex >= 0) {
      categoryStats[categoryIndex] = {
        ...categoryStats[categoryIndex],
        total: categoryStats[categoryIndex].total - 1,
        completed: item.is_completed
          ? categoryStats[categoryIndex].completed - 1
          : categoryStats[categoryIndex].completed,
      };
    }
  }

  return categoryStats.filter((cat) => cat.total > 0);
};

const ChecklistContext = createContext<any>(null);

export const useChecklist = () => {
  const context = useContext(ChecklistContext);
  if (!context) {
    throw new Error("useChecklist must be used within a ChecklistProvider");
  }
  return context;
};

export const ChecklistProvider = ({ children }: { children: ReactNode }) => {
  const { id: defaultTripId } = useParams();
  const { getRequest, patchRequest, deleteRequest, postRequest } = useApi();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [upcomingChecklistItems, setUpcomingChecklistItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statistics, setStatistics] = useState<any>({});
  const [isDataMustRefreshed, setIsDataMustRefreshed] = useState<any>(null);

  const fetchStatistics = useCallback(async (tripId: string) => {
    try {
      const response = await getRequest(`/trips/${tripId}/checklist/statistics/`);
      setStatistics(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch checklist statistics:", getErrorMessage(error));
      return {};
    }
  }, []);

  const fetchChecklistItems = useCallback(
    async (tripId: string) => {
      try {
        const queryParams =
          selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
        const response = await getRequest(
          `/trips/${tripId}/checklist/items${queryParams}`
        );
        setChecklistItems(response.data);
        return response.data;
      } catch (error) {
        console.error("Failed to fetch checklist items:", getErrorMessage(error));
        return [];
      }
    },
    [selectedCategory]
  );

  const fetchUpcomingChecklistItems = useCallback(async (tripId: string) => {
    try {
      const response = await getRequest(
        `/trips/${tripId}/checklist/items?upcoming=true`
      );
      setUpcomingChecklistItems(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch upcoming checklist items:", getErrorMessage(error));
      return [];
    }
  }, []);

  const createChecklist = useCallback(
    async (data: any, tripId: string = defaultTripId as string) => {
      try {
        setError(null);
        const response = await postRequest(
          `/trips/${tripId}/checklist/items/`,
          data
        );

        setChecklistItems((prev) =>
          [response.data, ...prev].sort(
            (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
          )
        );
        setStatistics((prev: any) => ({
          ...prev,
          total_items: prev.total_items + 1,
          category_stats: updateCategoryStats(prev, response.data, "add"),
        }));

        if (new Date(response.data.due_date) >= new Date()) {
          setUpcomingChecklistItems((prev) =>
            [response.data, ...prev].sort(
              (a, b) =>
                new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            )
          );
        }

        return response.data;
      } catch (error) {
        const errorMsg = getErrorMessage(
          error,
          "An error occurred while creating the checklist item. Please try again later."
        );
        setError(errorMsg);
        throw error;
      }
    },
    []
  );

  const toggleCompleted = useCallback(
    (id: string, tripId: string = defaultTripId as string) => {
      const toggledItem = checklistItems.find((item) => item.id === id);
      if (!toggledItem) return;

      const is_completed = !toggledItem.is_completed;

      setChecklistItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_completed } : item))
      );
      setUpcomingChecklistItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_completed } : item))
      );
      setStatistics((prev: any) => ({
        ...prev,
        completed_items: is_completed
          ? prev.completed_items + 1
          : prev.completed_items - 1,
        category_stats: prev.category_stats.map((cat: any) =>
          cat.category === toggledItem.category
            ? {
                ...cat,
                completed: is_completed ? cat.completed + 1 : cat.completed - 1,
              }
            : cat
        ),
      }));
      patchRequest(`/trips/${tripId}/checklist/items/${id}/`, { is_completed });
    },
    [checklistItems]
  );

  const deleteItem = useCallback(
    (id: string, tripId: string = defaultTripId as string) => {
      const deletedItem = checklistItems.find((item) => item.id === id);
      if (!deletedItem) return;

      setChecklistItems((prev) => prev.filter((item) => item.id !== id));
      setUpcomingChecklistItems((prev) => prev.filter((item) => item.id !== id));
      setStatistics((prev: any) => ({
        ...prev,
        total_items: prev.total_items - 1,
        completed_items: deletedItem.is_completed
          ? prev.completed_items - 1
          : prev.completed_items,
        category_stats: updateCategoryStats(prev, deletedItem, "remove"),
      }));
      deleteRequest(`/trips/${tripId}/checklist/items/${id}/`);
    },
    [checklistItems]
  );

  const refreshData = useCallback(() => {
    setIsDataMustRefreshed(Math.random());
  }, []);

  useEffect(() => {
    if (!defaultTripId) return;
    setIsLoading(true);
    Promise.all([
      fetchStatistics(defaultTripId),
      fetchUpcomingChecklistItems(defaultTripId),
      fetchChecklistItems(defaultTripId),
    ]).finally(() => setIsLoading(false));
  }, [selectedCategory, isDataMustRefreshed]);

  return (
    <ChecklistContext.Provider
      value={{
        error,
        isLoading,
        checklistItems,
        upcomingChecklistItems,
        selectedCategory,
        statistics,
        setError,
        setSelectedCategory,
        createChecklist,
        deleteItem,
        toggleCompleted,
        refreshData,
      }}
    >
      {children}
    </ChecklistContext.Provider>
  );
};
