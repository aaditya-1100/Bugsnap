import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as fabric from "fabric";
import {
  ArrowUpRight,
  EyeOff,
  Highlighter,
  MousePointer,
  RotateCcw,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";

import type { AnnotationTool } from "../../types";

export interface AnnotationEditorHandle {
  exportWebPBlob: () => Promise<Blob>;
}

interface AnnotationEditorProps {
  imageDataUrl: string;
  maxWidth?: number;
}

const TOOLS: { id: AnnotationTool; label: string; hint: string; icon: typeof Square }[] = [
  { id: "select", label: "Select", hint: "Click to move/resize · Press Delete to remove", icon: MousePointer },
  { id: "rect", label: "Rect", hint: "Drag to frame an issue", icon: Square },
  { id: "arrow", label: "Arrow", hint: "Drag to point directly at a bug", icon: ArrowUpRight },
  { id: "highlight", label: "Highlight", hint: "Drag to highlight text or UI (switch color if needed)", icon: Highlighter },
  { id: "text", label: "Text", hint: "Click anywhere on the screenshot to add a note", icon: Type },
  { id: "blur", label: "Redact", hint: "Drag over sensitive data to pixelate permanently", icon: EyeOff },
];

const SWATCHES = [
  { id: "yellow", label: "Yellow", hex: "#facc15" },
  { id: "cyan", label: "Cyan", hex: "#22d3ee" },
  { id: "rose", label: "Rose", hex: "#fb7185" },
  { id: "green", label: "Green", hex: "#4ade80" },
  { id: "white", label: "White", hex: "#ffffff" },
];

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createPixelatedDataUrl(
  sourceImg: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): string {
  const w = Math.max(4, Math.round(sw));
  const h = Math.max(4, Math.round(sh));
  const blockSize = 10;
  const smallW = Math.max(2, Math.floor(w / blockSize));
  const smallH = Math.max(2, Math.floor(h / blockSize));

  const tiny = document.createElement("canvas");
  tiny.width = smallW;
  tiny.height = smallH;
  const tctx = tiny.getContext("2d")!;
  tctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, smallW, smallH);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(tiny, 0, 0, smallW, smallH, 0, 0, w, h);
  return out.toDataURL("image/png");
}

export const AnnotationEditor = forwardRef<
  AnnotationEditorHandle,
  AnnotationEditorProps
