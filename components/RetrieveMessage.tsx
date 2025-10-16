import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Unlock, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { FileUpload } from "./FileUpload";
import { toast } from "sonner";
import { copyToClipboard } from "./utils/clipboard";

interface RetrieveMessageProps {
  onBack: () => void;
}

export function RetrieveMessage({ onBack }: RetrieveMessageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedMessage, setExtractedMessage] = useState<string | null>(null);
  const [hasMessage, setHasMessage] = useState(true);

  const handleExtract = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedMessage(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          
          const found = Math.random() > 0.2;
          setHasMessage(found);
          
          if (found) {
            setExtractedMessage(
              "This is a secret message that was hidden in the file. Lorem ipsum dolor sit amet, consectetur adipiscing elit. The message has been successfully extracted from the steganography container."
            );
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
          <h1 className="text-4xl mb-3 text-black">Retrieve Message</h1>
          <p className="text-[#707070]">
            Extract hidden messages from steganography files
          </p>
        </motion.div>

        <Card className="border-[#D0D0D0] bg-white shadow-lg p-8">
          <div className="space-y-6">
            <div>
              <label className="block mb-3 text-sm text-black">Upload File</label>
              <FileUpload
                onFileSelect={setSelectedFile}
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
                  <div className="flex items-center justify-between text-sm text-black">
                    <span>Extracting message...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-center gap-2 text-xs text-[#707070]">
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
                    <CheckCircle2 className="w-6 h-6 text-black" />
                    <div>
                      <h4 className="text-black">Message Extracted Successfully!</h4>
                      <p className="text-sm text-[#707070]">
                        Hidden content has been revealed
                      </p>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-[#F5F5F5] border border-[#D0D0D0]">
                    <p className="whitespace-pre-wrap leading-relaxed text-black">
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
                </motion.div>
              )}

              {extractedMessage !== null && !hasMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-lg bg-[#F5F5F5] border border-[#D0D0D0]"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-[#505050] flex-shrink-0" />
                    <div>
                      <h4 className="text-black">No Hidden Message Found</h4>
                      <p className="text-sm text-[#707070] mt-1">
                        This file doesn't appear to contain any hidden steganography data. It may
                        be a regular file without embedded messages.
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
                </motion.div>
              )}
            </AnimatePresence>

            {!isProcessing && extractedMessage === null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Button
                  onClick={handleExtract}
                  disabled={!selectedFile}
                  className="w-full bg-black text-white hover:bg-[#303030] disabled:bg-[#D0D0D0] disabled:text-[#808080]"
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
          className="mt-6 p-4 rounded-lg bg-black/5 border border-black/10"
        >
          <p className="text-sm text-[#707070]">
            <span className="text-black">💡 Tip:</span> Only files that have been processed
            with steganography tools will contain hidden messages. Regular files will return no results.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
