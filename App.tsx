import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "./components/ui/sonner";
import { Navigation } from "./components/Navigation";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { HomePage } from "./components/HomePage";
import { HideMessage } from "./components/HideMessage";
import { RetrieveMessage } from "./components/RetrieveMessage";
import { DetectorPage } from "./components/DetectorPage";
import { SettingsPanel } from "./components/SettingsPanel";
import { AudioModePage } from "./components/AudioModePage";
import { AudioHideMessage } from "./components/AudioHideMessage";
import { AudioRetrieveMessage } from "./components/AudioRetrieveMessage";
import { AudioDetector } from "./components/AudioDetector";

type Page =
  | "home"
  | "hide"
  | "retrieve"
  | "detect"
  | "audio-mode"
  | "audio-hide"
  | "audio-retrieve"
  | "audio-detect";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const handleBack = () => {
    setCurrentPage("home");
  };

  const handleAudioModeBack = () => {
    setCurrentPage("audio-mode");
  };

  const toggleDarkMode = (enabled: boolean) => {
    setIsDarkMode(enabled);
  };

  return (
    <div className={`min-h-screen relative overflow-x-hidden ${isDarkMode ? 'dark bg-background text-foreground' : 'bg-background text-foreground'}`}>
      <Navigation onSettingsClick={() => setSettingsOpen(true)} isDarkMode={isDarkMode} />

      <AnimatePresence mode="wait">
        {currentPage === "home" && <HomePage key="home" onNavigate={handleNavigate} />}
        {currentPage === "hide" && <HideMessage key="hide" onBack={handleBack} />}
        {currentPage === "retrieve" && <RetrieveMessage key="retrieve" onBack={handleBack} />}
        {currentPage === "detect" && <DetectorPage key="detect" onBack={handleBack} />}
        {currentPage === "audio-mode" && (
          <AudioModePage key="audio-mode" onNavigate={handleNavigate} onBack={handleBack} />
        )}
        {currentPage === "audio-hide" && (
          <AudioHideMessage key="audio-hide" onBack={handleAudioModeBack} />
        )}
        {currentPage === "audio-retrieve" && (
          <AudioRetrieveMessage key="audio-retrieve" onBack={handleAudioModeBack} />
        )}
        {currentPage === "audio-detect" && (
          <AudioDetector key="audio-detect" onBack={handleAudioModeBack} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsPanel 
            isOpen={settingsOpen} 
            onClose={() => setSettingsOpen(false)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        )}
      </AnimatePresence>

      <Toaster position="bottom-right" theme={isDarkMode ? "dark" : "light"} />
    </div>
  );
}
