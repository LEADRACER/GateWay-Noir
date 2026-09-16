"use client";

import { useEffect, useState } from "react";

export function ScreenshotProtection() {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === "PrintScreen";
      const isMacScreenshot = (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4"));
      const isWindowsScreenshot = (e.metaKey && e.shiftKey && e.key === "S");
      
      if (isPrintScreen || isMacScreenshot || isWindowsScreenshot) {
        e.preventDefault();
        setIsBlurred(true);
        setTimeout(() => setIsBlurred(false), 3000);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setTimeout(() => setIsBlurred(false), 1000);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const style = document.body.style;
    style.userSelect = "none";
    style.webkitUserSelect = "none";
    (style as unknown as Record<string, string>).MozUserSelect = "none";
    (style as unknown as Record<string, string>).msUserSelect = "none";
    style.pointerEvents = "auto";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      style.userSelect = "";
      style.webkitUserSelect = "";
      (style as unknown as Record<string, string>).MozUserSelect = "";
      (style as unknown as Record<string, string>).msUserSelect = "";
    };
  }, []);

  if (isBlurred) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-black pointer-events-none"
        style={{ opacity: 1 }}
        role="alert"
        aria-live="assertive"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-3xl font-mono text-amber-400 mb-4 tracking-wider">SCREENSHOT DETECTED</div>
            <div className="text-zinc-500 text-sm uppercase tracking-wide">Content protected — screen blacked out</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}