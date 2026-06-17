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

const updateCategoryStats = (prevStats: any, expense: any, isAdding = true) => {
  const multiplier = isAdding ? 1 : -1;
  const existingCategoryIndex = prevStats.category_stats.findIndex(
    (cat: any) => cat.category.id === expense.category.id
  );

  if (existingCategoryIndex !== -1) {
    const updatedStats = [...prevStats.category_stats];
    updatedStats[existingCategoryIndex] = {
      ...updatedStats[existingCategoryIndex],
      amount:
        updatedStats[existingCategoryIndex].amount + expense.amount * multiplier,
      count: updatedStats[existingCategoryIndex].count + 1 * multiplier,
    };
    return updatedStats.filter((cat) => cat.count > 0);
  } else if (isAdding) {
    return [
      ...prevStats.category_stats,
      { category: expense.category, amount: expense.amount, count: 1 },
    ];
  }
  return prevStats.category_stats;
};

const ExpensesContext = createContext<any>(null);

export const useExpenses = () => {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error("useExpenses must be used within an ExpensesProvider");
  }
  return context;
};

export const ExpensesProvider = ({ children }: { children: ReactNode }) => {
  const { id: defaultTripId } = useParams();
  const { getRequest, deleteRequest, postRequest } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({});
  const [isDataMustRefreshed, setIsDataMustRefreshed] = useState<any>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await getAPIData("/expenses/categories/");
      const categoriesData = [{ id: "all", name: "All" }, ...response.data];
      setCategories(categoriesData);
      return categoriesData;
    } catch (error) {
      console.error("Failed to fetch expense categories:", getErrorMessage(error));
      return [];
    }
  }, []);

  const fetchStatistics = useCallback(async (tripId: string) => {
    try {
      const response = await getRequest(`/trips/${tripId}/expenses/statistics/`);
      setStatistics(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch expense statistics:", getErrorMessage(error));
      return {};
    }
  }, []);

  const fetchExpenses = useCallback(async (tripId: string) => {
    try {
      const response = await getRequest(`/trips/${tripId}/expenses/items/`);
      setExpenses(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch expenses:", getErrorMessage(error));
      return [];
    }
  }, []);

  const createExpense = useCallback(
    async (data: any, tripId: string = defaultTripId as string) => {
      try {
        setError("");
        const response = await postRequest(
          `/trips/${tripId}/expenses/items/`,
          data
        );

        setExpenses((prev) =>
          [...prev, response.data].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
        setStatistics((prev: any) => ({
          ...prev,
          amount_spent: prev.amount_spent + response.data.amount,
          budget_remaining: prev.budget_remaining - response.data.amount,
          category_stats: updateCategoryStats(prev, response.data, true),
        }));

        return response.data;
      } catch (error) {
        setError(
          getErrorMessage(
            error,
            "An error occurred while creating the expense. Please try again later."
          )
        );
        throw error;
      }
    },
    []
  );

  const deleteExpense = useCallback(
    async (id: string, tripId: string = defaultTripId as string) => {
      const deletedExpense = expenses.find((item) => item.id === id);
      if (!deletedExpense) return;

      setExpenses((prev) => prev.filter((item) => item.id !== id));
      setStatistics((prev: any) => ({
        ...prev,
        amount_spent: prev.amount_spent - deletedExpense.amount,
        budget_remaining: prev.budget_remaining + deletedExpense.amount,
        category_stats: updateCategoryStats(prev, deletedExpense, false),
      }));
      deleteRequest(`/trips/${tripId}/expenses/items/${id}/`);
    },
    [expenses]
  );

  const refreshData = useCallback(() => {
    setIsDataMustRefreshed(Math.random());
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!defaultTripId) return;
    setIsLoading(true);
    Promise.all([
      fetchStatistics(defaultTripId),
      fetchExpenses(defaultTripId),
    ]).finally(() => setIsLoading(false));
  }, [isDataMustRefreshed]);

  return (
    <ExpensesContext.Provider
      value={{
        error,
        isLoading,
        expenses,
        categories,
        statistics,
        setError,
        createExpense,
        deleteExpense,
        refreshData,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};
