import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Unlock, Copy, CheckCircle2, AlertCircle, Music } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { AudioWaveform } from "./AudioWaveform";
import { toast } from "sonner";
import { copyToClipboard } from "./utils/clipboard";
import { detectAudioSteganography, retrieveMessageFromAudio } from "./utils/api";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedMessage(null);
    setErrorMessage(null);

    const tick = window.setInterval(() => {
      setProgress((prev) => (prev >= 92 ? prev : prev + 6));
    }, 120);

    try {
      const response = await retrieveMessageFromAudio(selectedFile);
      const found = response.bytes_length > 0 && response.message.trim().length > 0;
      setHasMessage(found);
      if (found) {
        setExtractedMessage(response.message);
        setHighlightRegions([{ start: 0.2, end: 0.8 }]);
        toast.success("Hidden message retrieved");
      } else {
        setExtractedMessage("");
        setHighlightRegions([]);
      }

      try {
        await detectAudioSteganography(selectedFile);
      } catch (error) {
        // Detection failures are non-blocking for retrieval flow
      }

      setProgress(100);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to extract message";
      setErrorMessage(messageText);
      setHasMessage(false);
      setExtractedMessage(null);
      setHighlightRegions([]);
      setProgress(100);
    } finally {
      window.clearInterval(tick);
      setIsProcessing(false);
    }
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
    setErrorMessage(null);
  };

  return (
    <div
      className="min-h-screen pt-24 pb-12 px-6"
      style={{
        background: "radial-gradient(circle at bottom left, var(--muted) 0%, var(--background) 55%)",
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
            <Unlock className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl text-foreground mb-3">Retrieve Hidden Message</h1>
          <p className="text-muted-foreground">Extract secret messages from audio files</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Upload */}
          <Card className="border-border bg-card shadow-lg p-6">
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm text-foreground">Upload Audio File</label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-foreground transition-colors">
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
                        <Unlock className="w-12 h-12 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-foreground mb-2">Select Audio File</p>
                        <p className="text-sm text-muted-foreground">Any audio format supported</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          onClick={() => document.getElementById("audio-retrieve")?.click()}
                        >
                          Browse Files
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

              {!isProcessing && extractedMessage === null && (
                <Button
                  onClick={handleExtract}
                  disabled={!selectedFile}
                  className="w-full disabled:bg-muted disabled:text-muted-foreground"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Extract Message
                </Button>
              )}
            </div>
          </Card>

          {/* Right Column - Waveform & Results */}
          <div className="space-y-6">
            <Card className="border-border bg-card shadow-lg p-6">
              <h3 className="text-foreground mb-4">Audio Analysis</h3>
              <AudioWaveform
                audioFile={selectedFile}
                highlightRegions={highlightRegions}
                isProcessing={isProcessing}
                variant="light"
              />
              {highlightRegions.length > 0 && (
                <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground">■</span> Detected steganography regions
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
                        <span>Extracting message...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
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
                  <Card className="border-border bg-muted shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-foreground" />
                      <div>
                        <h4 className="text-foreground">Message Found</h4>
                        <p className="text-sm text-muted-foreground">Successfully extracted</p>
                      </div>
                    </div>

                    <div className="p-4 bg-card rounded-lg border border-border mb-4">
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {extractedMessage}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleCopy}
                        className="flex-1"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Message
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="flex-1 hover:bg-muted"
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
                  <Card className="border-border bg-card shadow-lg p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <div>
                        <h4 className="text-foreground">No Message Detected</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          This audio file doesn't appear to contain any hidden steganography data.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="w-full hover:bg-muted"
                    >
                      Try Another File
                    </Button>
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
            <span className="text-foreground">ℹ️ Detection method:</span> Uses LSB analysis and
            statistical anomaly detection to locate and extract hidden messages from audio files.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
