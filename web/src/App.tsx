import { useState, useEffect } from "react";
import { LinearVoiceStudio } from "./components/linear/LinearVoiceStudio";
import { LandingPage } from "./components/LandingPage";

export default function App() {
  const [currentView, setCurrentView] = useState<"landing" | "studio">(() => {
    if (typeof window !== "undefined") {
      if (window.location.hash === "#studio" || window.location.search.includes("view=studio")) {
        return "studio";
      }
    }
    return "landing";
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#studio" || window.location.search.includes("view=studio")) {
        setCurrentView("studio");
      } else {
        setCurrentView("landing");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const goToView = (view: "landing" | "studio") => {
    setCurrentView(view);
    if (typeof window !== "undefined") {
      if (view === "studio") {
        window.location.hash = "studio";
      } else {
        history.replaceState(null, "", window.location.pathname);
      }
    }
  };

  if (currentView === "studio") {
    return <LinearVoiceStudio onExitStudio={() => goToView("landing")} />;
  }

  return <LandingPage onLaunchStudio={() => goToView("studio")} />;
}
