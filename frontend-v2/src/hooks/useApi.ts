import { IS_DEVELOPMENT } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteAPIData,
  getAPIData,
  patchAPIData,
  postAPIData,
  putAPIData,
} from "@/lib/api";

// Shared across hook instances so parallel 401s (e.g. several pollers hitting
// an expired token at once) trigger a single refresh.
let refreshInFlight: Promise<boolean> | null = null;

export const useApi = () => {
  const { checkAuth } = useAuth();

  const refreshToken = () => {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          await postAPIData("/auth/token/refresh/");
          await checkAuth({ silent: true });
          return true;
        } catch (error) {
          if (IS_DEVELOPMENT) console.error("Token refresh error:", error);
          return false;
        } finally {
          refreshInFlight = null;
        }
      })();
    }
    return refreshInFlight;
  };

  const getRequest = async (endpoint: string, config?: any): Promise<any> => {
    try {
      return await getAPIData(endpoint, config);
    } catch (error: any) {
      if (error.response?.status === 401 && (await refreshToken())) {
        return getRequest(endpoint, config);
      }
      throw error;
    }
  };

  const postRequest = async (
    endpoint: string,
    data?: any,
    config?: any
  ): Promise<any> => {
    try {
      return await postAPIData(endpoint, data, config);
    } catch (error: any) {
      if (error.response?.status === 401 && (await refreshToken())) {
        return postRequest(endpoint, data, config);
      }
      throw error;
    }
  };

  const putRequest = async (
    endpoint: string,
    data?: any,
    config?: any
  ): Promise<any> => {
    try {
      return await putAPIData(endpoint, data, config);
    } catch (error: any) {
      if (error.response?.status === 401 && (await refreshToken())) {
        return putRequest(endpoint, data, config);
      }
      throw error;
    }
  };

  const patchRequest = async (
    endpoint: string,
    data?: any,
    config?: any
  ): Promise<any> => {
    try {
      return await patchAPIData(endpoint, data, config);
    } catch (error: any) {
      if (error.response?.status === 401 && (await refreshToken())) {
        return patchRequest(endpoint, data, config);
      }
      throw error;
    }
  };

  const deleteRequest = async (
    endpoint: string,
    config?: any
  ): Promise<any> => {
    try {
      return await deleteAPIData(endpoint, config);
    } catch (error: any) {
      if (error.response?.status === 401 && (await refreshToken())) {
        return deleteRequest(endpoint, config);
      }
      throw error;
    }
  };

  return { getRequest, postRequest, putRequest, patchRequest, deleteRequest };
};
