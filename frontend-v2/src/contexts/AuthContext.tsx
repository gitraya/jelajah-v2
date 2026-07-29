import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";

import { getAPIData, patchAPIData, postAPIData } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

const AuthContext = createContext<any>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async ({ disableError = false } = {}) => {
    try {
      setError(null);
      setLoading(true);

      const response = await getAPIData("/auth/me/");

      setUser(response.data);
      setIsAuthenticated(true);
      return true;
    } catch {
      if (!disableError) {
        setError("Failed to check authentication status");
      }
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      await postAPIData("/auth/token/", { email, password });
      await checkAuth();
      return true;
    } catch (error) {
      setError(getErrorMessage(error));
      return false;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await postAPIData("/auth/token/blacklist/");
      setUser(null);
      setIsAuthenticated(false);
      navigate("/");
      return true;
    } catch (error: any) {
      setError(error.message);
      return false;
    }
  };

  const setPassword = async ({
    user_id,
    token,
    new_password,
    new_password2,
  }: any) => {
    try {
      setError(null);
      await postAPIData(`/auth/set-password/${user_id}/${token}/`, {
        new_password,
        new_password2,
      });
      return true;
    } catch (error) {
      setError(getErrorMessage(error));
      return false;
    }
  };

  // /auth/me/ is a RetrieveUpdate view, so the signed-in user edits themselves
  // through the same endpoint checkAuth reads.
  const updateProfile = async (data: any) => {
    try {
      setError(null);
      const response = await patchAPIData("/auth/me/", data);
      setUser(response.data);
      return response.data;
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    }
  };

  const resendSetPasswordEmail = async (email: string) => {
    try {
      setError(null);
      await postAPIData("/auth/resend-set-password-email/", { email });
      return true;
    } catch (error) {
      setError(getErrorMessage(error));
      return false;
    }
  };

  useEffect(() => {
    checkAuth({ disableError: true });
  }, []);

  useEffect(() => {
    if (error) setError(null);
  }, [location.pathname]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        checkAuth,
        updateProfile,
        setPassword,
        resendSetPasswordEmail,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
