import { useLogto } from "@logto/react";
import { useEffect } from "react";
import { config } from "~/config/logto";
import { setGlobalAccessToken } from "./trpc-client";

export function useTRPCAuth() {
  const { getAccessToken, isAuthenticated } = useLogto();

  useEffect(() => {
    const updateToken = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessToken(config.resources?.[1] || "");
          setGlobalAccessToken(token);
        } catch (error) {
          console.warn("Failed to get access token:", error);
          setGlobalAccessToken(null);
        }
      } else {
        setGlobalAccessToken(null);
      }
    };

    updateToken();
  }, [getAccessToken, isAuthenticated]);
}
