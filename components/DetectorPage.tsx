import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { FileUpload } from "./FileUpload";
import { detectAudioSteganography, detectImageSteganography, DetectionResponse } from "./utils/api";

interface DetectorPageProps {
  onBack: () => void;
}

interface DetectionResult {
  probability: number;
  hasStego: boolean;
  indicators: {
    name: string;
    value: number;
    status: "high" | "medium" | "low";
  }[];
}

export function DetectorPage({ onBack }: DetectorPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileCategory = useMemo<"image" | "audio">(() => {
    if (!selectedFile) {
      return "image";
    }
    if (selectedFile.type.startsWith("audio")) {
      return "audio";
    }
    return "image";
  }, [selectedFile]);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setIsScanning(false);
    setProgress(0);
    setResult(null);
    setErrorMessage(null);
  };

  const deriveIndicators = (response: DetectionResponse): DetectionResult["indicators"] => {
    const details = response.details ?? {};
    const ratio = typeof details.lsb_ratio === "number" ? details.lsb_ratio : 0.5;
    const variance = typeof details.variance === "number" ? details.variance : 0;
    const entropy = typeof details.transitions === "number" ? details.transitions : 0;

    const anomalyScore = Math.min(Math.abs(ratio - 0.5) * 200, 100);
    const varianceScore = Math.min(Math.sqrt(Math.max(variance, 0)) * 200, 100);
    const entropyScore = Math.min(entropy * 100, 100);

    const toStatus = (value: number): "high" | "medium" | "low" => {
      if (value >= 70) return "high";
      if (value >= 40) return "medium";
      return "low";
    };

    return [
      {
        name: "LSB Distribution",
        value: anomalyScore,
        status: toStatus(anomalyScore),
      },
      {
        name: "Variance Analysis",
        value: varianceScore,
        status: toStatus(varianceScore),
      },
      {
        name: "Transition Entropy",
        value: entropyScore,
        status: toStatus(entropyScore),
      },
    ];
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setProgress(0);
    setResult(null);
    setErrorMessage(null);

    const tick = window.setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + 4));
    }, 120);

    try {
      const response = fileCategory === "audio"
        ? await detectAudioSteganography(selectedFile)
        : await detectImageSteganography(selectedFile);
      const probability = Math.min(100, Math.max(0, response.confidence * 100));
      setResult({
        probability,
        hasStego: response.suspected,
        indicators: deriveIndicators(response),
      });
      setProgress(100);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to analyze file";
      setErrorMessage(messageText);
    } finally {
      window.clearInterval(tick);
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setIsScanning(false);
    setProgress(0);
    setResult(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "high":
        return "#303030";
      case "medium":
        return "#808080";
      case "low":
        return "#D0D0D0";
      default:
        return "#E0E0E0";
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6" style={{
      background: 'radial-gradient(circle at bottom right, var(--muted) 0%, var(--background) 50%)'
    }}>
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" onClick={onBack} className="mb-6 hover:bg-black/5 text-black">
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
          <h1 className="text-4xl mb-3 text-black">Detect Steganography</h1>
          <p className="text-[#707070]">
            Analyze files for potential hidden messages
          </p>
        </motion.div>

        <Card className="border-[#D0D0D0] bg-white shadow-lg p-8">
          <div className="space-y-6">
            <div>
              <label className="block mb-3 text-sm text-black">Upload File to Analyze</label>
              <FileUpload
                onFileSelect={handleFileSelect}
                acceptedTypes="image/*,audio/*"
                label="Choose file to scan"
                icon="image"
              />
            </div>

            <AnimatePresence mode="wait">
              {isScanning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between text-sm text-black">
                    <span>Scanning for steganography...</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-center gap-2 text-xs text-[#707070]">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Search className="w-4 h-4" />
                    </motion.div>
                    Running advanced detection algorithms
                  </div>
                </motion.div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div
                    className={`p-6 rounded-lg border ${
                      result.hasStego
                        ? "bg-[#F5F5F5] border-[#303030]"
                        : "bg-[#F9F9F9] border-[#D0D0D0]"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      {result.hasStego ? (
                        <AlertTriangle className="w-8 h-8 text-[#303030] flex-shrink-0" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-[#808080] flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl mb-2 text-black">
                          {result.hasStego
                            ? "Steganography Detected"
                            : "No Steganography Detected"}
                        </h3>
                        <p className="text-sm text-[#707070] mb-4">
                          {result.hasStego
                            ? "This file likely contains hidden data. Multiple indicators suggest steganographic content."
                            : "This file appears to be clean. No significant indicators of hidden content were found."}
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
                              className="h-full rounded-full bg-gradient-to-r from-[#303030] to-black"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-black" />
                      <h4 className="text-black">Detection Indicators</h4>
                    </div>
                    <div className="space-y-3">
                      {result.indicators.map((indicator, index) => (
                        <motion.div
                          key={indicator.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-lg bg-[#F5F5F5] border border-[#D0D0D0]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-black">{indicator.name}</span>
                            <span
                              className="text-xs px-2 py-1 rounded-full"
                              style={{
                                backgroundColor: `${getStatusColor(indicator.status)}22`,
                                color: getStatusColor(indicator.status),
                                border: `1px solid ${getStatusColor(indicator.status)}44`,
                              }}
                            >
                              {indicator.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="relative h-2 bg-white rounded-full overflow-hidden border border-[#E0E0E0]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${indicator.value}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: getStatusColor(indicator.status),
                              }}
                            />
                          </div>
                          <p className="text-xs text-[#707070] mt-1">
                            {indicator.value.toFixed(1)}% anomaly detected
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleReset} variant="outline" className="w-full border-[#D0D0D0] text-black hover:bg-black/5">
                    Scan Another File
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {!isScanning && !result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button
                  onClick={handleScan}
                  disabled={!selectedFile}
                  className="w-full bg-black text-white hover:bg-[#303030] disabled:bg-[#D0D0D0] disabled:text-[#808080]"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Scan for Steganography
                </Button>
              </motion.div>
            )}
          </div>
        </Card>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
          >
            {errorMessage}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-lg bg-black/5 border border-black/10"
        >
          <p className="text-sm text-[#707070]">
            <span className="text-black">ℹ️ Note:</span> Detection algorithms analyze
            statistical anomalies, LSB patterns, and entropy. No method is 100% accurate - some
            advanced techniques may evade detection.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
