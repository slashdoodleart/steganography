import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Unlock, Copy, CheckCircle2, AlertCircle, Music } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { AudioWaveform } from "./AudioWaveform";
import { toast } from "sonner";
import { copyToClipboard } from "./utils/clipboard";

interface AudioRetrieveMessageProps {
  onBack: () => void;
}

export function AudioRetrieveMessage({ onBack }: AudioRetrieveMessageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedMessage, setExtractedMessage] = useState<string | null>(null);
  const [hasMessage, setHasMessage] = useState(true);
  const [highlightRegions, setHighlightRegions] = useState<{ start: number; end: number }[]>([]);

  const handleExtract = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedMessage(null);

    // Simulate extraction
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);

          const found = Math.random() > 0.2;
          setHasMessage(found);

          if (found) {
            setExtractedMessage(
              "This is a confidential message that was hidden in the audio file. The steganography technique used LSB (Least Significant Bit) encoding to embed this text imperceptibly within the audio waveform."
            );
            setHighlightRegions([
              { start: 0.15, end: 0.25 },
              { start: 0.45, end: 0.55 },
              { start: 0.75, end: 0.82 },
            ]);
          }

          return 100;
        }
        return prev + 5;
      });
    }, 80);
  };

  const handleCopy = async () => {
    if (extractedMessage) {
      const success = await copyToClipboard(extractedMessage);
      if (success) {
        toast.success("Message copied to clipboard");
      } else {
        toast.error("Failed to copy message");
      }
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setIsProcessing(false);
    setProgress(0);
    setExtractedMessage(null);
    setHasMessage(true);
    setHighlightRegions([]);
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
            <Unlock className="w-8 h-8 text-black" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl text-black mb-3">Retrieve Hidden Message</h1>
          <p className="text-[#505050]">Extract secret messages from audio files</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Upload */}
          <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm text-black">Upload Audio File</label>
                <div className="border-2 border-dashed border-[#B0B0B0] rounded-lg p-6 text-center hover:border-[#808080] transition-colors">
                  {!selectedFile ? (
                    <div>
                      <input
                        type="file"
                        id="audio-retrieve"
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="audio-retrieve" className="cursor-pointer">
                        <Unlock className="w-12 h-12 text-[#808080] mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-black mb-2">Select Audio File</p>
                        <p className="text-sm text-[#808080]">Any audio format supported</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 border-black text-black hover:bg-black/5"
                          onClick={() => document.getElementById("audio-retrieve")?.click()}
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

              {!isProcessing && extractedMessage === null && (
                <Button
                  onClick={handleExtract}
                  disabled={!selectedFile}
                  className="w-full bg-black text-white hover:bg-[#303030] disabled:bg-[#D0D0D0] disabled:text-[#808080]"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Extract Message
                </Button>
              )}
            </div>
          </Card>

          {/* Right Column - Waveform & Results */}
          <div className="space-y-6">
            <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
              <h3 className="text-black mb-4">Audio Analysis</h3>
              <AudioWaveform
                audioFile={selectedFile}
                highlightRegions={highlightRegions}
                isProcessing={isProcessing}
                variant="light"
              />
              {highlightRegions.length > 0 && (
                <div className="mt-4 p-3 bg-black/5 rounded-lg border border-[#E0E0E0]">
                  <p className="text-xs text-[#505050]">
                    <span className="text-black">■</span> Detected steganography regions
                  </p>
                </div>
              )}
            </Card>

            <AnimatePresence mode="wait">
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-black">
                        <span>Extracting message...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-[#E0E0E0]" />
                      <p className="text-xs text-[#808080] text-center">
                        Analyzing audio for hidden data
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )}

              {extractedMessage !== null && hasMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-[#303030] bg-white shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-black" />
                      <div>
                        <h4 className="text-black">Message Found</h4>
                        <p className="text-sm text-[#505050]">Successfully extracted</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#F5F5F5] rounded-lg border border-[#E0E0E0] mb-4">
                      <p className="text-black whitespace-pre-wrap leading-relaxed">
                        {extractedMessage}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleCopy}
                        className="flex-1 bg-black text-white hover:bg-[#303030]"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Message
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="flex-1 border-[#D0D0D0] text-black hover:bg-black/5"
                      >
                        Extract Another
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}

              {extractedMessage !== null && !hasMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-[#505050] flex-shrink-0" />
                      <div>
                        <h4 className="text-black">No Message Detected</h4>
                        <p className="text-sm text-[#505050] mt-1">
                          This audio file doesn't appear to contain any hidden steganography data.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="w-full border-[#D0D0D0] text-black hover:bg-black/5"
                    >
                      Try Another File
                    </Button>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-lg bg-black/5 border border-[#E0E0E0]"
        >
          <p className="text-sm text-[#505050]">
            <span className="text-black">ℹ️ Detection method:</span> Uses LSB analysis and
            statistical anomaly detection to locate and extract hidden messages from audio files.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
