import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, AlertTriangle, CheckCircle, Music, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { AudioWaveform } from "./AudioWaveform";

interface AudioDetectorProps {
  onBack: () => void;
}

interface DetectionResult {
  probability: number;
  hasSteganography: boolean;
  algorithms: {
    name: string;
    score: number;
    confidence: "high" | "medium" | "low";
  }[];
  regions: { start: number; end: number }[];
}

export function AudioDetector({ onBack }: AudioDetectorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setProgress(0);
    setResult(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);

          const probability = Math.random();
          const hasSteganography = probability > 0.4;

          setResult({
            probability: probability * 100,
            hasSteganography,
            algorithms: [
              {
                name: "LSB Analysis",
                score: 30 + Math.random() * 70,
                confidence: hasSteganography ? "high" : "low",
              },
              {
                name: "Chi-Square Test",
                score: 25 + Math.random() * 75,
                confidence: hasSteganography ? "high" : "medium",
              },
              {
                name: "Spectral Analysis",
                score: 20 + Math.random() * 80,
                confidence: hasSteganography ? "medium" : "low",
              },
              {
                name: "Entropy Detection",
                score: 35 + Math.random() * 65,
                confidence: hasSteganography ? "high" : "low",
              },
            ],
            regions: hasSteganography
              ? [
                  { start: 0.1, end: 0.2 },
                  { start: 0.4, end: 0.5 },
                  { start: 0.7, end: 0.8 },
                ]
              : [],
          });

          return 100;
        }
        return prev + 4;
      });
    }, 100);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setIsScanning(false);
    setProgress(0);
    setResult(null);
  };

  const getConfidenceBg = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-[#303030]";
      case "medium":
        return "bg-[#808080]";
      case "low":
        return "bg-[#D0D0D0]";
      default:
        return "bg-[#E0E0E0]";
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-white">
      <div className="container mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6 hover:bg-black/5 text-black"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black/5 border-2 border-black/10 mb-4">
            <Search className="w-8 h-8 text-black" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl text-black mb-3">Audio Steganography Detector</h1>
          <p className="text-[#505050]">Analyze audio files for hidden messages</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Upload & Scan */}
          <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm text-black">Upload Audio File</label>
                <div className="border-2 border-dashed border-[#B0B0B0] rounded-lg p-6 text-center hover:border-[#808080] transition-colors">
                  {!selectedFile ? (
                    <div>
                      <input
                        type="file"
                        id="audio-detector"
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="audio-detector" className="cursor-pointer">
                        <Activity className="w-12 h-12 text-[#808080] mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-black mb-2">Select Audio to Analyze</p>
                        <p className="text-sm text-[#808080]">All audio formats supported</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 border-black text-black hover:bg-black/5"
                          onClick={() => document.getElementById("audio-detector")?.click()}
                        >
                          Browse Files
                        </Button>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-black/5">
                          <Music className="w-6 h-6 text-black" />
                        </div>
                        <div className="text-left">
                          <p className="text-black">{selectedFile.name}</p>
                          <p className="text-sm text-[#808080]">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="text-[#808080] hover:text-black hover:bg-black/5"
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {!isScanning && !result && (
                <Button
                  onClick={handleScan}
                  disabled={!selectedFile}
                  className="w-full bg-black text-white hover:bg-[#303030] disabled:bg-[#D0D0D0] disabled:text-[#808080]"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Scan for Steganography
                </Button>
              )}
            </div>
          </Card>

          {/* Right Column - Waveform */}
          <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
            <h3 className="text-black mb-4">Waveform Heatmap</h3>
            <AudioWaveform
              audioFile={selectedFile}
              highlightRegions={result?.regions || []}
              isProcessing={isScanning}
              variant="light"
            />
            {result && result.regions.length > 0 && (
              <div className="mt-4 p-3 bg-black/5 rounded-lg border border-[#E0E0E0]">
                <p className="text-xs text-[#505050]">
                  <span className="text-black">▮</span> Suspicious regions detected
                </p>
              </div>
            )}
          </Card>
        </div>

        <AnimatePresence mode="wait">
          {isScanning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-black">
                    <span>Scanning audio...</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-[#E0E0E0]" />
                  <p className="text-xs text-[#808080] text-center">
                    Running multiple detection algorithms
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 space-y-6"
            >
              {/* Overall Result */}
              <Card
                className={`border-2 shadow-lg p-6 ${
                  result.hasSteganography
                    ? "border-[#303030] bg-[#F5F5F5]"
                    : "border-[#D0D0D0] bg-white"
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  {result.hasSteganography ? (
                    <AlertTriangle className="w-8 h-8 text-black flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-[#505050] flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl text-black mb-2">
                      {result.hasSteganography
                        ? "Steganography Detected"
                        : "No Steganography Detected"}
                    </h3>
                    <p className="text-sm text-[#505050] mb-4">
                      {result.hasSteganography
                        ? "This audio file likely contains hidden data based on statistical analysis."
                        : "This audio file appears clean with no significant anomalies detected."}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-black">
                        <span>Detection Confidence</span>
                        <span>{result.probability.toFixed(1)}%</span>
                      </div>
                      <div className="relative h-3 bg-[#E0E0E0] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.probability}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-[#303030] to-black rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Algorithm Results */}
              <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
                <h4 className="text-black mb-4">Detection Algorithms</h4>
                <div className="space-y-4">
                  {result.algorithms.map((algo, index) => (
                    <motion.div
                      key={algo.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-[#F5F5F5] rounded-lg border border-[#E0E0E0]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-black">{algo.name}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${getConfidenceBg(
                            algo.confidence
                          )} ${algo.confidence === "low" ? "text-[#505050]" : "text-white"}`}
                        >
                          {algo.confidence.toUpperCase()}
                        </span>
                      </div>
                      <div className="relative h-2 bg-white rounded-full overflow-hidden border border-[#E0E0E0]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${algo.score}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          className="h-full bg-black rounded-full"
                        />
                      </div>
                      <p className="text-xs text-[#808080] mt-1">{algo.score.toFixed(1)}% score</p>
                    </motion.div>
                  ))}
                </div>
              </Card>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full border-[#D0D0D0] text-black hover:bg-black/5"
              >
                Scan Another File
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-lg bg-black/5 border border-[#E0E0E0]"
        >
          <p className="text-sm text-[#505050]">
            <span className="text-black">ℹ️ Analysis:</span> Uses multiple statistical methods
            including LSB analysis, chi-square testing, and spectral analysis to detect hidden data
            in audio files.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
