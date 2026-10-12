import { z } from "zod";
import { ApiError, type Transport } from "./http";

const sessionSchema = z.object({ accessToken: z.string().min(20), refreshToken: z.string().min(48), accessExpiresAt: z.iso.datetime(), user: z.object({ id: z.uuid(), roles: z.array(z.string()) }) });
export type Session = z.infer<typeof sessionSchema>;
export type SecretStore = { read(): Promise<string | null>; write(value: string): Promise<void>; clear(): Promise<void> };

/** One refresh in flight per install, independent of how many workspaces request data. */
export class SessionManager {
  private current: Session | null = null;
  private rotation: Promise<Session | null> | null = null;
  private listeners = new Set<() => void>();
  private generation = 0;
  constructor(private transport: Transport, private store: SecretStore) {}
  snapshot = () => this.current;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(session: Session | null) { this.current = session; this.listeners.forEach((listener) => listener()); }
  async signIn(idToken: string, clientType: "android" | "ios") {
    const session = sessionSchema.parse(await this.transport("/identity/sessions/google",{ method:"POST",body:{ idToken,clientType } }));
    await this.store.write(session.refreshToken); this.generation++; this.emit(session);
  }
  restore = (): Promise<Session | null> => {
    if (this.rotation) return this.rotation;
    const generation = this.generation;
    const work = (async () => {
      const refreshToken = this.current?.refreshToken ?? await this.store.read();
      if (!refreshToken) return null;
      try {
        const next = sessionSchema.parse(await this.transport("/identity/sessions/refresh",{ method:"POST",body:{ refreshToken } }));
        if (generation !== this.generation) return null;
        await this.store.write(next.refreshToken); this.emit(next); return next;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && generation === this.generation) { await this.store.clear(); this.emit(null); }
        throw error;
      }
    })();
    this.rotation = work;
    void work.finally(() => { if (this.rotation === work) this.rotation = null; }).catch(() => undefined);
    return work;
  };
  async accessToken() {
    const session = this.current;
    if (!session) throw new ApiError(401,"SIGN_IN_REQUIRED","Sign in to continue.");
    if (Date.parse(session.accessExpiresAt) > Date.now()+30000) return session.accessToken;
    const refreshed = await this.restore();
    if (!refreshed) throw new ApiError(401,"SIGN_IN_REQUIRED","Sign in to continue.");
    return refreshed.accessToken;
  }
  async logout() {
    // Finish any rotation before revoking; never let a late response sign the user back in.
    await this.rotation?.catch(() => undefined);
    const token = this.current?.accessToken;
    this.generation++; this.emit(null);
    await this.store.clear();
    if (token) await this.transport("/identity/sessions/logout",{ method:"POST",token,body:{} });
  }
}
