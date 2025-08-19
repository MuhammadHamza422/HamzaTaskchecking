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
    setIsFullscreen(nowFs);
    if (typeof onChange === "function") onChange(nowFs, fsElem);
  }, [onChange]);

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
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
      // ignore or let caller handle
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    } catch (err) {
      // ignore
    }
  }, []);

  const toggle = useCallback((el) => {
    if (isFullscreen) return exit();
    return enter(el);
  }, [isFullscreen, enter, exit]);

  /**
   * getContainer for AntD:
   * - return ref.current when you want Drawer mounted inside the fullscreen container
   * - return false to render inline in-place if no fullscreen element is available
   *
   * AntD accepts: HTMLElement | () => HTMLElement | false
   */
  const getContainer = useCallback(() => {
    return ref.current || false;
  }, []);

  /**
   * If you prefer Drawer to fallback to document.body (portal) when not fullscreen,
   * use:
   *   const getContainer = useCallback(() => ref.current || document.body, []);
   */

  return { ref, isFullscreen, enter, exit, toggle, getContainer };
}
