import { motion } from "framer-motion";
import { Lock, Unlock, Search, Shield, Zap, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const features = [
    {
      icon: Lock,
      title: "Hide Message",
      description: "Embed secret messages into images or audio files",
      action: "hide",
    },
    {
      icon: Unlock,
      title: "Retrieve Message",
      description: "Extract hidden messages from steganography files",
      action: "retrieve",
    },
    {
      icon: Search,
      title: "Detect Steganography",
      description: "Analyze files for potential hidden content",
      action: "detect",
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6" style={{
      background: 'radial-gradient(circle at top right, var(--muted) 0%, var(--background) 50%)'
    }}>
      <div className="container mx-auto max-w-6xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block mb-6"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-muted to-card border-2 border-border shadow-lg">
              <Shield className="w-20 h-20 mx-auto" strokeWidth={1.5} />
              <motion.div
                className="absolute inset-0 rounded-2xl blur-2xl opacity-20"
                animate={{
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                style={{
                  background: 'radial-gradient(circle, var(--foreground) 0%, transparent 70%)',
                }}
              />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-5xl md:text-7xl mb-6 tracking-tight"
          >
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              StegoVision
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            Advanced steganography platform for hiding and revealing secret messages in images and
            audio files. Secure, fast, and beautifully designed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-4 justify-center items-center"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-muted to-card border border-border shadow-sm">
              <Zap className="w-4 h-4" />
              <span className="text-sm">Instant Processing</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-muted to-card border border-border shadow-sm">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Military-Grade Security</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-muted to-card border border-border shadow-sm">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Invisible to the Eye</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.action}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * index, duration: 0.5 }}
              >
                <Card
                  className="border-border shadow-lg transition-all duration-300 group cursor-pointer overflow-hidden"
                  onClick={() => onNavigate(feature.action)}
                  style={{
                    background: 'linear-gradient(135deg, var(--card) 0%, var(--muted) 100%)',
                  }}
                >
                  <div className="p-8 relative">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="mb-6"
                    >
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-muted to-card border-2 border-border flex items-center justify-center shadow-md">
                        <Icon className="w-8 h-8" strokeWidth={1.5} />
                      </div>
                    </motion.div>

                    <h3 className="text-xl mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground mb-6">{feature.description}</p>

                    <Button
                      className="w-full bg-gradient-to-r from-foreground to-accent text-primary-foreground hover:opacity-90 group-hover:shadow-md transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(feature.action);
                      }}
                    >
                      Get Started
                    </Button>

                    {/* Hover gradient overlay */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%)',
                      }}
                    />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Audio Mode Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-16 text-center"
        >
          <Card
            className="border-border shadow-lg cursor-pointer transition-all hover:shadow-xl overflow-hidden"
            onClick={() => onNavigate("audio-mode")}
            style={{
              background: 'linear-gradient(135deg, var(--muted) 0%, var(--card) 50%, var(--muted) 100%)',
            }}
          >
            <div className="p-8 relative">
              <h3 className="text-2xl mb-3">
                <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Audio Steganography Suite
                </span>
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Access our professional minimalistic audio steganography tools with advanced waveform
                visualization and precision message embedding.
              </p>
              <Button
                variant="outline"
                className="border-border hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate("audio-mode");
                }}
              >
                Enter Audio Mode
              </Button>
              
              <motion.div
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'radial-gradient(circle at top left, var(--foreground) 0%, transparent 50%)',
                }}
              />
            </div>
          </Card>
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center"
        >
          <div className="inline-block p-6 rounded-2xl bg-gradient-to-br from-muted to-card border border-border shadow-sm">
            <p className="text-sm text-muted-foreground max-w-2xl">
              <span className="text-foreground">Steganography</span> is the practice of concealing
              messages within other non-secret data. StegoVision uses advanced algorithms to embed
              your secrets imperceptibly into multimedia files.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
