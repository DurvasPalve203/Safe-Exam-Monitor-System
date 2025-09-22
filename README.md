AI‑Powered Real‑Time Exam Monitoring System
Project Synopsis
Online examinations are increasingly relied upon in education, but preserving academic integrity without intrusive or expensive tools remains a challenge. This project implements a privacy-first, AI-driven proctoring platform built with React, TypeScript, Supabase, and TensorFlow.js (TFJS).

By running all detection directly in the student’s browser (e.g., extra person detection, mobile device identification, tab/window focus tracking), the system ensures fairness and accountability while never transmitting raw video to servers. Only violation events and metadata are securely logged.

Review of Literature
CNN-based detectors (MobileNet family, COCO‑SSD) → efficient person/device recognition in real time.
Computer vision for anomaly detection → bounding box overlays aid interpretability.
Browser APIs (JavaScript Visibility API, focus/blur events) → detect tab switching.
Existing solutions (ProctorU, Mettl, Examity) → closed-source, expensive, and opaque.
Open-source AI & cloud integration → a community-driven alternative, emphasizing reproducibility and privacy.
Problem Statement and Objectives
Current systems either stream sensitive data to third parties or require costly licensed software. What is missing is a transparent, affordable, privacy-respecting real‑time invigilation system.

Objectives:

Detect multiple persons and cell phones in the camera feed
Overlay bounding boxes with confidence scores for interpretability
Monitor tab switches and window unfocusing
Alert examiners via Supabase edge functions (emails)
Track violation history in the UI and auto‑terminate persistent offenders
Provide a configurable, extensible architecture
System Architecture
Frontend

React + TypeScript + Vite
TailwindCSS + shadcn/ui for UI components
WebRTC: webcam stream capture
TensorFlow.js (coco‑ssd model): real‑time object/person/device detection
Framer Motion: animations & transitions
Backend (Supabase)

Auth: User profiles & exam sessions
Database: exam_sessions, proctor_events (optional detailed logs)
Edge Functions: Send email alerts on violation events
Storage: migration management, config files
Data Flow

Camera stream captured in browser
AI loop (every ~2s) detects people/objects
Smoothed detections → violation triggers
UI shows overlays + warnings timeline
Violation counts stored in Supabase
Email alerts sent automatically if threshold exceeded
Current Implementation (MVP)
Real-time webcam monitoring in browser
Multiple person + phone detection with TFJS coco‑ssd
Violation smoothing & cooldown logic to reduce false positives
Tab/window event monitoring with configurable thresholds
Supabase integration: auth, violations DB, email functions
UI dashboard + violation history timeline for students and proctors
Session auto-termination after repeated violations
Repository Structure
text

my-app/
  .env                      # Environment secrets
  index.html                # Entry HTML
  package.json              # Project metadata
  vite.config.ts            # Vite bundler config
  tailwind.config.ts        # Tailwind CSS configuration
  eslint.config.js          # ESLint rules
  
  public/
    models/                 # AI/ML model files
      crowdhuman_custom.pt
    placeholder.svg
    robots.txt

  src/
    App.tsx                 # Root React component
    main.tsx                # React DOM entry point
    App.css / index.css     # Global CSS
    vite-env.d.ts           # Vite type declarations

    components/             # Reusable UI components 
      ui/                   # Button, Card, Form, etc.
      AiViolationHistory.tsx

    hooks/                  # Custom React hooks
    integrations/           # External services (Supabase client, etc.)
    lib/                    # Utility helpers
    pages/                  # Dashboard, Exam, Auth, Teachers
      Exam.tsx              # Core monitoring page
    providers/              # Context providers (Theme, etc.)
    utils/
      aiDetection.ts        # TFJS AI detection logic
  
  supabase/
    migrations/             # Database schema (profiles, exam_sessions, etc.)
    functions/              # Edge functions (send-email-alert)
    config.toml             # Supabase config
Key Files:

src/pages/Exam.tsx → exam UI, monitoring loop, violation counting
src/utils/aiDetection.ts → detection algorithm (people + phones + smoothing)
src/components/AiViolationHistory.tsx → renders violations w/ timestamp
Getting Started
Prerequisites
Node.js 18+ or Bun 1.0+
Supabase project (URL + anon key)
Modern browser (WebRTC + WebGL enabled)
Install
Bash

# Using npm
npm install
npm i @tensorflow/tfjs @tensorflow-models/coco-ssd

# Or using bun
bun install
bun add @tensorflow/tfjs @tensorflow-models/coco-ssd
Configure
.env file:

text

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
Run
Bash

npm run dev
# or
bun dev
Visit http://localhost:5173 → allow camera.

Features
👀 Browser-side AI detection (no video leaves client)
🧍 Multi-person detection
📱 Phone/device detection
🕑 Rate-limited violations & cooldown smoothing
🧾 Violation tracker timeline (visual & persistent)
📧 Email alerts via Supabase Edge Functions
🔒 Privacy-respecting by design
Roadmap
Higher-accuracy models with WebGPU/ONNX
Expand violation classes (tablets, laptops)
Proctor dashboard with live session feed
Customizable per-exam strictness policies
Role-based authentication (students, teachers, admins)
Privacy and Security
No video/audio streams are ever uploaded.
Only lightweight JSON violation events are sent to Supabase.
Requires HTTPS in production due to browser camera policy.
License
MIT License (recommended). Add LICENSE file in repo root.

