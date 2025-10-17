import { toast } from "sonner";

const DEFAULT_API_BASE = "http://127.0.0.1:8100";
const DEFAULT_RESEARCH_API_BASE = "http://127.0.0.1:8000";
const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const apiOrigin = metaEnv.VITE_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE;
const API_BASE_URL = `${apiOrigin}/api/v1`;
const researchOrigin =
  metaEnv.VITE_RESEARCH_API_BASE_URL?.replace(/\/$/, "") ??
  (metaEnv.VITE_API_BASE_URL ? apiOrigin : DEFAULT_RESEARCH_API_BASE);

interface StegoResponsePayload {
  filename: string;
  media_type: string;
  data: string;
}

interface MessageResponsePayload {
  message: string;
  bytes_length: number;
}

interface DetectionResponsePayload {
  suspected: boolean;
  confidence: number;
  details: Record<string, number> & { probability?: number };
}

interface WaveformPointPayload {
  position: number;
  amplitude: number;
}

interface AudioSuiteResponsePayload {
  stego: StegoResponsePayload;
  waveform: WaveformPointPayload[];
}

export interface AudioOverviewPayload {
  hero_title: string;
  hero_subtitle: string;
  features: { title: string; description: string }[];
  actions: { title: string; description: string; cta: string }[];
  narrative: string;
}

interface StegoAsset {
  blob: Blob;
  filename: string;
  mediaType: string;
}

async function requestFromBase<T>(base: string, path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) {
    const text = await response.text();
    const message = (() => {
      try {
        const parsed = JSON.parse(text) as { detail?: string | string[] };
        if (Array.isArray(parsed.detail)) {
          return parsed.detail.join(", ");
        }
        if (typeof parsed.detail === "string") {
          return parsed.detail;
        }
      } catch (error) {
        // ignore JSON parse errors and fall through to text
      }
      return text || `Request failed with status ${response.status}`;
    })();
    toast.error(message);
    throw new Error(message);
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  const text = await response.text();
  return JSON.parse(text) as T;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  return requestFromBase<T>(API_BASE_URL, path, init);
}

async function requestResearch<T>(path: string, init: RequestInit): Promise<T> {
  return requestFromBase<T>(researchOrigin, path, init);
}

function buildFormData(entries: Record<string, FormDataEntryValue | undefined>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      formData.append(key, value);
    }
  }
  return formData;
}

function base64ToBlob(payload: string, mediaType: string): Blob {
  const binary = atob(payload);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mediaType });
}

async function postMultipart<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: formData,
  });
}

async function postResearchMultipart<T>(path: string, formData: FormData): Promise<T> {
  return requestResearch<T>(path, {
    method: "POST",
    body: formData,
  });
}

function mapStegoAsset(payload: StegoResponsePayload): StegoAsset {
  return {
    blob: base64ToBlob(payload.data, payload.media_type),
    filename: payload.filename,
    mediaType: payload.media_type,
  };
}

export async function hideMessageInImage(file: File, message: string, passphrase?: string): Promise<StegoAsset> {
  const formData = buildFormData({
    file,
    message,
    passphrase: passphrase || undefined,
  });
  const payload = await postMultipart<StegoResponsePayload>("/steganography/image/hide", formData);
  return mapStegoAsset(payload);
}

export async function hideMessageInAudio(file: File, message: string, passphrase?: string): Promise<StegoAsset> {
  const formData = buildFormData({
    file,
    message,
    passphrase: passphrase || undefined,
  });
  const payload = await postMultipart<StegoResponsePayload>("/steganography/audio/hide", formData);
  return mapStegoAsset(payload);
}

export async function retrieveMessageFromImage(file: File, passphrase?: string): Promise<MessageResponsePayload> {
  const formData = buildFormData({
    file,
    passphrase: passphrase || undefined,
  });
  return postMultipart<MessageResponsePayload>("/steganography/image/retrieve", formData);
}

export async function retrieveMessageFromAudio(file: File, passphrase?: string): Promise<MessageResponsePayload> {
  const formData = buildFormData({
    file,
    passphrase: passphrase || undefined,
  });
  return postMultipart<MessageResponsePayload>("/steganography/audio/retrieve", formData);
}

export async function detectImageSteganography(file: File): Promise<DetectionResponsePayload> {
  const formData = buildFormData({ file });
  return postMultipart<DetectionResponsePayload>("/steganography/image/detect", formData);
}

