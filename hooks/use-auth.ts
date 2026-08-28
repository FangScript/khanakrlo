import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = { autoFetch?: boolean };

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        setUser(null);
        await Auth.clearUserInfo();
        return;
      }
      const apiUser = await Api.getMe();
      if (!apiUser) {
        setUser(null);
        await Auth.clearUserInfo();
        return;
      }
      const userInfo: Auth.User = {
        id: apiUser.id,
        openId: apiUser.openId,
        name: apiUser.name,
        email: apiUser.email,
        loginMethod: apiUser.loginMethod,
        lastSignedIn: new Date(apiUser.lastSignedIn),
      };
      setUser(userInfo);
      await Auth.setUserInfo(userInfo);
    } catch (caught) {
      const nextError = caught instanceof Error ? caught : new Error("Failed to fetch the authenticated user");
      setError(nextError);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch {
      // Local Supabase sign-out must still complete if server cookie cleanup is unavailable.
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) void fetchUser();
    else setLoading(false);
  }, [autoFetch, fetchUser]);

  return { user, loading, error, isAuthenticated: useMemo(() => Boolean(user), [user]), refresh: fetchUser, logout };
}
