export interface SelectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}

/**
 * Injected into the active webpage via chrome.scripting.executeScript.
 * Must be completely self-contained (no external imports).
 */
export function injectedRegionSelector(): Promise<SelectedRegion | null> {
  return new Promise((resolve) => {
    const existing = document.getElementById("__bugsnap_snip_overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "__bugsnap_snip_overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.45)",
      zIndex: "2147483647",
      cursor: "crosshair",
      userSelect: "none",
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
      position: "fixed",
      border: "2px solid #ffffff",
      background: "rgba(255, 255, 255, 0.08)",
      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.35)",
      display: "none",
      pointerEvents: "none",
    });

    const badge = document.createElement("div");
    Object.assign(badge.style, {
      position: "fixed",
      background: "#000000",
      color: "#ffffff",
      border: "1px solid #3f3f46",
      borderRadius: "4px",
      padding: "2px 6px",
      fontSize: "11px",
      fontFamily: "system-ui, sans-serif",
      display: "none",
      pointerEvents: "none",
      zIndex: "2147483647",
    });

    const hint = document.createElement("div");
    hint.textContent = "Drag to select area · Press Esc to cancel";
    Object.assign(hint.style, {
      position: "fixed",
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#000000",
      color: "#ffffff",
      border: "1px solid #3f3f46",
      borderRadius: "6px",
      padding: "6px 12px",
      fontSize: "12px",
      fontFamily: "system-ui, sans-serif",
      pointerEvents: "none",
    });

    overlay.appendChild(box);
    overlay.appendChild(badge);
    overlay.appendChild(hint);
    document.documentElement.appendChild(overlay);

    let dragging = false;
    let startX = 0;
    let startY = 0;

    function cleanup() {
      window.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup();
        resolve(null);
      }
    }

    window.addEventListener("keydown", onKeyDown, true);

    overlay.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      box.style.display = "block";
      box.style.left = `${startX}px`;
      box.style.top = `${startY}px`;
      box.style.width = "0px";
      box.style.height = "0px";
      badge.style.display = "block";
    });

    overlay.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;

      badge.textContent = `${Math.round(w)} × ${Math.round(h)}`;
      badge.style.left = `${x}px`;
      badge.style.top = `${Math.max(8, y - 24)}px`;
    });

    overlay.addEventListener("mouseup", (e) => {
      if (!dragging) return;
      dragging = false;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const width = Math.abs(e.clientX - startX);
      const height = Math.abs(e.clientY - startY);
      cleanup();

      if (width < 12 || height < 12) {
        resolve(null);
        return;
      }

      // Wait two animation frames so the page repaints cleanly without the overlay
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve({
            x,
            y,
            width,
            height,
            devicePixelRatio: window.devicePixelRatio || 1,
          });
        });
      });
    });
  });
}

export async function cropDataUrlToRegion(
  dataUrl: string,
  region: SelectedRegion
): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load captured image"));
  });

  const dpr = region.devicePixelRatio || 1;
  const sx = Math.max(0, Math.round(region.x * dpr));
  const sy = Math.max(0, Math.round(region.y * dpr));
  const sw = Math.min(img.width - sx, Math.round(region.width * dpr));
  const sh = Math.min(img.height - sy, Math.round(region.height * dpr));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, sw);
  canvas.height = Math.max(1, sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL("image/png");
}
