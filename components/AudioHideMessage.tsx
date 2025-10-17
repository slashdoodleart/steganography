import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, Download, CheckCircle2, Music } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { AudioWaveform } from "./AudioWaveform";
import { FileUpload } from "./FileUpload";
import { embedAudioSuite, StegoAssetResponse, WaveformPoint } from "./utils/api";
import { toast } from "sonner";

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
  const [waveform, setWaveform] = useState<WaveformPoint[]>([]);
  const [asset, setAsset] = useState<StegoAssetResponse | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const resetDownload = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setDownloadUrl(null);
    setAsset(null);
  };

  const deriveHighlights = (points: WaveformPoint[]) => {
    const ranges: { start: number; end: number }[] = [];
    let current: { start: number; end: number } | null = null;
    const threshold = 0.65;

    points.forEach((point) => {
      const magnitude = Math.abs(point.amplitude);
      if (magnitude >= threshold) {
        if (!current) {
          current = { start: point.position, end: point.position };
        } else {
          current.end = point.position;
        }
      } else if (current) {
        ranges.push(current);
        current = null;
      }
    });

    if (current) {
      ranges.push(current);
    }

    return ranges;
  };

  const handleProcess = async () => {
    if (!selectedFile || !message) return;

    setIsProcessing(true);
    setProgress(0);
    setErrorMessage(null);
    setIsComplete(false);
    resetDownload();

    const tick = window.setInterval(() => {
      setProgress((prev) => (prev >= 92 ? prev : prev + 4));
    }, 140);

    try {
      const response = await embedAudioSuite(selectedFile, message);
      const url = URL.createObjectURL(response.asset.blob);
      setAsset(response.asset);
      setDownloadUrl(url);
      setWaveform(response.waveform);
      setHighlightRegions(deriveHighlights(response.waveform));
      setIsComplete(true);
      setProgress(100);
      toast.success("Audio stego file generated");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to embed message";
      setErrorMessage(messageText);
      setIsComplete(false);
    } finally {
      window.clearInterval(tick);
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!asset || !downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = asset.filename || `stego_${selectedFile?.name || "audio.wav"}`;
    a.click();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setMessage("");
    setIsProcessing(false);
    setProgress(0);
    setIsComplete(false);
    setHighlightRegions([]);
    setWaveform([]);
    setErrorMessage(null);
    resetDownload();
  };

  return (
    <div
      className="min-h-screen pt-24 pb-12 px-6"
      style={{
        background: "radial-gradient(circle at top left, var(--muted) 0%, var(--background) 55%)",
      }}
    >
      <div className="container mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6 hover:bg-muted"
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted border-2 border-border mb-4">
            <Music className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl text-foreground mb-3">Hide Message in Audio</h1>
          <p className="text-muted-foreground">
            Embed your secret message into audio file with precision
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Upload & Input */}
          <Card className="border-border bg-card shadow-lg p-6">
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm text-foreground">Audio File</label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-foreground transition-colors">
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
                        <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-foreground mb-2">Upload Audio File</p>
                        <p className="text-sm text-muted-foreground">WAV, MP3, or other formats</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          onClick={() => document.getElementById("audio-upload")?.click()}
                        >
                          Choose File
                        </Button>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-muted">
                          <Music className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className="text-foreground">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block mb-3 text-sm text-foreground">Secret Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your secret message here..."
                  className="min-h-32 bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  disabled={isProcessing || isComplete}
                />
                <p className="text-xs text-muted-foreground mt-2">{message.length} characters</p>
              </div>

              {!isProcessing && !isComplete && (
                <Button
                  onClick={handleProcess}
                  disabled={!selectedFile || !message || isProcessing}
                  className="w-full disabled:bg-muted disabled:text-muted-foreground"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Embed Message
                </Button>
              )}
            </div>
          </Card>

          {/* Right Column - Waveform & Status */}
          <div className="space-y-6">
            <Card className="border-border bg-card shadow-lg p-6">
              <h3 className="text-foreground mb-4">Audio Waveform</h3>
              <AudioWaveform
                audioFile={selectedFile}
                highlightRegions={highlightRegions}
                waveform={waveform}
                isProcessing={isProcessing}
                variant="light"
              />
              {highlightRegions.length > 0 && (
                <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground">■</span> Highlighted regions show where data is
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
                  <Card className="border-border bg-card shadow-lg p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-foreground">
                        <span>Processing Audio...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
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
                  <Card className="border-border bg-muted shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-foreground" />
                      <div>
                        <h4 className="text-foreground">Success!</h4>
                        <p className="text-sm text-muted-foreground">
                          Message embedded successfully
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleDownload}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Audio
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="flex-1 hover:bg-muted"
                      >
                        Embed Another
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
              >
                {errorMessage}
              </motion.div>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-lg bg-muted border border-border"
        >
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">ℹ️ Auto-conversion:</span> Files are automatically
            converted to WAV format for optimal steganography. The message is distributed across
            multiple regions for security.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
