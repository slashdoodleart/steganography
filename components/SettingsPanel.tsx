import { motion } from "framer-motion";
import { X, Palette, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
}

export function SettingsPanel({ isOpen, onClose, isDarkMode, onToggleDarkMode }: SettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl">Settings</h2>
              <p className="text-sm text-muted-foreground">Customize your experience</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <Card className="p-6 border-border" style={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(26, 26, 26, 1) 0%, rgba(20, 20, 20, 1) 100%)'
                : 'linear-gradient(135deg, rgba(245, 245, 245, 1) 0%, rgba(240, 240, 240, 1) 100%)'
            }}>
              <h3 className="mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? (
                      <Moon className="w-5 h-5" />
                    ) : (
                      <Sun className="w-5 h-5" />
                    )}
                    <div>
                      <p className="text-sm">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">
                        {isDarkMode ? 'Currently enabled' : 'Currently disabled'}
                      </p>
                    </div>
                  </div>
                  <Switch checked={isDarkMode} onCheckedChange={onToggleDarkMode} />
                </div>

                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-sm mb-2">Grayscale Theme</p>
                  <p className="text-xs text-muted-foreground">
                    Professional minimalistic design with monochrome color palette
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border" style={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(26, 26, 26, 1) 0%, rgba(20, 20, 20, 1) 100%)'
                : 'linear-gradient(135deg, rgba(245, 245, 245, 1) 0%, rgba(240, 240, 240, 1) 100%)'
            }}>
              <h3 className="mb-4">About StegoVision</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Version 1.0.0</p>
                <p>
                  Advanced steganography platform for hiding and revealing secret messages in
                  multimedia files.
                </p>
                <div className="pt-3 border-t border-border">
                  <p className="text-xs">
                    Built with React, Tailwind CSS, and Motion
                  </p>
                </div>
              </div>
            </Card>

            <div className="p-4 rounded-lg bg-muted border border-border">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground">🔒 Privacy:</span> Files are transmitted securely to
                the StegoVision backend for processing and never stored after your request completes.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
