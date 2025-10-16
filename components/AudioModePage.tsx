import { motion } from "framer-motion";
import { Music, Lock, Unlock, Search, ArrowLeft, AudioLines } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface AudioModePageProps {
  onNavigate: (page: string) => void;
  onBack: () => void;
}

export function AudioModePage({ onNavigate, onBack }: AudioModePageProps) {
  const features = [
    {
      icon: Lock,
      title: "Hide in Audio",
      description: "Embed secret messages into audio files with precision",
      action: "audio-hide",
    },
    {
      icon: Unlock,
      title: "Retrieve from Audio",
      description: "Extract hidden messages from audio steganography",
      action: "audio-retrieve",
    },
    {
      icon: Search,
      title: "Detect in Audio",
      description: "Analyze audio files for potential steganography",
      action: "audio-detect",
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" onClick={onBack} className="mb-6 hover:bg-black/5 text-black">
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
            <div className="relative p-4 rounded-2xl bg-black/5 border-2 border-black/10">
              <AudioLines className="w-16 h-16 text-black" strokeWidth={1.5} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-5xl md:text-6xl mb-6 text-black"
          >
            Audio Steganography
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-[#505050] mb-8 max-w-2xl mx-auto"
          >
            Professional-grade audio steganography tools with minimalistic design. Hide and reveal
            messages in audio files with precision and elegance.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-4 justify-center items-center"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 border border-black/10">
              <Music className="w-4 h-4 text-black" />
              <span className="text-sm text-black">WAV Support</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 border border-black/10">
              <AudioLines className="w-4 h-4 text-black" />
              <span className="text-sm text-black">Visual Feedback</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 border border-black/10">
              <Search className="w-4 h-4 text-black" />
              <span className="text-sm text-black">Advanced Detection</span>
            </div>
          </motion.div>
        </motion.div>

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
                  className="border-[#D0D0D0] bg-white hover:bg-[#F5F5F5] shadow-lg transition-all duration-300 group cursor-pointer h-full"
                  onClick={() => onNavigate(feature.action)}
                >
                  <div className="p-8">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="mb-6"
                    >
                      <div className="w-16 h-16 rounded-xl bg-black/5 border-2 border-black/10 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                        <Icon className="w-8 h-8 text-black" strokeWidth={1.5} />
                      </div>
                    </motion.div>

                    <h3 className="text-xl text-black mb-3">{feature.title}</h3>
                    <p className="text-[#505050] mb-6">{feature.description}</p>

                    <Button
                      className="w-full bg-black text-white hover:bg-[#303030] group-hover:shadow-md transition-shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(feature.action);
                      }}
                    >
                      Get Started
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
          <div className="inline-block p-6 rounded-2xl bg-black/5 border border-black/10">
            <p className="text-sm text-[#505050] max-w-2xl">
              <span className="text-black">Audio steganography</span> uses sophisticated algorithms
              to embed data in the least significant bits of audio samples, making changes
              imperceptible to human hearing while maintaining file integrity.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
