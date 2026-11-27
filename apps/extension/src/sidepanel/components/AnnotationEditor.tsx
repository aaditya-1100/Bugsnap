import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import * as fabric from "fabric";
import {
  ArrowUpRight,
  EyeOff,
  Highlighter,
  MousePointer,
  RotateCcw,
  Square,
  Type,
  Undo2,
} from "lucide-react";

import type { AnnotationTool } from "../../types";

export interface AnnotationEditorHandle {
  exportWebPBlob: () => Promise<Blob>;
}

interface AnnotationEditorProps {
  imageDataUrl: string;
}

const TOOLS: { id: AnnotationTool; label: string; icon: typeof Square }[] = [
  { id: "select", label: "Select", icon: MousePointer },
  { id: "rect", label: "Rect", icon: Square },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight },
  { id: "highlight", label: "Highlight", icon: Highlighter },
  { id: "text", label: "Text", icon: Type },
  { id: "blur", label: "Redact", icon: EyeOff },
];

export const AnnotationEditor = forwardRef<
  AnnotationEditorHandle,
  AnnotationEditorProps
>(function AnnotationEditor({ imageDataUrl }, ref) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [tool, setTool] = useState<AnnotationTool>("rect");
  const toolRef = useRef<AnnotationTool>("rect");
  toolRef.current = tool;

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    const canvas = new fabric.Canvas(el, {
      selection: true,
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    fabric.FabricImage.fromURL(imageDataUrl).then((img) => {
      const maxWidth = 340;
      const origW = img.width || 800;
      const origH = img.height || 600;
      const scale = Math.min(1, maxWidth / origW);
      const displayW = Math.round(origW * scale);
      const displayH = Math.round(origH * scale);

      canvas.setDimensions({ width: displayW, height: displayH });
      img.scale(scale);
      img.set({ selectable: false, evented: false });
      canvas.backgroundImage = img;
      canvas.renderAll();
    });

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let activeObj: fabric.FabricObject | null = null;

    canvas.on("mouse:down", (opt) => {
      const currentTool = toolRef.current;
      if (currentTool === "select") return;
      const pointer = canvas.getScenePoint(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      if (currentTool === "text") {
        const text = new fabric.IText("Note", {
          left: startX,
          top: startY,
          fontSize: 16,
          fill: "#ef4444",
          fontWeight: "bold",
          backgroundColor: "rgba(9,9,11,0.75)",
          padding: 4,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        setTool("select");
        return;
      }

      isDrawing = true;
      if (currentTool === "rect") {
        activeObj = new fabric.Rect({
          left: startX,
          top: startY,
          width: 1,
          height: 1,
          fill: "transparent",
          stroke: "#ef4444",
          strokeWidth: 2,
        });
      } else if (currentTool === "highlight") {
        activeObj = new fabric.Rect({
          left: startX,
          top: startY,
          width: 1,
          height: 1,
          fill: "rgba(250, 204, 21, 0.35)",
          stroke: "#eab308",
          strokeWidth: 1,
        });
      } else if (currentTool === "blur") {
        // Solid opaque privacy redaction block (irreversible when exported)
        activeObj = new fabric.Rect({
          left: startX,
          top: startY,
          width: 1,
          height: 1,
          fill: "#09090b",
          stroke: "#3f3f46",
          strokeWidth: 1,
          rx: 2,
          ry: 2,
        });
      } else if (currentTool === "arrow") {
        activeObj = new fabric.Line([startX, startY, startX, startY], {
          stroke: "#ef4444",
          strokeWidth: 2.5,
        });
      }

      if (activeObj) {
        canvas.add(activeObj);
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (!isDrawing || !activeObj) return;
      const pointer = canvas.getScenePoint(opt.e);
      const currentTool = toolRef.current;

      if (currentTool === "arrow" && activeObj instanceof fabric.Line) {
        activeObj.set({ x2: pointer.x, y2: pointer.y });
      } else if (activeObj instanceof fabric.Rect) {
        const left = Math.min(startX, pointer.x);
        const top = Math.min(startY, pointer.y);
        const width = Math.abs(pointer.x - startX);
        const height = Math.abs(pointer.y - startY);
        activeObj.set({ left, top, width, height });
      }
      canvas.renderAll();
    });

    canvas.on("mouse:up", () => {
      if (!isDrawing) return;
      isDrawing = false;
      if (toolRef.current === "arrow" && activeObj instanceof fabric.Line) {
        const x1 = activeObj.x1 ?? 0;
        const y1 = activeObj.y1 ?? 0;
        const x2 = activeObj.x2 ?? 0;
        const y2 = activeObj.y2 ?? 0;
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90;
        const head = new fabric.Triangle({
          left: x2,
          top: y2,
          originX: "center",
          originY: "center",
          width: 10,
          height: 12,
          fill: "#ef4444",
          angle,
        });
        canvas.add(head);
      }
      activeObj = null;
      canvas.renderAll();
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [imageDataUrl]);

  useImperativeHandle(ref, () => ({
    async exportWebPBlob(): Promise<Blob> {
      const canvas = fabricRef.current;
      if (!canvas) {
        throw new Error("Canvas not initialized");
      }
      canvas.discardActiveObject();
      canvas.renderAll();
      const dataUrl = canvas.toDataURL({
        format: "webp",
        quality: 0.85,
        multiplier: 2,
      });
      const res = await fetch(dataUrl);
      return res.blob();
    },
  }));

  function handleUndo() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
    }
  }

  function handleClear() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((o) => canvas.remove(o));
    canvas.renderAll();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1 rounded-md border border-zinc-800 bg-zinc-900 p-1">
        <div className="flex flex-wrap items-center gap-1">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                title={t.label}
                onClick={() => setTool(t.id)}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Undo"
            onClick={handleUndo}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Clear annotations"
            onClick={handleClear}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
        <canvas ref={canvasElRef} />
      </div>
      <p className="text-[11px] text-zinc-500">
        Use <span className="text-zinc-300">Redact</span> to permanently cover
        passwords, tokens, or PII before upload.
      </p>
    </div>
  );
});
