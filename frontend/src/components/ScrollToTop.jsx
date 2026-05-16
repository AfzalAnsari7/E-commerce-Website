import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router keeps the previous page's scroll position on
// navigation, so a freshly-opened page can appear scrolled down.
// Reset to the top whenever the path changes. Renders nothing.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
