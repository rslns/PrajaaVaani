import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const MAX_VIDEO_SECONDS = 15;

// Live camera capture — no gallery access. This exists specifically so a photo
// can't be an old/reused image: the timestamp is "now" by construction. Works
// in local dev (http://localhost) and in production as long as the site is
// served over HTTPS (Vercel/Render both do this by default) — browsers refuse
// camera access on plain HTTP for any other host.
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [mode, setMode] = useState("photo"); // 'photo' | 'video'
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState(null); // { blob, url, type }

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: mode === "video" })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Camera access was denied or isn't available on this device."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [mode]);

  useEffect(() => {
    let timer;
    if (recording) {
      timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [recording]);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => setPreview({ blob, url: URL.createObjectURL(blob), type: "image/jpeg" }),
      "image/jpeg",
      0.9
    );
  };

  const startRecording = () => {
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setPreview({ blob, url: URL.createObjectURL(blob), type: "video/webm" });
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
    setSeconds(0);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  useEffect(() => {
    if (recording && seconds >= MAX_VIDEO_SECONDS) stopRecording();
  }, [seconds, recording]);

  const retake = () => {
    setPreview(null);
    setSeconds(0);
  };

  const usePreview = () => {
    const ext = preview.type === "image/jpeg" ? "jpg" : "webm";
    const file = new File([preview.blob], `capture-${Date.now()}.${ext}`, { type: preview.type });
    onCapture(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col bg-navy-900"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex overflow-hidden rounded-full border border-white/20">
          <button
            onClick={() => { setMode("photo"); setPreview(null); }}
            className={`px-4 py-1.5 text-xs font-semibold ${mode === "photo" ? "bg-saffron-500 text-navy-900" : "text-white"}`}
          >
            Photo
          </button>
          <button
            onClick={() => { setMode("video"); setPreview(null); }}
            className={`px-4 py-1.5 text-xs font-semibold ${mode === "video" ? "bg-saffron-500 text-navy-900" : "text-white"}`}
          >
            Video
          </button>
        </div>
        <button onClick={onClose} className="text-2xl leading-none text-white">
          ✕
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error && <p className="max-w-xs text-center text-sm text-white">{error}</p>}

        {!error && !preview && (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        )}

        {!error && preview && preview.type === "image/jpeg" && (
          <img src={preview.url} className="h-full w-full object-contain" alt="Captured" />
        )}
        {!error && preview && preview.type !== "image/jpeg" && (
          <video src={preview.url} controls autoPlay className="h-full w-full object-contain" />
        )}

        {recording && (
          <span className="absolute top-4 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
            ● REC {seconds}s / {MAX_VIDEO_SECONDS}s
          </span>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-center gap-4 px-4 py-6">
        {!preview && !error && mode === "photo" && (
          <button
            onClick={takePhoto}
            className="h-16 w-16 rounded-full border-4 border-white bg-saffron-500"
            aria-label="Take photo"
          />
        )}
        {!preview && !error && mode === "video" && !recording && (
          <button
            onClick={startRecording}
            className="h-16 w-16 rounded-full border-4 border-white bg-rose-600"
            aria-label="Start recording"
          />
        )}
        {!preview && !error && mode === "video" && recording && (
          <button
            onClick={stopRecording}
            className="h-16 w-16 rounded-2xl border-4 border-white bg-rose-600"
            aria-label="Stop recording"
          />
        )}

        {preview && (
          <div className="flex gap-3">
            <button
              onClick={retake}
              className="rounded-full border border-white/40 px-5 py-2 text-sm font-medium text-white"
            >
              Retake
            </button>
            <button
              onClick={usePreview}
              className="rounded-full bg-saffron-500 px-5 py-2 text-sm font-semibold text-navy-900"
            >
              Use this
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
