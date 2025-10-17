import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Beaker,
  FlaskConical,
  Image as ImageIcon,
  Music,
  Video,
  BookText,
  Network,
  HardDrive,
  ShieldCheck,
  Download,
  FileText,
  ClipboardCopy,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { FileUpload } from "./FileUpload";
import {
  ArtifactDownload,
  fetchResearchArtifact,
  ResearchDetectResult,
  researchDetect,
  ResearchEmbedResult,
  researchEmbed,
  ResearchExtractResult,
  researchExtract,
} from "./utils/api";
import { toast } from "sonner";

interface ResearchSuitePageProps {
  onBack: () => void;
}

type Operation = "embed" | "extract" | "detect";
type PayloadMode = "text" | "file";
type CarrierKey = "image" | "audio" | "video" | "text" | "network" | "fs" | "watermark";

interface MethodInfo {
  id: string;
  label: string;
  description: string;
  sampleOptions?: Record<string, unknown>;
  recommendation?: string;
}

interface DetectorInfo {
  id: string;
  label: string;
  description: string;
}

interface CarrierConfig {
  id: CarrierKey;
  label: string;
  summary: string;
  coverAccept: string;
  payloadAccept?: string;
  embedMethods: MethodInfo[];
  extractMethods: MethodInfo[];
  detectors: DetectorInfo[];
  note?: string;
}

