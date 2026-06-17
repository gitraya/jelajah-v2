import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useApi } from "@/hooks/useApi";
import { getErrorMessage } from "@/lib/utils";

const TagsContext = createContext<any>(null);

export const useTags = () => {
  const context = useContext(TagsContext);
  if (!context) {
    throw new Error("useTags must be used within a TagsProvider");
  }
  return context;
};

export const TagsProvider = ({ children }: { children: ReactNode }) => {
  const [tags, setTags] = useState<any[]>([]);
  const { getRequest } = useApi();

  const fetchTags = useCallback(async () => {
    try {
      const response = await getRequest("/tags/");
      setTags(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch tags:", getErrorMessage(error));
      return [];
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, []);

  return <TagsContext.Provider value={{ tags }}>{children}</TagsContext.Provider>;
};