>(function AnnotationEditor({ imageDataUrl }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const sourceImgRef = useRef<HTMLImageElement | null>(null);
  const scaleRef = useRef<number>(1);

  const [tool, setTool] = useState<AnnotationTool>("arrow");
  const [color, setColor] = useState<string>("#facc15");
  const [fitMode, setFitMode] = useState<"fit" | "actual">("fit");
  const [hasSelection, setHasSelection] = useState(false);

  const toolRef = useRef<AnnotationTool>("arrow");
  const colorRef = useRef<string>("#facc15");
  toolRef.current = tool;
  colorRef.current = color;

  useEffect(() => {
    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const canvas = new fabric.Canvas(el, {
      selection: true,
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    const applySizing = (img: fabric.FabricImage) => {
      const origW = img.width || 800;
      const origH = img.height || 600;
      const availW = Math.max(300, container.clientWidth - 16);
      const availH = Math.max(240, container.clientHeight - 16);
      const scale =
        fitMode === "fit"
          ? Math.min(availW / origW, availH / origH, 1)
          : 1;
      scaleRef.current = scale;

      canvas.setDimensions({
        width: Math.round(origW * scale),
        height: Math.round(origH * scale),
      });
      img.scale(scale);
      img.set({ selectable: false, evented: false });
      canvas.backgroundImage = img;
      canvas.renderAll();
    };

    let bgFabricImg: fabric.FabricImage | null = null;
    const htmlImg = new Image();
    htmlImg.src = imageDataUrl;
    sourceImgRef.current = htmlImg;

    fabric.FabricImage.fromURL(imageDataUrl).then((img) => {
      bgFabricImg = img;
      applySizing(img);
    });

    const ro = new ResizeObserver(() => {
      if (bgFabricImg && fitMode === "fit") {
        applySizing(bgFabricImg);
      }
    });
    ro.observe(container);

    const updateSelection = () => {
      setHasSelection(Boolean(canvas.getActiveObject()));
    };
    canvas.on("selection:created", updateSelection);
    canvas.on("selection:updated", updateSelection);
    canvas.on("selection:cleared", updateSelection);

    const styleControl = (obj: fabric.FabricObject) => {
      obj.set({
        cornerColor: "#ffffff",
        cornerStrokeColor: "#000000",
        borderColor: "#ffffff",
        cornerSize: 8,
        transparentCorners: false,
      });
    };

    const contrastShadow = new fabric.Shadow({
      color: "rgba(0, 0, 0, 0.7)",
      blur: 4,
      offsetX: 0,
      offsetY: 1,
    });

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let activeObj: fabric.FabricObject | null = null;
    let arrowLine: fabric.Line | null = null;
    let arrowHead: fabric.Triangle | null = null;

    canvas.on("mouse:down", (opt) => {
      const currentTool = toolRef.current;
      const currentColor = colorRef.current;
      if (currentTool === "select") return;
      // If clicking an existing object in non-select mode while holding Shift, ignore
      const pointer = canvas.getScenePoint(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      if (currentTool === "text") {
        const text = new fabric.IText("Note", {
          left: startX,
          top: startY,
          fontSize: 15,
          fontFamily: "system-ui, -apple-system, sans-serif",
          fill: currentColor === "#000000" ? "#ffffff" : currentColor,
          fontWeight: "600",
          backgroundColor: "rgba(0, 0, 0, 0.82)",
          padding: 6,
          shadow: contrastShadow,
        });
        styleControl(text);
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
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
          stroke: currentColor,
          strokeWidth: 2.5,
          rx: 4,
          ry: 4,
          shadow: contrastShadow,
        });
        styleControl(activeObj);
        canvas.add(activeObj);
      } else if (currentTool === "highlight") {
        activeObj = new fabric.Rect({
          left: startX,
          top: startY,
          width: 1,
          height: 1,
          fill: hexToRgba(currentColor, 0.32),
          stroke: hexToRgba(currentColor, 0.9),
          strokeWidth: 1.5,
          rx: 4,
          ry: 4,
        });
        styleControl(activeObj);
        canvas.add(activeObj);
      } else if (currentTool === "blur") {
        // Preview dashed frame while dragging; replaced with true mosaic on mouse:up
        activeObj = new fabric.Rect({
          left: startX,
          top: startY,
          width: 1,
          height: 1,
          fill: "rgba(255, 255, 255, 0.14)",
          stroke: "#ffffff",
          strokeWidth: 1.5,
          strokeDashArray: [4, 3],
          rx: 4,
          ry: 4,
        });
        canvas.add(activeObj);
      } else if (currentTool === "arrow") {
        arrowLine = new fabric.Line([startX, startY, startX, startY], {
          stroke: currentColor,
          strokeWidth: 3,
          strokeLineCap: "round",
          shadow: contrastShadow,
          selectable: false,
          evented: false,
        });
        arrowHead = new fabric.Triangle({
          left: startX,
          top: startY,
          originX: "center",
          originY: "center",
          width: 13,
          height: 15,
          fill: currentColor,
          shadow: contrastShadow,
          selectable: false,
          evented: false,
        });
        canvas.add(arrowLine);
        canvas.add(arrowHead);
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (!isDrawing) return;
      const pointer = canvas.getScenePoint(opt.e);
      const currentTool = toolRef.current;

      if (currentTool === "arrow" && arrowLine && arrowHead) {
        const dx = pointer.x - startX;
        const dy = pointer.y - startY;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        arrowLine.set({ x2: pointer.x, y2: pointer.y });
        arrowHead.set({ left: pointer.x, top: pointer.y, angle });
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
      const currentTool = toolRef.current;

      if (currentTool === "arrow" && arrowLine && arrowHead) {
        const x1 = arrowLine.x1 ?? 0;
        const y1 = arrowLine.y1 ?? 0;
        const x2 = arrowLine.x2 ?? 0;
        const y2 = arrowLine.y2 ?? 0;
        canvas.remove(arrowLine);
        canvas.remove(arrowHead);

        if (Math.hypot(x2 - x1, y2 - y1) >= 8) {
          const group = new fabric.Group([arrowLine, arrowHead]);
          styleControl(group);
          canvas.add(group);
          canvas.setActiveObject(group);
        }
        arrowLine = null;
        arrowHead = null;
      } else if (currentTool === "blur" && activeObj instanceof fabric.Rect) {
        const left = activeObj.left ?? 0;
        const top = activeObj.top ?? 0;
        const width = activeObj.width ?? 0;
        const height = activeObj.height ?? 0;
        canvas.remove(activeObj);

        if (width >= 8 && height >= 8 && sourceImgRef.current) {
          const s = scaleRef.current || 1;
          const mosaicUrl = createPixelatedDataUrl(
            sourceImgRef.current,
            left / s,
            top / s,
            width / s,
            height / s
          );
          fabric.FabricImage.fromURL(mosaicUrl).then((mosaicImg) => {
            mosaicImg.set({
              left,
              top,
              scaleX: width / (mosaicImg.width || width),
              scaleY: height / (mosaicImg.height || height),
              stroke: "rgba(255, 255, 255, 0.35)",
              strokeWidth: 1,
            });
            styleControl(mosaicImg);
            canvas.add(mosaicImg);
            canvas.renderAll();
          });
        }
      } else if (activeObj instanceof fabric.Rect) {
        if ((activeObj.width ?? 0) < 6 || (activeObj.height ?? 0) < 6) {
          canvas.remove(activeObj);
        } else {
          canvas.setActiveObject(activeObj);
        }
      }

      activeObj = null;
      canvas.renderAll();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const active = canvas.getActiveObject();
      if (active && !(active instanceof fabric.IText && active.isEditing)) {
        canvas.remove(active);
        canvas.discardActiveObject();
        canvas.renderAll();
        setHasSelection(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [imageDataUrl, fitMode]);

  useImperativeHandle(ref, () => ({
    async exportWebPBlob(): Promise<Blob> {
      const canvas = fabricRef.current;
      if (!canvas) {
        throw new Error("Canvas not initialized");
      }
      canvas.discardActiveObject();
      canvas.renderAll();
      const multiplier = Math.max(1, 1 / (scaleRef.current || 1));
      const dataUrl = canvas.toDataURL({
        format: "webp",
        quality: 0.85,
        multiplier: Math.min(2, multiplier),
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

  function handleDeleteSelected() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.renderAll();
      setHasSelection(false);
    }
  }

  function handleClear() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((o) => canvas.remove(o));
    canvas.renderAll();
  }

  const activeToolMeta = TOOLS.find((t) => t.id === tool);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#2f3336] bg-[#16181c] px-2.5 py-1.5">
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
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "text-[#e7e9ea] hover:bg-[#202327]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-[#2f3336] bg-black px-2 py-1">
            {SWATCHES.map((s) => (
              <button
                key={s.id}
                type="button"
                title={`Color: ${s.label}`}
                onClick={() => setColor(s.hex)}
                style={{ backgroundColor: s.hex }}
                className={`h-3.5 w-3.5 rounded-full transition-transform ${
                  color === s.hex
                    ? "scale-110 ring-2 ring-white ring-offset-1 ring-offset-black"
                    : "opacity-75 hover:opacity-100"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFitMode((m) => (m === "fit" ? "actual" : "fit"))}
            className="rounded-full border border-[#2f3336] px-2.5 py-1 text-[11px] font-medium text-[#e7e9ea] hover:bg-[#202327]"
          >
            {fitMode === "fit" ? "Fit Screen" : "100%"}
          </button>

          {hasSelection ? (
            <button
              type="button"
              title="Delete selected"
              onClick={handleDeleteSelected}
              className="rounded-full p-1.5 text-red-400 hover:bg-[#202327]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            title="Undo"
            onClick={handleUndo}
            className="rounded-full p-1.5 text-[#71767b] hover:bg-[#202327] hover:text-white"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Clear all"
            onClick={handleClear}
            className="rounded-full p-1.5 text-[#71767b] hover:bg-[#202327] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`flex flex-1 items-center justify-center rounded-2xl border border-[#2f3336] bg-black p-2 ${
          fitMode === "fit" ? "overflow-hidden" : "overflow-auto"
        }`}
      >
        <canvas ref={canvasElRef} />
      </div>

      <div className="flex items-center justify-between px-1 text-[11px] text-[#71767b]">
        <span>
          <strong className="font-medium text-[#e7e9ea]">
            {activeToolMeta?.label}:
          </strong>{" "}
          {activeToolMeta?.hint}
        </span>
        <span>Redactions pixelate permanently before upload</span>
      </div>
    </div>
  );
});
