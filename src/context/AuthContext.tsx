import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Define the User type
interface User {
  id?: string;
  username: string;
  email: string;
  name: string;
}

// Define the authentication context type
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      axios
        .get<User>("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }) // Fetch user data
        .then((response) => {
          setUser(response.data);
          setIsAuthenticated(true);
        });
    }
  }, []);

  // Memoized login function using useCallback
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await axios.post<{ token: string; user: User }>(
        "https://softinvite-api.onrender.com/admin/login",
        { email, password }
      );

      // Rename destructured 'user' to 'userData' to avoid shadowing
      const { token, user: userData } = response.data;
      localStorage.setItem("token", token);
      setUser(userData);
      setIsAuthenticated(true);
      navigate("/home"); // Redirect after login
    } catch (error) {
      console.error("Login failed", error);
    }
  }, [navigate]);

  // Memoize the context value to avoid unnecessary re-renders
  const authContextValue = useMemo(
    () => ({
      isAuthenticated,
      user,
      login,
    }),
    [isAuthenticated, user, login]
  );

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

// Hook to use authentication
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
