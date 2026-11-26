import type { BrowserMetadata, ConsoleErrorEntry, ViewportMetadata } from "../types";

export function collectBrowserMetadata(): BrowserMetadata {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || "unknown",
    language: navigator.language || "en",
  };
}

export async function getActiveTabPageContext(
  includeConsoleErrors: boolean
): Promise<{
  pageUrl: string;
  pageTitle: string;
  viewportInfo: ViewportMetadata;
  consoleErrors: ConsoleErrorEntry[];
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl = tab?.url || "";
  const pageTitle = tab?.title || "";
  const fallbackViewport: ViewportMetadata = {
    width: tab?.width || 0,
    height: tab?.height || 0,
    devicePixelRatio: 1,
  };

  if (!tab?.id || !pageUrl.startsWith("http")) {
    return {
      pageUrl,
      pageTitle,
      viewportInfo: fallbackViewport,
      consoleErrors: [],
    };
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (collectErrors: boolean) => {
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1,
        };
        const errors = collectErrors
          ? ((window as unknown as { __bugsnapErrors?: ConsoleErrorEntry[] })
              .__bugsnapErrors || [])
          : [];
        return { viewport, errors };
      },
      args: [includeConsoleErrors],
    });

    const data = result?.result as
      | { viewport: ViewportMetadata; errors: ConsoleErrorEntry[] }
      | undefined;

    return {
      pageUrl,
      pageTitle,
      viewportInfo: data?.viewport || fallbackViewport,
      consoleErrors: includeConsoleErrors ? data?.errors || [] : [],
    };
  } catch {
    return {
      pageUrl,
      pageTitle,
      viewportInfo: fallbackViewport,
      consoleErrors: [],
    };
  }
}
