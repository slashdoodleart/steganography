import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Image, Music, Lock, Download, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { FileUpload } from "./FileUpload";
import { hideMessageInAudio, hideMessageInImage, StegoAssetResponse } from "./utils/api";
import { toast } from "sonner";

interface HideMessageProps {
  onBack: () => void;
}

export function HideMessage({ onBack }: HideMessageProps) {
  const [fileType, setFileType] = useState<"image" | "audio">("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
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
      setDownloadUrl(null);
    }
    setAsset(null);
  };

  const handleProcess = async () => {
    if (!selectedFile || !message) return;

    setIsProcessing(true);
    setProgress(0);
    setIsComplete(false);
    setErrorMessage(null);
    resetDownload();

    const tick = window.setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + 5));
    }, 150);

    try {
      const response = fileType === "image"
        ? await hideMessageInImage(selectedFile, message)
        : await hideMessageInAudio(selectedFile, message);
      const url = URL.createObjectURL(response.blob);
      setAsset(response);
      setDownloadUrl(url);
      setIsComplete(true);
      setProgress(100);
      toast.success("Message embedded successfully");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to hide message";
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
    a.download = asset.filename || `stego_${selectedFile?.name || "file"}`;
    a.click();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setMessage("");
    setIsProcessing(false);
    setProgress(0);
    setIsComplete(false);
    setErrorMessage(null);
    resetDownload();
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6" style={{
      background: 'radial-gradient(circle at bottom left, var(--muted) 0%, var(--background) 50%)'
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-muted to-card border-2 border-border mb-4 shadow-lg">
            <Lock className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl mb-3">
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Hide Message
            </span>
          </h1>
          <p className="text-muted-foreground">
            Embed your secret message into an image or audio file
          </p>
        </motion.div>

        <Card className="border-border shadow-lg p-8" style={{
          background: 'linear-gradient(135deg, var(--card) 0%, var(--background) 100%)'
        }}>
          <Tabs value={fileType} onValueChange={(v) => setFileType(v as "image" | "audio")}>
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted">
              <TabsTrigger value="image" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Image className="w-4 h-4 mr-2" />
                Image
              </TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Music className="w-4 h-4 mr-2" />
                Audio
              </TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="space-y-6">
              <div>
                <label className="block mb-3 text-sm text-foreground">Upload Image</label>
                <FileUpload
                  onFileSelect={setSelectedFile}
                  acceptedTypes="image/*"
                  label="Choose an image file"
                  icon="image"
                />
              </div>
            </TabsContent>

            <TabsContent value="audio" className="space-y-6">
              <div>
                <label className="block mb-3 text-sm text-foreground">Upload Audio</label>
                <FileUpload
                  onFileSelect={setSelectedFile}
                  acceptedTypes="audio/*"
                  label="Choose an audio file"
                  icon="audio"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <label className="block mb-3 text-sm text-foreground">Secret Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your secret message here..."
              className="min-h-32 bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
              disabled={isProcessing || isComplete}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {message.length} characters
            </p>
          </div>

          <AnimatePresence mode="wait">
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 space-y-3"
              >
                <div className="flex items-center justify-between text-sm text-foreground">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Embedding message into {fileType} file
                </p>
              </motion.div>
            )}

            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-6 rounded-lg bg-card border border-border"
              >
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-foreground" />
                  <div>
                    <h4 className="text-foreground">Message Hidden Successfully!</h4>
                    <p className="text-sm text-muted-foreground">
                      Your secret is now embedded in the file
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleDownload}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 border-border text-foreground hover:bg-muted"
                  >
                    Hide Another
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {errorMessage}
            </motion.div>
          )}

          {!isProcessing && !isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              <Button
                onClick={handleProcess}
                disabled={!selectedFile || !message}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
              >
                <Lock className="w-4 h-4 mr-2" />
                Hide Message
              </Button>
            </motion.div>
          )}
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-lg bg-muted border border-border"
        >
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">💡 Tip:</span> The quality and size of your carrier
            file determines how much data can be hidden. Larger files can hide more information.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