const carriers: Record<CarrierKey, CarrierConfig> = {
  image: {
    id: "image",
    label: "Images",
    summary: "Spatial and frequency-domain encoders for PNG/BMP carriers.",
    coverAccept: "image/*",
    payloadAccept: "*/*",
    embedMethods: [
      {
        id: "rgb-lsb",
        label: "RGB LSB",
        description: "Embed bits directly into pixel least-significant bits.",
      },
      {
        id: "dct-midband",
        label: "DCT Mid-band",
        description: "Mid-frequency DCT modulation for JPEG resilience.",
      },
    ],
    extractMethods: [
      {
        id: "rgb-lsb",
        label: "RGB LSB",
        description: "Recover payload length and data from RGB channels.",
      },
      {
        id: "dct-midband",
        label: "DCT Mid-band",
        description: "Invert mid-band DCT coefficients to recover bits.",
      },
    ],
    detectors: [
      {
        id: "lsb",
        label: "Chi-square LSB",
        description: "Parity distribution anomaly scoring for spatial LSB embedding.",
      },
      {
        id: "dct",
        label: "DCT Residual",
        description: "Variance over mid-band coefficients to flag tampering.",
      },
    ],
    note: "Lossless formats preserve LSB payloads; prefer PNG or BMP sources.",
  },
  audio: {
    id: "audio",
    label: "Audio",
    summary: "Sample-level and echo hiding for PCM waveforms.",
    coverAccept: "audio/*",
    payloadAccept: "*/*",
    embedMethods: [
      {
        id: "pcm-lsb",
        label: "PCM LSB",
        description: "Flip sample LSBs in PCM streams to carry bits.",
      },
      {
        id: "echo-binary",
        label: "Binary Echo Hiding",
        description: "Modulate inter-frame echoes to represent binary payloads.",
        sampleOptions: {
          delay_short: 80,
          delay_long: 160,
          decay: 0.45,
        },
        recommendation: "Tune delays (in samples) to balance audibility and robustness.",
      },
    ],
    extractMethods: [
      {
        id: "pcm-lsb",
        label: "PCM LSB",
        description: "Reconstruct payload from sample parity bits.",
      },
      {
        id: "echo-binary",
        label: "Binary Echo Hiding",
        description: "Autocorrelation-based extraction of encoded echoes.",
        sampleOptions: {
          delay_short: 80,
          delay_long: 160,
        },
      },
    ],
    detectors: [
      {
        id: "lsb",
        label: "LSB Bias",
        description: "Checks for statistical bias across sample LSBs.",
      },
      {
        id: "echo",
        label: "Echo Energy",
        description: "Measures residual echo energy within analysis frames.",
      },
    ],
    note: "Use uncompressed WAV for best capacity; MP3 recompression will destroy LSB payloads.",
  },
  video: {
    id: "video",
    label: "Video",
    summary: "Frame-based and wavelet embedding for MP4 streams.",
    coverAccept: "video/*",
    payloadAccept: "*/*",
    embedMethods: [
      {
        id: "frame-rgb-lsb",
        label: "Frame RGB LSB",
        description: "Sequential pixel LSB embedding across frames.",
        sampleOptions: {
          frame_step: 2,
          max_frames: 600,
          scale_width: 640,
        },
      },
      {
        id: "haar-ll",
        label: "Haar DWT",
        description: "Embed bits in low-frequency Haar wavelet coefficients.",
        sampleOptions: {
          frame_step: 2,
          max_frames: 400,
          scale_width: 640,
        },
      },
    ],
    extractMethods: [
      {
        id: "frame-rgb-lsb",
        label: "Frame RGB LSB",
        description: "Read header bits then payload from frame parities.",
      },
      {
        id: "haar-ll",
        label: "Haar DWT",
        description: "Reconstruct payload from LL sub-band parities.",
      },
    ],
    detectors: [
      {
        id: "frame-lsb",
        label: "Frame Variance",
        description: "Variance of frame LSB noise for spatial detection.",
      },
      {
        id: "dwt",
        label: "Wavelet Residual",
        description: "Energy check across LL coefficients for DWT tampering.",
      },
    ],
    note: "Expect large files; operations decode entire video to process frames, so keep clips short.",
  },
  text: {
    id: "text",
    label: "Text",
    summary: "Zero-width and whitespace channel encoders for UTF-8 documents.",
    coverAccept: ".txt,text/plain",
    payloadAccept: "*/*",
    embedMethods: [
      {
        id: "zero-width",
        label: "Zero-width",
        description: "Insert zero-width codepoints to encode bitstrings.",
      },
      {
        id: "trailing-whitespace",
        label: "Trailing Whitespace",
        description: "Encode bits via single/double whitespace at line ends.",
      },
    ],
    extractMethods: [
      {
        id: "zero-width",
        label: "Zero-width",
        description: "Recover hidden bits from zero-width glyph runs.",
      },
      {
        id: "trailing-whitespace",
        label: "Trailing Whitespace",
        description: "Inspect trailing spaces/tabs to rebuild payload.",
      },
    ],
    detectors: [
      {
        id: "zero-width",
        label: "Zero-width Ratio",
        description: "Counts zero-width characters relative to text length.",
      },
      {
        id: "whitespace",
        label: "Trailing Whitespace",
        description: "Flags suspicious trailing spaces/tabs per line.",
      },
    ],
    note: "Always work with UTF-8 plain text to preserve glyph fidelity.",
  },
  network: {
    id: "network",
    label: "Network",
    summary: "Offline PCAP simulations covering header and timing channels.",
    coverAccept: ".pcap,application/vnd.tcpdump.pcap,application/octet-stream",
    payloadAccept: "*/*",
    embedMethods: [
      {
        id: "ip-id-lsb",
        label: "IP ID LSB",
        description: "Manipulate IPv4 identification field parity.",
      },
      {
        id: "inter-packet-gap",
        label: "Inter-packet Gap",
        description: "Adjust inter-arrival timings to encode bits.",
        sampleOptions: {
          base_gap: 0.01,
          delta: 0.002,
        },
      },
    ],
    extractMethods: [
      {
        id: "ip-id-lsb",
        label: "IP ID LSB",
        description: "Recover payload length and bits from IPv4 IDs.",
      },
      {
        id: "inter-packet-gap",
        label: "Inter-packet Gap",
        description: "Infer bits from timing deviations between packets.",
        sampleOptions: {
          base_gap: 0.01,
          delta: 0.002,
        },
      },
    ],
    detectors: [
      {
        id: "header",
        label: "Header Bias",
        description: "Assess distribution of IPv4 ID parity bits.",
      },
      {
        id: "timing",
        label: "Timing Variance",
        description: "Variance of inter-arrival gaps to spotlight encodings.",
      },
    ],
    note: "Network operations stay offline – generated PCAPs never transmit packets.",
  },
  fs: {
    id: "fs",
    label: "Filesystem",
    summary: "Simulated NTFS-style alternate stream and slack embeddings.",
    coverAccept: "*/*",
    payloadAccept: "*/*",
    embedMethods: [
      {
        id: "sidecar",
        label: "Alternate Stream",
        description: "Emulates NTFS ADS via sidecar hidden file creation.",
      },
      {
        id: "pseudo-slack",
        label: "Pseudo Slack",
        description: "Stores payload in companion slack metadata file.",
      },
    ],
    extractMethods: [
      {
        id: "sidecar",
        label: "Alternate Stream",
        description: "Read associated .hidden sidecar to recover payload.",
      },
      {
        id: "pseudo-slack",
        label: "Pseudo Slack",
        description: "Read companion .slack file for hidden bytes.",
      },
    ],
    detectors: [
      {
        id: "ads",
        label: "Hidden Sidecar",
        description: "Checks for presence/size of .hidden companions.",
      },
      {
        id: "slack",
        label: "Slack Artifact",
        description: "Validates existence of .slack payload sidecars.",
      },
    ],
    note: "Outputs produce two files – original clone plus hidden companion payload.",
  },
  watermark: {
    id: "watermark",
    label: "Watermark",
    summary: "Robust DCT watermarking for grayscale provenance marks.",
    coverAccept: "image/*",
    payloadAccept: "*/*",
    embedMethods: [
      {
        id: "idct",
        label: "DCT Watermark",
        description: "Encode an 8×8 watermark ID within low-frequency DCT coefficients.",
        sampleOptions: {
          strength: 10.0,
        },
      },
    ],
    extractMethods: [
      {
        id: "idct",
        label: "DCT Watermark",
        description: "Reconstruct watermark ID by reversing DCT modulation.",
        sampleOptions: {
          strength: 10.0,
        },
      },
    ],
    detectors: [
      {
        id: "watermark-dct",
        label: "Energy Probe",
        description: "Totals watermark energy to determine presence and strength.",
      },
    ],
    note: "Expect grayscale inputs – convert color images before watermarking for best results.",
  },
};

