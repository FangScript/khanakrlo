import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";

import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const PAKISTAN_MOBILE = /^3\d{9}$/;

/**
 * Temporary local-phone session for the explicitly preview-only OTP flow.
 * Real SMS delivery remains separate and must replace this route before launch.
 */
export function registerPreviewPhoneAuthRoutes(app: Express) {
  app.post("/api/auth/preview-phone-session", async (req: Request, res: Response) => {
    const phone = typeof req.body?.phone === "string" ? req.body.phone.replace(/\D/g, "") : "";
    if (!PAKISTAN_MOBILE.test(phone)) {
      res.status(400).json({ error: "Enter a valid Pakistan mobile number." });
      return;
    }

    const openId = `preview_phone_pk_${phone}`;
    const now = new Date();
    try {
      await upsertUser({ openId, name: "Phone preview user", email: null, loginMethod: "preview_phone", lastSignedIn: now });
      const user = await getUserByOpenId(openId);
      if (!user) throw new Error("Preview phone user could not be created.");

      const sessionToken = await sdk.createSessionToken(openId, { name: "Phone preview user", expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.json({ app_session_id: sessionToken, user: { id: user.id, openId: user.openId, name: user.name, email: user.email, loginMethod: user.loginMethod, lastSignedIn: user.lastSignedIn.toISOString() } });
    } catch (error) {
      console.error("[PreviewPhoneAuth] Could not establish preview session", error);
      res.status(500).json({ error: "Could not complete phone verification." });
    }
  });
}
