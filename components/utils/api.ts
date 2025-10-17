import { toast } from "sonner";

const DEFAULT_API_BASE = "http://127.0.0.1:8000";
const apiOrigin = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? DEFAULT_API_BASE;
const API_BASE_URL = `${apiOrigin}/api/v1`;

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

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
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