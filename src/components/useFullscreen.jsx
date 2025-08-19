import { useCallback, useEffect, useRef, useState } from "react";

export default function useFullscreen({ onChange } = {}) {
  const ref = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFsChange = useCallback(() => {
    const fsElem =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;
    const nowFs = Boolean(fsElem);
    
    // Apply scroll-friendly styles to fullscreen element
    if (fsElem) {
      fsElem.style.overflow = 'auto';
      fsElem.style.height = '100vh';
      fsElem.style.width = '100vw';
    }
    
    setIsFullscreen(nowFs);
    if (typeof onChange === "function") onChange(nowFs, fsElem);
  }, [onChange]);

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    
    // Add CSS styles for fullscreen elements
    const style = document.createElement('style');
    style.textContent = `
      :fullscreen {
        overflow: auto !important;
        height: 100vh !important;
        width: 100vw !important;
      }
      :-webkit-full-screen {
        overflow: auto !important;
        height: 100vh !important;
        width: 100vw !important;
      }
      :-moz-full-screen {
        overflow: auto !important;
        height: 100vh !important;
        width: 100vw !important;
      }
      :-ms-fullscreen {
        overflow: auto !important;
        height: 100vh !important;
        width: 100vw !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [handleFsChange]);

  const enter = useCallback(async (el) => {
    const target = el || ref.current || document.documentElement;
    if (!target) return;
    try {
      if (target.requestFullscreen) await target.requestFullscreen();
      else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
      else if (target.mozRequestFullScreen) target.mozRequestFullScreen();
      else if (target.msRequestFullscreen) target.msRequestFullscreen();
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    } catch (err) {
      console.warn('Fullscreen exit failed:', err);
    }
  }, []);

  const toggle = useCallback((el) => {
    if (isFullscreen) return exit();
    return enter(el);
  }, [isFullscreen, enter, exit]);

  const getContainer = useCallback(() => {
    return ref.current || false;
  }, []);

  return { ref, isFullscreen, enter, exit, toggle, getContainer };
}