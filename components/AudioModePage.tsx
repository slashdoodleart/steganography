import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Music, Lock, Unlock, Search, ArrowLeft, AudioLines } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { AudioOverviewPayload, fetchAudioOverview } from "./utils/api";
import { toast } from "sonner";

interface AudioModePageProps {
  onNavigate: (page: string) => void;
  onBack: () => void;
}

export function AudioModePage({ onNavigate, onBack }: AudioModePageProps) {
  const [overview, setOverview] = useState<AudioOverviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadOverview = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAudioOverview();
        if (isMounted) {
          setOverview(data);
        }
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOverview();
    return () => {
      isMounted = false;
    };
  }, []);

  const actionCards = useMemo(() => {
    const actions = overview?.actions ?? [
      {
        title: "Hide in Audio",
        description: "Embed secret messages into audio files with precision",
        cta: "Get Started",
      },
      {
        title: "Retrieve from Audio",
        description: "Extract hidden messages from audio steganography",
        cta: "Get Started",
      },
      {
        title: "Detect in Audio",
        description: "Analyze audio files for potential steganography",
        cta: "Get Started",
      },
    ];

    const iconMap: Record<string, typeof Lock> = {
      "Hide in Audio": Lock,
      "Retrieve from Audio": Unlock,
      "Detect in Audio": Search,
    };

    return actions.map((action) => ({
      ...action,
      icon: iconMap[action.title] ?? Music,
      key: action.title.toLowerCase().includes("hide")
        ? "audio-hide"
        : action.title.toLowerCase().includes("retrieve")
        ? "audio-retrieve"
        : "audio-detect",
    }));
  }, [overview]);

  const featurePills = overview?.features ?? [
    { title: "WAV Support", description: "Optimized for 16-bit PCM audio" },
    { title: "Visual Feedback", description: "Waveform analysis for transparency" },
    { title: "Advanced Detection", description: "Heuristic-driven steganography checks" },
  ];

  const heroTitle = overview?.hero_title ?? "Audio Steganography";
  const heroSubtitle = overview?.hero_subtitle ??
    "Professional-grade audio steganography tools with minimalistic design. Hide and reveal messages in audio files with precision and elegance.";
  const heroNarrative = overview?.narrative ??
    "Audio steganography uses sophisticated algorithms to embed data in the least significant bits of audio samples, making changes imperceptible to human hearing while maintaining file integrity.";

  return (
    <div
      className="min-h-screen pt-24 pb-12 px-6"
      style={{
        background: "radial-gradient(circle at top right, var(--muted) 0%, var(--background) 60%)",
      }}
    >
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" onClick={onBack} className="mb-6 hover:bg-muted">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block mb-6"
          >
            <div className="relative p-4 rounded-2xl bg-muted border-2 border-border">
              <AudioLines className="w-16 h-16" strokeWidth={1.5} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-5xl md:text-6xl mb-6 text-foreground"
          >
            {heroTitle}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            {heroSubtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-4 justify-center items-center"
          >
            {featurePills.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border"
              >
                <AudioLines className="w-4 h-4" />
                <span className="text-sm text-foreground">{feature.title}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {actionCards.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.key}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * index, duration: 0.5 }}
              >
                <Card
                  className="border-border bg-card hover:bg-muted shadow-lg transition-all duration-300 group cursor-pointer h-full"
                  onClick={() => onNavigate(action.key)}
                >
                  <div className="p-8">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="mb-6"
                    >
                      <div className="w-16 h-16 rounded-xl bg-muted border-2 border-border flex items-center justify-center group-hover:bg-muted transition-colors">
                        <Icon className="w-8 h-8" strokeWidth={1.5} />
                      </div>
                    </motion.div>

                    <h3 className="text-xl text-foreground mb-3">{action.title}</h3>
                    <p className="text-muted-foreground mb-6">{action.description}</p>

                    <Button
                      className="w-full group-hover:shadow-md transition-shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(action.key);
                      }}
                    >
                      {action.cta}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-center"
        >
          <div className="inline-block p-6 rounded-2xl bg-muted border border-border">
            <p className="text-sm text-muted-foreground max-w-2xl">{heroNarrative}</p>
          </div>
        </motion.div>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center text-sm text-muted-foreground"
          >
            Loading audio suite data…
          </motion.div>
        )}
      </div>
    </div>
  );
}