type SuiteResult =
  | { type: "embed"; payload: ResearchEmbedResult }
  | { type: "extract"; payload: ResearchExtractResult }
  | { type: "detect"; payload: ResearchDetectResult };

function formatOptions(options: Record<string, unknown> | undefined): string {
  if (!options || Object.keys(options).length === 0) {
    return "{}";
  }
  try {
    return JSON.stringify(options, null, 2);
  } catch (error) {
    return "{}";
  }
}

export function ResearchSuitePage({ onBack }: ResearchSuitePageProps) {
  const [operation, setOperation] = useState<Operation>("embed");
  const [carrier, setCarrier] = useState<CarrierKey>("image");
  const [method, setMethod] = useState<string>(carriers.image.embedMethods[0]?.id ?? "");
  const [optionsText, setOptionsText] = useState<string>(formatOptions(carriers.image.embedMethods[0]?.sampleOptions));
  const [payloadMode, setPayloadMode] = useState<PayloadMode>("text");
  const [message, setMessage] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [payloadFile, setPayloadFile] = useState<File | null>(null);
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [result, setResult] = useState<SuiteResult | null>(null);
  const [download, setDownload] = useState<ArtifactDownload | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const config = carriers[carrier];
  const methodCatalog = useMemo<MethodInfo[]>(() => {
    if (operation === "embed") {
      return config.embedMethods;
    }
    if (operation === "extract") {
      return config.extractMethods;
    }
    return [];
  }, [config, operation]);

  useEffect(() => {
    const nextDefault = methodCatalog[0]?.id ?? "";
    if (!methodCatalog.some((entry) => entry.id === method)) {
      setMethod(nextDefault);
    }
    setMessage("");
    setCoverFile(null);
    setPayloadFile(null);
    setStegoFile(null);
    setResult(null);
    setDownload(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setDownloadUrl(null);
    setPreviewText(null);
    setErrorMessage(null);
  }, [carrier, methodCatalog]);

  useEffect(() => {
    if (operation === "detect") {
      setMethod("");
    } else {
      const defaultMethod = methodCatalog[0]?.id ?? "";
      setMethod(defaultMethod);
    }
    setResult(null);
    setDownload(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setDownloadUrl(null);
    setPreviewText(null);
    setErrorMessage(null);
    setMessage("");
    setCoverFile(null);
    setPayloadFile(null);
    setStegoFile(null);
  }, [operation, methodCatalog]);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  useEffect(() => {
    if (carrier === "text") {
      setPayloadMode("text");
      setPayloadFile(null);
    }
  }, [carrier]);

  const selectedMethod = methodCatalog.find((entry) => entry.id === method);

  const parseOptions = (): Record<string, unknown> => {
    if (!optionsText.trim()) {
      return {};
    }
    try {
      return JSON.parse(optionsText);
    } catch (error) {
      throw new Error("Options must be valid JSON");
    }
  };

  useEffect(() => {
    if (operation === "detect") {
      setOptionsText("{}");
      return;
    }
    const active = methodCatalog.find((entry) => entry.id === method);
    setOptionsText(formatOptions(active?.sampleOptions));
  }, [method, methodCatalog, operation]);

  const ensureDownloadUrl = async (artifact: ArtifactDownload) => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    const url = URL.createObjectURL(artifact.blob);
    setDownload(artifact);
    setDownloadUrl(url);
    if ((artifact.contentType && artifact.contentType.startsWith("text")) || artifact.blob.size < 4096) {
      try {
        const text = await artifact.blob.text();
        setPreviewText(text);
      } catch (error) {
        setPreviewText(null);
      }
    } else {
      setPreviewText(null);
    }
  };

  const runOperation = async () => {
    setErrorMessage(null);
    let tick: number | null = null;
    try {
      const options = parseOptions();
      setIsProcessing(true);
      setProgress(0);
      tick = window.setInterval(() => {
        setProgress((prev) => (prev >= 92 ? prev : prev + 4));
      }, 140);

      if (operation === "embed") {
        if (!coverFile) {
          throw new Error("Select a cover file before embedding");
        }
        let payloadSource: File | null = null;
        if (payloadMode === "text") {
          if (!message.trim()) {
            throw new Error("Provide a message to embed or switch to file payload");
          }
          payloadSource = new File([message], "payload.txt", { type: "text/plain" });
        } else {
          payloadSource = payloadFile;
        }
        if (!payloadSource) {
          throw new Error("Select a payload file to embed");
        }
        if (!method) {
          throw new Error("Choose an embedding method");
        }
        const embedResult = await researchEmbed({
          carrier,
          method,
          cover: coverFile,
          payload: payloadSource,
          options,
        });
        setResult({ type: "embed", payload: embedResult });
        const artifact = await fetchResearchArtifact(embedResult.stegoPath);
        await ensureDownloadUrl(artifact);
        setProgress(100);
        toast.success("Embedding completed");
      } else if (operation === "extract") {
        if (!stegoFile) {
          throw new Error("Upload a stego artifact to extract");
        }
        if (!method) {
          throw new Error("Choose an extraction method");
        }
        const extractResult = await researchExtract({
          carrier,
          method,
          stego: stegoFile,
          options,
        });
        setResult({ type: "extract", payload: extractResult });
        if (extractResult.payloadPath) {
          const artifact = await fetchResearchArtifact(extractResult.payloadPath);
          await ensureDownloadUrl(artifact);
        } else {
          setDownload(null);
          if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
          }
          setDownloadUrl(null);
          setPreviewText(null);
        }
        setProgress(100);
        toast.success("Extraction completed");
      } else {
        if (!stegoFile) {
          throw new Error("Upload a carrier artifact to analyze");
        }
        const detectResult = await researchDetect({
          carrier,
          stego: stegoFile,
          options,
        });
        setResult({ type: "detect", payload: detectResult });
        setDownload(null);
        if (downloadUrl) {
          URL.revokeObjectURL(downloadUrl);
        }
        setDownloadUrl(null);
        setPreviewText(null);
        setProgress(100);
        toast.success("Detection analysis ready");
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Operation failed";
      setErrorMessage(messageText);
      toast.error(messageText);
    } finally {
      if (tick !== null) {
        window.clearInterval(tick);
      }
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!download || !downloadUrl) {
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = download.filename || "artifact.bin";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const renderResult = () => {
    if (!result) {
      return (
        <div className="p-6 rounded-lg bg-muted/40 border border-border text-sm text-muted-foreground">
          Results and metrics will appear here once you run an operation.
        </div>
      );
    }

    if (result.type === "embed") {
      const entries = Object.entries(result.payload.metrics ?? {});
      const showImagePreview = download && downloadUrl && (download.contentType ?? "").startsWith("image/");
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Embedding Metrics</h3>
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No metrics were reported by this embedder.</p>
          ) : (
            <div className="grid gap-3">
              {entries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 rounded-md border border-border px-3 py-2">
                  <span className="text-sm text-muted-foreground uppercase tracking-wide">{key}</span>
                  <span className="text-sm font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
          {showImagePreview && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Preview</h4>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <img
                  src={downloadUrl}
                  alt={download?.filename ?? "Embedded artifact preview"}
                  className="max-h-64 w-full object-contain rounded"
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (result.type === "extract") {
      const entries = Object.entries(result.payload.metadata ?? {});
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardCopy className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Extraction Summary</h3>
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No metadata reported – payload may be empty.</p>
          ) : (
            <div className="grid gap-3">
              {entries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 rounded-md border border-border px-3 py-2">
                  <span className="text-sm text-muted-foreground uppercase tracking-wide">{key}</span>
                  <span className="text-sm font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
          {previewText && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Preview</h4>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                {previewText}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Detection Results</h3>
        </div>
        <div className="grid gap-3">
          {result.payload.detections.map((detector, index) => (
            <div key={`${detector.detector}-${index}`} className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{detector.detector}</span>
                {typeof detector.probability === "number" && (
                  <span className="text-sm text-muted-foreground">{(detector.probability * 100).toFixed(1)}%</span>
                )}
              </div>
              <div className="mt-2 text-sm grid gap-1">
                {Object.entries(detector)
                  .filter(([key]) => key !== "detector")
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <span className="uppercase tracking-wide text-xs text-muted-foreground">{key}</span>
                      <span className="text-xs font-medium">{String(value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6" style={{
      background: "radial-gradient(circle at bottom right, var(--muted) 0%, var(--background) 55%)",
    }}>
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" onClick={onBack} className="mb-6 hover:bg-black/5 text-black">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black/5 border-2 border-black/10 mb-4">
            <Beaker className="w-8 h-8 text-black" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl text-black mb-3">Research Suite Console</h1>
          <p className="text-[#505050] max-w-2xl mx-auto">
            Explore every carrier we just added to the backend suite. Combine embed, extract, and detection workflows in one advanced panel with direct access to generated artifacts and metrics.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-[#D0D0D0] bg-white shadow-lg p-6 space-y-6">
            <Tabs value={operation} onValueChange={(value) => setOperation(value as Operation)}>
              <TabsList className="grid grid-cols-3 bg-[#F5F5F5]">
                <TabsTrigger value="embed">Embed</TabsTrigger>
                <TabsTrigger value="extract">Extract</TabsTrigger>
                <TabsTrigger value="detect">Detect</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-4">
              <div>
                <label className="text-sm text-black block mb-2">Carrier</label>
                <Select value={carrier} onValueChange={(value) => setCarrier(value as CarrierKey)}>
                  <SelectTrigger className="bg-[#F5F5F5] border-[#D0D0D0] text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(carriers).map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-[#808080]">{config.summary}</p>
              </div>

              {operation !== "detect" && methodCatalog.length > 0 && (
                <div>
                  <label className="text-sm text-black block mb-2">Method</label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="bg-[#F5F5F5] border-[#D0D0D0] text-black">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {methodCatalog.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMethod && (
                    <div className="mt-2 text-xs text-[#606060]">
                      <p>{selectedMethod.description}</p>
                      {selectedMethod.recommendation && (
                        <p className="mt-1 text-[#808080]">{selectedMethod.recommendation}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {operation === "embed" && (
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm text-black block mb-2">Cover File</label>
                    <FileUpload
                      onFileSelect={setCoverFile}
                      acceptedTypes={config.coverAccept}
                      label="Upload carrier file"
                      icon={carrier === "audio" ? "audio" : carrier === "image" || carrier === "watermark" ? "image" : "file"}
                    />
                  </div>
                  <div>
                    <Tabs
                      value={payloadMode}
                      onValueChange={(value) => {
                        const next = value as PayloadMode;
                        setPayloadMode(next);
                        if (next === "text") {
                          setPayloadFile(null);
                        }
                      }}
                    >
                      <TabsList className="grid grid-cols-2 bg-[#F5F5F5]">
                        <TabsTrigger value="text">Text Payload</TabsTrigger>
                        <TabsTrigger value="file" disabled={carrier === "text"}>Binary Payload</TabsTrigger>
                      </TabsList>
                      <TabsContent value="text" className="mt-4 space-y-2">
                        <Textarea
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          placeholder="Type the secret payload here"
                          className="bg-[#F5F5F5] border-[#D0D0D0] text-black min-h-[120px]"
                        />
                        <p className="text-xs text-[#808080]">{message.length} characters</p>
                      </TabsContent>
                      <TabsContent value="file" className="mt-4">
                        <FileUpload
                          onFileSelect={setPayloadFile}
                          acceptedTypes={config.payloadAccept ?? "*/*"}
                          label="Upload payload file"
                          icon="file"
                        />
                        <p className="text-xs text-[#808080] mt-2">
                          Payload file will be streamed as-is; ensure it fits the carrier capacity.
                        </p>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )}

              {operation !== "embed" && (
                <div>
                  <label className="text-sm text-black block mb-2">{operation === "extract" ? "Stego File" : "Artifact"}</label>
                  <FileUpload
                    onFileSelect={setStegoFile}
                    acceptedTypes={config.coverAccept}
                    label="Upload file to analyze"
                    icon={carrier === "audio" ? "audio" : carrier === "image" || carrier === "watermark" ? "image" : carrier === "video" ? "file" : "file"}
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-black block mb-2">Advanced Options (JSON)</label>
                <Textarea
                  value={optionsText}
                  onChange={(event) => setOptionsText(event.target.value)}
                  className="bg-[#F5F5F5] border-[#D0D0D0] text-black font-mono text-xs min-h-[120px]"
                />
                <p className="text-xs text-[#808080] mt-1">Leave blank for defaults. Options map directly to backend kwargs.</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={runOperation}
                disabled={isProcessing}
                className="w-full bg-black text-white hover:bg-[#303030] disabled:bg-[#D0D0D0] disabled:text-[#808080]"
              >
                {isProcessing ? "Running..." : "Run Operation"}
              </Button>
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm text-black">
                      <span>Processing...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </motion.div>
                )}
              </AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700"
                >
                  {errorMessage}
                </motion.div>
              )}
            </div>
          </Card>

          <Card className="border-[#D0D0D0] bg-white shadow-lg p-6 space-y-6">
            {renderResult()}

            {download && downloadUrl && (
              <div className="rounded-lg border border-[#D0D0D0] bg-[#F5F5F5] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{download.filename}</p>
                    <p className="text-xs text-[#707070]">
                      {download.contentType ?? "application/octet-stream"} · {(download.blob.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button onClick={handleDownload} className="bg-black text-white hover:bg-[#303030]">
                    <Download className="w-4 h-4 mr-2" />
                    Download Artifact
                  </Button>
                </div>
                {previewText && (
                  <div className="rounded-md border border-[#D0D0D0] bg-white p-3 text-xs max-h-40 overflow-auto whitespace-pre-wrap">
                    {previewText}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="mt-8 grid lg:grid-cols-3 gap-4">
          <Card className="p-5 border-[#D0D0D0] bg-white shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <FlaskConical className="w-5 h-5" />
              <span className="font-semibold">Carrier Coverage</span>
            </div>
            <ul className="space-y-2 text-sm text-[#505050]">
              <li className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Image (RGB & DCT)</li>
              <li className="flex items-center gap-2"><Music className="w-4 h-4" /> Audio (PCM & Echo)</li>
              <li className="flex items-center gap-2"><Video className="w-4 h-4" /> Video (Frame LSB & Haar DWT)</li>
              <li className="flex items-center gap-2"><BookText className="w-4 h-4" /> Text (Zero-width & Whitespace)</li>
              <li className="flex items-center gap-2"><Network className="w-4 h-4" /> Network (Header & Timing)</li>
              <li className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> Filesystem (ADS & Slack)</li>
            </ul>
          </Card>
          <Card className="p-5 border-[#D0D0D0] bg-white shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Detector Hints</span>
            </div>
            <p className="text-sm text-[#505050]">
              Each detect run executes every registered detector for the selected carrier. Review probability scores alongside supporting statistics to form a decision – high probabilities with supporting metrics usually indicate tampering.
            </p>
          </Card>
          <Card className="p-5 border-[#D0D0D0] bg-white shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-semibold">Safety Notes</span>
            </div>
            <p className="text-sm text-[#505050]">
              Network carriers never transmit packets; operations stay within the artifact sandbox. Filesystem carriers clone inputs before writing hidden data, leaving originals untouched.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
