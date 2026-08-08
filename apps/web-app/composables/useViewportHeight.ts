export function useViewportHeight() {
  function setRealViewportHeight() {
    if (typeof window !== "undefined") {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }
  }

  onMounted(() => {
    setRealViewportHeight();
    window.addEventListener("resize", setRealViewportHeight);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", setRealViewportHeight);
  });
}
