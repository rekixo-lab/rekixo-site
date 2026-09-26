(() => {
  try {
    const saved = localStorage.getItem("rekixo-theme");
    const theme = saved === "dark" || saved === "light"
      ? saved
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#07111f" : "#ffffff");
  } catch (_) {
    document.documentElement.dataset.theme = "light";
  }
})();