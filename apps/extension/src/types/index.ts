export type AnnotationTool = "select" | "rect" | "arrow" | "text" | "highlight" | "blur";

export interface BrowserMetadata {
  userAgent: string;
  platform: string;
  language: string;
}

export interface ViewportMetadata {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface ConsoleErrorEntry {
  type: "error" | "unhandledrejection";
  message: string;
  source?: string;
  line?: number;
  timestamp: string;
}

export interface CaptureContext {
  dataUrl: string;
  pageUrl: string;
  pageTitle: string;
  capturedAt: string;
  browserInfo: BrowserMetadata;
  viewportInfo: ViewportMetadata;
  consoleErrors: ConsoleErrorEntry[];
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  url: string | null;
}
