import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Unlock, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { FileUpload } from "./FileUpload";
import { toast } from "sonner";
import { copyToClipboard } from "./utils/clipboard";
import { retrieveMessageFromAudio, retrieveMessageFromImage } from "./utils/api";

interface RetrieveMessageProps {
  onBack: () => void;
}

export function RetrieveMessage({ onBack }: RetrieveMessageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedMessage, setExtractedMessage] = useState<string | null>(null);
  const [hasMessage, setHasMessage] = useState(true);
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
    setIsProcessing(false);
    setProgress(0);
    setExtractedMessage(null);
    setHasMessage(true);
    setErrorMessage(null);
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedMessage(null);
    setErrorMessage(null);

    const tick = window.setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + 6));
    }, 120);

    try {
      const response = fileCategory === "audio"
        ? await retrieveMessageFromAudio(selectedFile)
        : await retrieveMessageFromImage(selectedFile);
      const found = response.bytes_length > 0 && response.message.trim().length > 0;
      setHasMessage(found);
      setExtractedMessage(found ? response.message : "");
      setProgress(100);
      toast.success("Message extracted successfully");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to extract message";
      setErrorMessage(messageText);
      setHasMessage(false);
      setExtractedMessage(null);
    } finally {
      window.clearInterval(tick);
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (extractedMessage) {
      const success = await copyToClipboard(extractedMessage);
      if (success) {
        toast.success("Message copied to clipboard!");
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
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6" style={{
      background: 'radial-gradient(circle at top left, var(--muted) 0%, var(--background) 50%)'
    }}>
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
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
          <h1 className="text-4xl mb-3 text-foreground">Retrieve Message</h1>
          <p className="text-muted-foreground">
            Extract hidden messages from steganography files
          </p>
        </motion.div>

        <Card className="border-border bg-card shadow-lg p-8">
          <div className="space-y-6">
            <div>
              <label className="block mb-3 text-sm text-foreground">Upload File</label>
              <FileUpload
                onFileSelect={handleFileSelect}
                acceptedTypes="image/*,audio/*"
                label="Choose image or audio file"
                icon="image"
              />
            </div>

            <AnimatePresence mode="wait">
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between text-sm text-foreground">
                    <span>Extracting message...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Unlock className="w-4 h-4" />
                    </motion.div>
                    Analyzing file for hidden data
                  </div>
                </motion.div>
              )}

              {extractedMessage !== null && hasMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-foreground" />
                    <div>
                      <h4 className="text-foreground">Message Extracted Successfully!</h4>
                      <p className="text-sm text-muted-foreground">
                        Hidden content has been revealed
                      </p>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-card border border-border">
                    <p className="whitespace-pre-wrap leading-relaxed text-foreground">
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
                </motion.div>
              )}

              {extractedMessage !== null && !hasMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-lg bg-card border border-border"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                    <div>
                      <h4 className="text-foreground">No Hidden Message Found</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        This file doesn't appear to contain any hidden steganography data. It may
                        be a regular file without embedded messages.
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

            {!isProcessing && extractedMessage === null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Button
                  onClick={handleExtract}
                  disabled={!selectedFile}
                  className="w-full disabled:bg-muted disabled:text-muted-foreground"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Extract Message
                </Button>
              </motion.div>
            )}
          </div>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-lg bg-muted border border-border"
        >
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">💡 Tip:</span> Only files that have been processed
            with steganography tools will contain hidden messages. Regular files will return no results.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
