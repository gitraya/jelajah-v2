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
import { getAPIData } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

const updateCategoryStats = (prevStats: any, item: any, operation: string) => {
  const categoryStats = prevStats.category_stats || [];
  const existingCatIndex = categoryStats.findIndex(
    (cat: any) => cat.category?.id === item.category.id
  );

  if (operation === "add") {
    if (existingCatIndex >= 0) {
      categoryStats[existingCatIndex] = {
        ...categoryStats[existingCatIndex],
        total: categoryStats[existingCatIndex].total + 1,
      };
    } else {
      categoryStats.push({ category: item.category, total: 1, packed: 0 });
    }
  } else if (operation === "remove") {
    if (existingCatIndex >= 0) {
      categoryStats[existingCatIndex] = {
        ...categoryStats[existingCatIndex],
        total: categoryStats[existingCatIndex].total - 1,
        packed: item.packed
          ? categoryStats[existingCatIndex].packed - 1
          : categoryStats[existingCatIndex].packed,
      };
    }
  }

  return categoryStats.filter((cat: any) => cat.total > 0);
};

const PackingItemsContext = createContext<any>(null);

export const usePackingItems = () => {
  const context = useContext(PackingItemsContext);
  if (!context) {
    throw new Error("usePackingItems must be used within a PackingItemsProvider");
  }
  return context;
};

export const PackingItemsProvider = ({ children }: { children: ReactNode }) => {
  const { id: defaultTripId } = useParams();
  const { getRequest, postRequest, deleteRequest, patchRequest } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packingItems, setPackingItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({});

  const fetchCategories = useCallback(async () => {
    try {
      const response = await getAPIData("/packing/categories/");
      const allCategories = [{ id: "all", name: "All" }, ...response.data];
      setCategories(allCategories);
      return allCategories;
    } catch (error) {
      console.error("Failed to fetch packing categories:", getErrorMessage(error));
      return [];
    }
  }, []);

  const fetchStatistics = useCallback(async (tripId: string) => {
    try {
      const response = await getRequest(`/trips/${tripId}/packing/statistics/`);
      setStatistics(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch packing statistics:", getErrorMessage(error));
      return {};
    }
  }, []);

  const fetchPackingItems = useCallback(
    async (tripId: string) => {
      try {
        const url = `/trips/${tripId}/packing/items${
          selectedCategory !== "all" ? `?category_id=${selectedCategory}` : ""
        }`;
        const response = await getRequest(url);
        setPackingItems(response.data);
        return response.data;
      } catch (error) {
        console.error("Failed to fetch packing items:", getErrorMessage(error));
        return [];
      }
    },
    [selectedCategory]
  );

  const createPacking = useCallback(
    async (data: any, tripId: string = defaultTripId as string) => {
      try {
        setError("");
        const response = await postRequest(
          `/trips/${tripId}/packing/items/`,
          data
        );

        setPackingItems((prev) =>
          [response.data, ...prev].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        );
        setStatistics((prev: any) => ({
          ...prev,
          total_items: (prev.total_items || 0) + 1,
          category_stats: updateCategoryStats(prev, response.data, "add"),
        }));

        return response.data;
      } catch (error) {
        setError(
          getErrorMessage(
            error,
            "An error occurred while creating the packing item. Please try again later."
          )
        );
        throw error;
      }
    },
    []
  );

  const togglePacking = useCallback(
    async (id: string, tripId: string = defaultTripId as string) => {
      const toggledItem = packingItems.find((item) => item.id === id);
      if (!toggledItem) return;

      const packed = !toggledItem.packed;

      setPackingItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, packed } : item))
      );
      setStatistics((prev: any) => ({
        ...prev,
        packed_items: packed
          ? (prev.packed_items || 0) + 1
          : (prev.packed_items || 0) - 1,
        category_stats: (prev.category_stats || []).map((cat: any) => {
          if (cat.category?.id === toggledItem.category.id) {
            return { ...cat, packed: packed ? cat.packed + 1 : cat.packed - 1 };
          }
          return cat;
        }),
      }));
      patchRequest(`/trips/${tripId}/packing/items/${id}/`, { packed });
    },
    [packingItems]
  );

  const deletePacking = useCallback(
    async (id: string, tripId: string = defaultTripId as string) => {
      const deletedItem = packingItems.find((item) => item.id === id);
      if (!deletedItem) return;

      setPackingItems((prev) => prev.filter((item) => item.id !== id));
      setStatistics((prev: any) => ({
        ...prev,
        total_items: (prev.total_items || 0) - 1,
        packed_items: deletedItem.packed
          ? (prev.packed_items || 0) - 1
          : prev.packed_items,
        category_stats: updateCategoryStats(prev, deletedItem, "remove"),
      }));
      deleteRequest(`/trips/${tripId}/packing/items/${id}/`);
    },
    [packingItems]
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!defaultTripId) return;
    setIsLoading(true);
    Promise.all([
      fetchStatistics(defaultTripId),
      fetchPackingItems(defaultTripId),
    ]).finally(() => setIsLoading(false));
  }, [selectedCategory]);

  return (
    <PackingItemsContext.Provider
      value={{
        isLoading,
        error,
        packingItems,
        selectedCategory,
        categories,
        statistics,
        setError,
        createPacking,
        togglePacking,
        deletePacking,
        setSelectedCategory,
      }}
    >
      {children}
    </PackingItemsContext.Provider>
  );
};
