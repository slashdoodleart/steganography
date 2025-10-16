import { Shield, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

interface NavigationProps {
  onSettingsClick: () => void;
  isDarkMode?: boolean;
}

export function Navigation({ onSettingsClick, isDarkMode = false }: NavigationProps) {
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-xl"
      style={{
        background: isDarkMode 
          ? 'linear-gradient(to bottom, rgba(10, 10, 10, 0.9), rgba(10, 10, 10, 0.8))'
          : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.8))'
      }}
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="w-8 h-8 text-foreground" strokeWidth={1.5} />
            <motion.div
              className="absolute inset-0 blur-xl opacity-20"
              animate={{
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              style={{
                background: isDarkMode ? '#FFFFFF' : '#000000',
              }}
            />
          </div>
          <div>
            <h1 className="text-xl tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                StegoVision
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">Hide & Reveal Messages</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="hover:bg-muted"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </motion.nav>
  );
}
