import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { readEnv } from "./env";

const key = (): Buffer => {
  const value = readEnv().GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return decoded;
};

export const encryptGoogleToken = (token: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
};

export const decryptGoogleToken = (payload: string): string => {
  const [ivValue, tagValue, ciphertextValue] = payload.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Invalid encrypted Google token");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
};

export const googleOAuthState = () => randomUUID();

const configuredRedirectUri = (): string | undefined => {
  const configured = readEnv().GOOGLE_OAUTH_REDIRECT_URI;
  if (!configured) return undefined;
  const hostname = new URL(configured).hostname;
  if (process.env.NODE_ENV === "production" && (hostname === "localhost" || hostname === "127.0.0.1")) {
    return "https://talentflow-web-production.up.railway.app/api/integrations/google/callback";
  }
  return configured;
};

export const googleAuthorizationUrl = (state: string): string => {
  const env = readEnv();
  const redirectUri = configuredRedirectUri();
  if (!env.GOOGLE_CLIENT_ID || !redirectUri) throw new Error("Google OAuth is not configured");
  const params = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", scope: "https://www.googleapis.com/auth/calendar", state });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

export const exchangeGoogleCode = async (code: string): Promise<{ refreshToken: string }> => {
  const env = readEnv();
  const redirectUri = configuredRedirectUri();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !redirectUri) throw new Error("Google OAuth is not configured");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: "authorization_code" }), cache: "no-store" });
  if (!response.ok) throw new Error("Google OAuth token exchange failed");
  const data = await response.json() as { refresh_token?: string };
  if (!data.refresh_token) throw new Error("Google did not return a refresh token");
  return { refreshToken: data.refresh_token };
};
