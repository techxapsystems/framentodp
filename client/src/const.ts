export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// TechXap Branding
export const TECHXAP_LOGO = "/techxap-logo.webp";
export const APP_NAME = "TechXap Systems SaaS";
export const APP_TAGLINE = "Dashboard Operacional de Motoristas";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
