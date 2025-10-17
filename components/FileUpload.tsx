import { useCallback, useId, useState } from "react";
import { Upload, X, Image, Music, File as FileIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  acceptedTypes: string;
  maxSize?: number;
  label?: string;
  icon?: "image" | "audio" | "file";
}

export function FileUpload({
  onFileSelect,
  acceptedTypes,
  maxSize = 10,
  label = "Upload File",
  icon = "image",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const inputId = useId();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return false;
    }
    setError("");
    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect, maxSize]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError("");
    onFileSelect(null);
  };

  const IconComponent = icon === "image" ? Image : icon === "audio" ? Music : FileIcon;

  return (
    <div className="w-full">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300
          ${isDragging ? "border-foreground bg-muted" : "border-border hover:border-muted-foreground"}
          ${selectedFile ? "bg-gradient-to-br from-card to-muted" : ""}
        `}
        whileHover={{ scale: 1.01 }}
      >
        <input
          type="file"
          id={inputId}
          className="hidden"
          accept={acceptedTypes}
          onChange={handleFileInput}
        />

        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.label
              key="upload"
              htmlFor={inputId}
              className="flex flex-col items-center justify-center cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                animate={{
                  y: isDragging ? -10 : [0, -5, 0],
                }}
                transition={{
                  y: {
                    duration: isDragging ? 0.3 : 2,
                    repeat: isDragging ? 0 : Infinity,
                    ease: "easeInOut",
                  },
                }}
              >
                <IconComponent className="w-16 h-16 text-muted-foreground mb-4" strokeWidth={1.5} />
              </motion.div>

              <p className="text-lg mb-2">{label}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop or click to browse
              </p>
              <Button
                type="button"
                variant="outline"
                className="border-border hover:bg-muted"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </motion.label>
          ) : (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-muted to-card border border-border shadow-sm">
                  <IconComponent className="w-8 h-8" />
                </div>
                <div>
                  <p>{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFile}
                className="hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-[#505050] mt-2"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
