import axios from "axios";

import { IS_DEVELOPMENT } from "@/config";

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;
axios.defaults.withCredentials = true;

export function getAuthConfig() {
  return {
    withCredentials: true,
  };
}

export async function getAPIData(endpoint: string, config?: any) {
  try {
    return await axios.get(endpoint, config);
  } catch (error) {
    if (IS_DEVELOPMENT) console.error("Error fetching data from API:", error);
    throw error;
  }
}

export async function postAPIData(endpoint: string, data?: any, config?: any) {
  try {
    return await axios.post(endpoint, data, config);
  } catch (error) {
    if (IS_DEVELOPMENT) console.error("Error posting data to API:", error);
    throw error;
  }
}

export async function putAPIData(endpoint: string, data?: any, config?: any) {
  try {
    return await axios.put(endpoint, data, config);
  } catch (error) {
    if (IS_DEVELOPMENT) console.error("Error updating data to API:", error);
    throw error;
  }
}

export async function patchAPIData(endpoint: string, data?: any, config?: any) {
  try {
    return await axios.patch(endpoint, data, config);
  } catch (error) {
    if (IS_DEVELOPMENT) console.error("Error patching data to API:", error);
    throw error;
  }
}

export async function deleteAPIData(endpoint: string, config?: any) {
  try {
    return await axios.delete(endpoint, config);
  } catch (error) {
    if (IS_DEVELOPMENT) console.error("Error deleting data from API:", error);
    throw error;
  }
}
