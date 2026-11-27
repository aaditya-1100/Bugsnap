import type { CaptureContext } from "../types";

const KEYS = {
  TOKEN: "bugsnap_ext_token",
  API_URL: "bugsnap_ext_api_url",
  USER_EMAIL: "bugsnap_ext_user_email",
  WORKSPACE_ID: "bugsnap_ext_workspace_id",
  PROJECT_ID: "bugsnap_ext_project_id",
  CONSOLE_CONSENT: "bugsnap_ext_console_consent",
  PENDING_CAPTURE: "bugsnap_pending_capture",
} as const;

export const DEFAULT_API_URL = "https://bugsnap-api-sandy.vercel.app";

export async function getAuthSession(): Promise<{
  token: string | null;
  email: string | null;
  apiUrl: string;
}> {
  const res = await chrome.storage.local.get([
    KEYS.TOKEN,
    KEYS.USER_EMAIL,
    KEYS.API_URL,
  ]);
  return {
    token: (res[KEYS.TOKEN] as string) || null,
    email: (res[KEYS.USER_EMAIL] as string) || null,
    apiUrl: (res[KEYS.API_URL] as string) || DEFAULT_API_URL,
  };
}

export async function setAuthSession(
  token: string,
  email: string,
  apiUrl: string
): Promise<void> {
  await chrome.storage.local.set({
    [KEYS.TOKEN]: token,
    [KEYS.USER_EMAIL]: email,
    [KEYS.API_URL]: apiUrl,
  });
}

export async function clearAuthSession(): Promise<void> {
  await chrome.storage.local.remove([KEYS.TOKEN, KEYS.USER_EMAIL]);
}

export async function getSelectionPrefs(): Promise<{
  workspaceId: string | null;
  projectId: string | null;
  consoleConsent: boolean;
}> {
  const res = await chrome.storage.local.get([
    KEYS.WORKSPACE_ID,
    KEYS.PROJECT_ID,
    KEYS.CONSOLE_CONSENT,
  ]);
  return {
    workspaceId: (res[KEYS.WORKSPACE_ID] as string) || null,
    projectId: (res[KEYS.PROJECT_ID] as string) || null,
    consoleConsent: Boolean(res[KEYS.CONSOLE_CONSENT]),
  };
}

export async function setSelectionPrefs(prefs: {
  workspaceId?: string | null;
  projectId?: string | null;
  consoleConsent?: boolean;
}): Promise<void> {
  const toSet: Record<string, unknown> = {};
  if (prefs.workspaceId !== undefined) toSet[KEYS.WORKSPACE_ID] = prefs.workspaceId;
  if (prefs.projectId !== undefined) toSet[KEYS.PROJECT_ID] = prefs.projectId;
  if (prefs.consoleConsent !== undefined) toSet[KEYS.CONSOLE_CONSENT] = prefs.consoleConsent;
  await chrome.storage.local.set(toSet);
}

export async function savePendingCapture(capture: CaptureContext): Promise<void> {
  await chrome.storage.local.set({ [KEYS.PENDING_CAPTURE]: capture });
}

export async function getPendingCapture(): Promise<CaptureContext | null> {
  const res = await chrome.storage.local.get([KEYS.PENDING_CAPTURE]);
  return (res[KEYS.PENDING_CAPTURE] as CaptureContext) || null;
}

export async function clearPendingCapture(): Promise<void> {
  await chrome.storage.local.remove([KEYS.PENDING_CAPTURE]);
}
