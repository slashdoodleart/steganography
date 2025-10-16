import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, Download, CheckCircle2, Music } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { AudioWaveform } from "./AudioWaveform";
import { FileUpload } from "./FileUpload";

interface AudioHideMessageProps {
  onBack: () => void;
}

export function AudioHideMessage({ onBack }: AudioHideMessageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [highlightRegions, setHighlightRegions] = useState<{ start: number; end: number }[]>([]);

  const handleProcess = async () => {
    if (!selectedFile || !message) return;

    setIsProcessing(true);
    setProgress(0);

    // Simulate processing and highlight regions
    const regions = [
      { start: 0.2, end: 0.3 },
      { start: 0.5, end: 0.6 },
      { start: 0.8, end: 0.85 },
    ];
    setHighlightRegions(regions);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          setIsComplete(true);
          return 100;
        }
        return prev + 4;
      });
    }, 100);
  };

  const handleDownload = () => {
    const blob = new Blob(["Processed audio with hidden message"], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stego_${selectedFile?.name || "audio.wav"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setMessage("");
    setIsProcessing(false);
    setProgress(0);
    setIsComplete(false);
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
            <Music className="w-8 h-8 text-black" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl text-black mb-3">Hide Message in Audio</h1>
          <p className="text-[#505050]">
            Embed your secret message into audio file with precision
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Upload & Input */}
          <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm text-black">Audio File</label>
                <div className="border-2 border-dashed border-[#B0B0B0] rounded-lg p-6 text-center hover:border-[#808080] transition-colors">
                  {!selectedFile ? (
                    <div>
                      <input
                        type="file"
                        id="audio-upload"
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="audio-upload" className="cursor-pointer">
                        <Music className="w-12 h-12 text-[#808080] mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-black mb-2">Upload Audio File</p>
                        <p className="text-sm text-[#808080]">WAV, MP3, or other formats</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 border-black text-black hover:bg-black/5"
                          onClick={() => document.getElementById("audio-upload")?.click()}
                        >
                          Choose File
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

              <div>
                <label className="block mb-3 text-sm text-black">Secret Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your secret message here..."
                  className="min-h-32 bg-white border-[#D0D0D0] text-black placeholder:text-[#B0B0B0] focus:border-black resize-none"
                  disabled={isProcessing || isComplete}
                />
                <p className="text-xs text-[#808080] mt-2">{message.length} characters</p>
              </div>

              {!isProcessing && !isComplete && (
                <Button
                  onClick={handleProcess}
                  disabled={!selectedFile || !message}
                  className="w-full bg-black text-white hover:bg-[#303030] disabled:bg-[#D0D0D0] disabled:text-[#808080]"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Embed Message
                </Button>
              )}
            </div>
          </Card>

          {/* Right Column - Waveform & Status */}
          <div className="space-y-6">
            <Card className="border-[#D0D0D0] bg-white shadow-lg p-6">
              <h3 className="text-black mb-4">Audio Waveform</h3>
              <AudioWaveform
                audioFile={selectedFile}
                highlightRegions={highlightRegions}
                isProcessing={isProcessing}
                variant="light"
              />
              {highlightRegions.length > 0 && (
                <div className="mt-4 p-3 bg-black/5 rounded-lg border border-[#E0E0E0]">
                  <p className="text-xs text-[#505050]">
                    <span className="text-black">■</span> Highlighted regions show where data is
                    embedded
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
                        <span>Processing Audio...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-[#E0E0E0]" />
                      <p className="text-xs text-[#808080] text-center">
                        Converting to WAV and embedding message
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )}

              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-[#303030] bg-[#F5F5F5] shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-black" />
                      <div>
                        <h4 className="text-black">Success!</h4>
                        <p className="text-sm text-[#505050]">
                          Message embedded successfully
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleDownload}
                        className="flex-1 bg-black text-white hover:bg-[#303030]"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Audio
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="flex-1 border-[#D0D0D0] text-black hover:bg-black/5"
                      >
                        Embed Another
                      </Button>
                    </div>
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
            <span className="text-black">ℹ️ Auto-conversion:</span> Files are automatically
            converted to WAV format for optimal steganography. The message is distributed across
            multiple regions for security.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
