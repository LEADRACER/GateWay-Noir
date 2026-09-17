"use client";

import { useEffect } from "react";

export function ScreenshotProtection() {
  useEffect(() => {
    let overlay: HTMLDivElement | null = null;
    let isProtected = false;

    const showProtection = () => {
      if (isProtected || overlay) return;
      isProtected = true;

      // Create overlay synchronously
      overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 2147483647;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      `;
      overlay.innerHTML = `
        <div style="text-align:center;color:#d97706;font-family:monospace;font-size:2rem;text-transform:uppercase;letter-spacing:0.1em;">
          SCREENSHOT DETECTED
        </div>
      `;
      document.documentElement.appendChild(overlay);

      // Blur the entire page content
      document.body.style.filter = "blur(20px)";
      document.body.style.pointerEvents = "none";

      // Force immediate paint
      void overlay.offsetHeight;

      // Remove after 3 seconds
      setTimeout(hideProtection, 3000);
    };

    const hideProtection = () => {
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
      document.body.style.filter = "";
      document.body.style.pointerEvents = "";
      isProtected = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === "PrintScreen";
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4");
      const isWindowsScreenshot = e.metaKey && e.shiftKey && e.key === "S";
      
      if (isPrintScreen || isMacScreenshot || isWindowsScreenshot) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showProtection();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        showProtection();
      } else {
        setTimeout(hideProtection, 500);
      }
    };

    // Use capture phase for earliest interception
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // CSS-based protection (always active)
    const style = document.createElement("style");
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      ::selection { background: transparent !important; }
      ::-moz-selection { background: transparent !important; }
      img { pointer-events: none !important; }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      style.remove();
      hideProtection();
    };
  }, []);

  return null;
}