export async function detectAudioSteganography(file: File): Promise<DetectionResponsePayload> {
  const formData = buildFormData({ file });
  return postMultipart<DetectionResponsePayload>("/steganography/audio/detect", formData);
}

export async function embedAudioSuite(file: File, message: string, passphrase?: string): Promise<{
  asset: StegoAsset;
  waveform: WaveformPointPayload[];
}> {
  const formData = buildFormData({
    file,
    message,
    passphrase: passphrase || undefined,
  });
  const payload = await postMultipart<AudioSuiteResponsePayload>("/steganography/audio/suite/embed", formData);
  return {
    asset: mapStegoAsset(payload.stego),
    waveform: payload.waveform,
  };
}

export async function fetchAudioOverview(): Promise<AudioOverviewPayload> {
  return request<AudioOverviewPayload>("/steganography/audio/overview", {
    method: "GET",
  });
}

export type DetectionResponse = DetectionResponsePayload;
export type WaveformPoint = WaveformPointPayload;
export type StegoAssetResponse = StegoAsset;

interface ResearchEmbedResponsePayload {
  metrics: Record<string, unknown>;
  stego_path: string;
}

interface ResearchExtractResponsePayload {
  result: Record<string, unknown>;
  payload_path?: string;
}

interface ResearchDetectResponsePayload {
  detections: Array<{ detector: string } & Record<string, unknown>>;
}

export interface ResearchEmbedParams {
  carrier: string;
  method: string;
  cover: File;
  payload: Blob | File;
  options?: Record<string, unknown>;
}

export interface ResearchExtractParams {
  carrier: string;
  method: string;
  stego: File;
  options?: Record<string, unknown>;
}

export interface ResearchDetectParams {
  carrier: string;
  stego: File;
  options?: Record<string, unknown>;
}

export interface ResearchEmbedResult {
  metrics: Record<string, unknown>;
  stegoPath: string;
}

export interface ResearchExtractResult {
  metadata: Record<string, unknown>;
  payloadPath?: string;
}

export interface ResearchDetectResult {
  detections: Array<{ detector: string } & Record<string, unknown>>;
}

export interface ArtifactDownload {
  blob: Blob;
  filename: string;
  contentType: string | null;
}

export async function researchEmbed(params: ResearchEmbedParams): Promise<ResearchEmbedResult> {
  const { carrier, method, cover, payload, options } = params;
  const payloadFile = payload instanceof File ? payload : new File([payload], "payload.bin", { type: "application/octet-stream" });
  const formData = buildFormData({
    carrier,
    method,
    options: JSON.stringify(options ?? {}),
    cover,
    payload: payloadFile,
  });
  const response = await postResearchMultipart<ResearchEmbedResponsePayload>("/embed", formData);
  return {
    metrics: response.metrics ?? {},
    stegoPath: response.stego_path,
  };
}

export async function researchExtract(params: ResearchExtractParams): Promise<ResearchExtractResult> {
  const { carrier, method, stego, options } = params;
  const formData = buildFormData({
    carrier,
    method,
    options: JSON.stringify(options ?? {}),
    stego,
  });
  const response = await postResearchMultipart<ResearchExtractResponsePayload>("/extract", formData);
  return {
    metadata: response.result ?? {},
    payloadPath: response.payload_path,
  };
}

export async function researchDetect(params: ResearchDetectParams): Promise<ResearchDetectResult> {
  const { carrier, stego, options } = params;
  const formData = buildFormData({
    carrier,
    options: JSON.stringify(options ?? {}),
    stego,
  });
  const response = await postResearchMultipart<ResearchDetectResponsePayload>("/detect", formData);
  return {
    detections: response.detections ?? [],
  };
}

export async function fetchResearchArtifact(path: string): Promise<ArtifactDownload> {
  const url = new URL(`${researchOrigin}/artifact`);
  url.searchParams.set("path", path);
  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text();
    const message = text || `Failed to download artifact (${response.status})`;
    toast.error(message);
    throw new Error(message);
  }
  const contentType = response.headers.get("content-type");
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const fallback = path.split("/").pop() ?? "artifact.bin";
  return {
    blob: await response.blob(),
    filename: match ? match[1] : fallback,
    contentType,
  };
}