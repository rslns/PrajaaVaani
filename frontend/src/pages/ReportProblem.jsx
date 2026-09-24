import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import api from "../api";
import { CATEGORIES } from "../constants";
import CameraCapture from "../components/CameraCapture";
import { useAuth } from "../context/AuthContext";

export default function ReportProblem() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    area_name: "",
    latitude: null,
    longitude: null,
  });
  const [files, setFiles] = useState([]); // { file, preview, live }
  const [showCamera, setShowCamera] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const onFilesSelected = (e) => {
    const selected = Array.from(e.target.files || []).slice(0, 5 - files.length);
    setFiles((prev) => [
      ...prev,
      ...selected.map((file) => ({ file, preview: URL.createObjectURL(file), live: false })),
    ]);
  };

  const onCameraCapture = (file) => {
    setFiles((prev) => [...prev, { file, preview: URL.createObjectURL(file), live: true }].slice(0, 5));
    setShowCamera(false);
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post("/problems", form);

      for (let i = 0; i < files.length; i++) {
        setUploadStep(`Uploading evidence ${i + 1} of ${files.length}…`);
        const fd = new FormData();
        fd.append("file", files[i].file);
        fd.append("live", files[i].live ? "true" : "false");
        await api.post(`/problems/${data.id}/media`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate(`/problem/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadStep("");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm lg:col-span-3"
      >
        <div>
          <h1 className="font-display text-xl font-semibold text-navy-800">Report a Problem</h1>
          <p className="mt-1 text-sm text-navy-400">
            Reporting as <span className="font-semibold text-navy-600">{user?.displayName || user?.email}</span>.
            This creates a permanent, public record — it can be escalated but never quietly deleted.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy-600">Title</label>
          <input
            required
            value={form.title}
            onChange={update("title")}
            placeholder="e.g. Large pothole near Municipal High School"
            className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy-600">Description</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={update("description")}
            placeholder="What's the problem, how severe is it, since when?"
            className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy-600">Category</label>
            <select
              value={form.category}
              onChange={update("category")}
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy-600">Area / Ward</label>
            <input
              required
              value={form.area_name}
              onChange={update("area_name")}
              placeholder="e.g. Ward 42, Vijayawada"
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-100"
            />
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-saffron-500 py-2.5 text-sm font-semibold text-navy-900 shadow-sm transition-colors hover:bg-saffron-400 disabled:opacity-60"
        >
          {submitting ? uploadStep || "Submitting…" : "Submit Report"}
        </button>
      </motion.form>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-5 lg:col-span-2"
      >
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-navy-700">Location</h2>
          <button
            type="button"
            onClick={useMyLocation}
            className="w-full rounded-lg border border-navy-100 bg-navy-50 py-2 text-sm font-medium text-navy-600 hover:bg-navy-100"
          >
            {locating ? "Locating…" : "📍 Use my current location"}
          </button>
          {form.latitude && (
            <p className="mt-2 text-center text-xs text-navy-400">
              {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-navy-700">Photo / Video evidence</h2>
          <p className="mb-3 text-xs text-navy-400">
            Up to 5 files. Live camera capture is preferred — it's proof the photo is of this moment, not an old picture.
          </p>

          <button
            type="button"
            onClick={() => setShowCamera(true)}
            disabled={files.length >= 5}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-600 disabled:opacity-40"
          >
            📷 Take Photo / Record Video
          </button>

          <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/50 py-3 text-center text-xs font-medium text-navy-500 transition-colors hover:border-saffron-400 hover:bg-saffron-50">
            or choose from device
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={onFilesSelected}
              disabled={files.length >= 5}
              className="hidden"
            />
          </label>

          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {files.map((f, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-navy-100">
                  {f.file.type.startsWith("video") ? (
                    <video src={f.preview} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={f.preview} className="h-full w-full object-cover" alt="preview" />
                  )}
                  {f.live && (
                    <span className="absolute bottom-1 left-1 rounded bg-saffron-500 px-1.5 py-0.5 text-[9px] font-bold text-navy-900">
                      LIVE
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-navy-900/70 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showCamera && (
          <CameraCapture onCapture={onCameraCapture} onClose={() => setShowCamera(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
