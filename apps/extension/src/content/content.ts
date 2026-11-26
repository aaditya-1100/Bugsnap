// Minimal, privacy-first error listener.
// Only records uncaught JS errors and unhandled promise rejections on the page.
// Never reads cookies, storage, passwords, or network payloads.
const MAX_ERRORS = 25;

interface CapturedError {
  type: "error" | "unhandledrejection";
  message: string;
  source?: string;
  line?: number;
  timestamp: string;
}

const win = window as unknown as { __bugsnapErrors?: CapturedError[] };
if (!win.__bugsnapErrors) {
  win.__bugsnapErrors = [];

  window.addEventListener("error", (event) => {
    if (!win.__bugsnapErrors) return;
    if (win.__bugsnapErrors.length >= MAX_ERRORS) win.__bugsnapErrors.shift();
    win.__bugsnapErrors.push({
      type: "error",
      message: String(event.message || "Script error").slice(0, 500),
      source: event.filename ? String(event.filename).slice(0, 300) : undefined,
      line: event.lineno || undefined,
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!win.__bugsnapErrors) return;
    if (win.__bugsnapErrors.length >= MAX_ERRORS) win.__bugsnapErrors.shift();
    win.__bugsnapErrors.push({
      type: "unhandledrejection",
      message: String(event.reason || "Unhandled promise rejection").slice(0, 500),
      timestamp: new Date().toISOString(),
    });
  });
}
