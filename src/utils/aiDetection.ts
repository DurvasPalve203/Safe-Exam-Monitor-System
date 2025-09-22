// src/utils/aiDetection.ts
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

// Types consumed by your UI
export type ViolationAlert = {
  type: "multiple_persons" | "device_detected";
  message: string;
  timestamp: number; // epoch ms
  confidence: number; // 0..1 (max score of relevant detections)
};

export type DetectedObject = {
  type: "person" | "device";
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

export type DetectionResult = {
  personCount: number;
  deviceDetected: boolean;
  confidence: number; // max of device/person scores
  detectedObjects: DetectedObject[];
};

type Prediction = {
  bbox: [number, number, number, number]; // [x,y,w,h] in video coordinates
  class: string;
  score: number;
};

// Tunable config
const config = {
  allowedPersons: 1,
  minPersonScore: 0.55,
  minDeviceScore: 0.60,
  deviceClassNames: ["cell phone"],

  // Stability
  smoothingWindow: 12,
  triggerRatio: 0.35,
  cooldownMs: 4000,

  // Filter tiny detections (reduce false positives)
  minBoxAreaRatio: 0.004, // 0.4% of frame
};

let model: cocoSsd.ObjectDetection | null = null;
let initialized = false;

// Smoothing windows
const multiPeopleWindow: boolean[] = [];
const deviceWindow: boolean[] = [];

// Separate cooldowns per violation type
let lastWarnAtMultiple = 0;
let lastWarnAtDevice = 0;

// Cache predictions to avoid double inference in the same tick
let lastPredsCache: { at: number; preds: Prediction[] } | null = null;

// Helpers
function pushAndRatio(buf: boolean[], val: boolean, maxLen: number): number {
  buf.push(val);
  if (buf.length > maxLen) buf.shift();
  const trues = buf.reduce((a, b) => a + (b ? 1 : 0), 0);
  return trues / buf.length;
}

function now() {
  return Date.now();
}

function isDeviceClass(name: string) {
  return config.deviceClassNames.includes(name.toLowerCase());
}

async function ensureBackend() {
  if (tf.getBackend() !== "webgl") {
    await tf.setBackend("webgl");
  }
  await tf.ready();
}

async function getPredictions(video: HTMLVideoElement): Promise<Prediction[]> {
  if (!model) return [];
  if (!video.videoWidth || !video.videoHeight) return [];

  // Reuse predictions if called again within 300ms
  const t = performance.now();
  if (lastPredsCache && t - lastPredsCache.at < 300) {
    return lastPredsCache.preds;
  }

  const preds = (await model.detect(video)) as Prediction[];

  // Filter tiny boxes
  const frameArea = video.videoWidth * video.videoHeight;
  const filtered = preds.filter((p) => {
    const area = p.bbox[2] * p.bbox[3];
    return area / frameArea >= config.minBoxAreaRatio;
  });

  lastPredsCache = { at: t, preds: filtered };
  return filtered;
}

function toDetectedObjects(preds: Prediction[]): DetectedObject[] {
  const objs: DetectedObject[] = [];
  for (const p of preds) {
    if (p.class === "person" && p.score >= config.minPersonScore) {
      const [x, y, w, h] = p.bbox;
      objs.push({ type: "person", x, y, width: w, height: h, confidence: p.score });
    }
    if (isDeviceClass(p.class) && p.score >= config.minDeviceScore) {
      const [x, y, w, h] = p.bbox;
      objs.push({ type: "device", x, y, width: w, height: h, confidence: p.score });
    }
  }
  return objs;
}

export const aiDetectionService = {
  isInitialized() {
    return initialized;
  },

  async initialize(): Promise<void> {
    if (initialized && model) return;
    await ensureBackend();

    // Small/fast base; good accuracy for "person" and "cell phone"
    model = await cocoSsd.load({ base: "lite_mobilenet_v2" });

    // Reset smoothing windows and cooldowns
    multiPeopleWindow.length = 0;
    deviceWindow.length = 0;
    lastWarnAtMultiple = 0;
    lastWarnAtDevice = 0;
    lastPredsCache = null;

    initialized = true;
  },

  // Returns violations (rate-limited + smoothed)
  async analyzeForViolations(video: HTMLVideoElement): Promise<ViolationAlert[]> {
    if (!initialized) {
      // Try to lazy-init if missed
      await this.initialize();
    }
    if (!model || !video || !video.videoWidth) return [];

    // Skip if tab is hidden to reduce noise/cost
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return [];
    }

    const preds = await getPredictions(video);

    const persons = preds.filter((p) => p.class === "person" && p.score >= config.minPersonScore);
    const devices = preds.filter((p) => isDeviceClass(p.class) && p.score >= config.minDeviceScore);

    const personsCount = persons.length;
    const deviceDetected = devices.length > 0;

    // Smoothing
    const multiNow = personsCount > config.allowedPersons;
    const deviceNow = deviceDetected;

    const multiRatio = pushAndRatio(multiPeopleWindow, multiNow, config.smoothingWindow);
    const deviceRatio = pushAndRatio(deviceWindow, deviceNow, config.smoothingWindow);

    const alerts: ViolationAlert[] = [];
    const ts = now();

    // Multiple persons violation
    if (multiRatio >= config.triggerRatio && ts - lastWarnAtMultiple >= config.cooldownMs) {
      lastWarnAtMultiple = ts;
      const maxPersonScore = persons.reduce((m, p) => Math.max(m, p.score), 0);
      alerts.push({
        type: "multiple_persons",
        message: `Multiple people detected (${personsCount}).`,
        timestamp: ts,
        confidence: maxPersonScore || 0.9, // 0.9 if more than one person but scores were filtered
      });
    }

    // Device violation
    if (deviceRatio >= config.triggerRatio && ts - lastWarnAtDevice >= config.cooldownMs) {
      lastWarnAtDevice = ts;
      const maxDeviceScore = devices.reduce((m, d) => Math.max(m, d.score), 0);
      alerts.push({
        type: "device_detected",
        message: `Mobile device detected in camera.`,
        timestamp: ts,
        confidence: maxDeviceScore || 0.8,
      });
    }

    return alerts;
  },

  // Returns current detection state and objects (no rate limit)
  async detectViolations(video: HTMLVideoElement): Promise<DetectionResult> {
    if (!initialized) {
      await this.initialize();
    }
    if (!model || !video || !video.videoWidth) {
      return {
        personCount: 0,
        deviceDetected: false,
        confidence: 0,
        detectedObjects: [],
      };
    }

    const preds = await getPredictions(video);
    const detectedObjects = toDetectedObjects(preds);

    const personCount = detectedObjects.filter((d) => d.type === "person").length;
    const deviceScores = detectedObjects.filter((d) => d.type === "device").map((d) => d.confidence);
    const personScores = detectedObjects.filter((d) => d.type === "person").map((d) => d.confidence);

    const deviceDetected = deviceScores.length > 0;
    const confidence = deviceDetected
      ? Math.max(...deviceScores)
      : personScores.length > 0
      ? Math.max(...personScores)
      : 0;

    return {
      personCount,
      deviceDetected,
      confidence,
      detectedObjects,
    };
  },
};

export default aiDetectionService;