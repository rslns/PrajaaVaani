import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import api from "../api";
import StatusBadge from "../components/StatusBadge";
import Timeline from "../components/Timeline";
import StarRating from "../components/StarRating";
import CameraCapture from "../components/CameraCapture";
import { NEXT_STATUS_OPTIONS } from "../constants";
import { useAuth } from "../context/AuthContext";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const mediaUrl = (path) => `${API_ORIGIN}${path}`;

export default function ProblemDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [note, setNote] = useState("");
  const [actorRole, setActorRole] = useState("officer");
  const [updating, setUpdating] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [fundingForm, setFundingForm] = useState(null);

  const load = () => api.get(`/problems/${id}`).then(({ data }) => setProblem(data));

  useEffect(() => {
    load();
  }, [id]);

  const requireLogin = () => {
    if (!user) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const advance = async (toStatus) => {
    if (requireLogin()) return;
    setUpdating(true);
    try {
      await api.patch(`/problems/${id}/status`, { to_status: toStatus, actor_role: actorRole, note: note || undefined });
      setNote("");
      await load();
    } finally {
      setUpdating(false);
    }
  };

  const uploadFile = async (file, live = false) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("live", live ? "true" : "false");
    await api.post(`/problems/${id}/media`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  };

  const onPickFiles = async (e) => {
    if (requireLogin()) return;
    const chosen = Array.from(e.target.files || []);
    if (chosen.length === 0) return;
    setUploading(true);
    try {
      for (const file of chosen) await uploadFile(file, false);
      await load();
    } finally {
      setUploading(false);
    }
  };

  const onCameraCapture = async (file) => {
    setShowCamera(false);
    setUploading(true);
    try {
      await uploadFile(file, true);
      await load();
    } finally {
      setUploading(false);
    }
  };

  const toggleUpvote = async () => {
    if (requireLogin()) return;
    const { data } = await api.post(`/problems/${id}/upvote`);
    setProblem(data);
  };

  const rate = async (stars) => {
    if (requireLogin()) return;
    const { data } = await api.post(`/problems/${id}/rate`, { stars });
    setProblem(data);
  };

  const saveFunding = async () => {
    const { data } = await api.patch(`/problems/${id}/funding`, fundingForm);
    setProblem(data);
    setFundingForm(null);
  };

  if (!problem) return <p className="text-sm text-navy-300">Loading…</p>;

  const nextOptions = NEXT_STATUS_OPTIONS[problem.current_status] || [];
  const isOfficerOrAdmin = ["officer", "admin"].includes(profile?.role);
  const fundingPct =
    problem.funding_estimated && problem.funding_received
      ? Math.min(100, Math.round((problem.funding_received / problem.funding_estimated) * 100))
      : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-lg font-semibold text-navy-800">{problem.title}</h1>
            <StatusBadge status={problem.current_status} />
          </div>
          <p className="mt-1 text-xs font-medium text-saffron-600">
            {problem.category} · {problem.area_name} · reported by {problem.reporter.name}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-navy-600">{problem.description}</p>
          {problem.latitude && (
            <p className="mt-3 text-xs text-navy-300">
              📍 {problem.latitude.toFixed(4)}, {problem.longitude.toFixed(4)}
            </p>
          )}

          {/* Community signals: upvote + severity rating */}
          <div className="mt-5 flex flex-wrap items-center gap-6 border-t border-navy-50 pt-4">
            <button
              onClick={toggleUpvote}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                problem.viewer.has_upvoted
                  ? "border-saffron-400 bg-saffron-50 text-saffron-700"
                  : "border-navy-100 text-navy-500 hover:border-saffron-400 hover:text-saffron-700"
              }`}
            >
              ▲ {problem.upvote_count} {problem.viewer.has_upvoted ? "Upvoted" : "Upvote"}
            </button>
            <div>
              <p className="mb-1 text-xs text-navy-400">
                How serious is this? {problem.severity_count > 0 && `(${problem.severity_avg.toFixed(1)} avg, ${problem.severity_count} ratings)`}
              </p>
              <StarRating value={problem.viewer.my_rating || 0} onRate={rate} />
            </div>
          </div>
        </div>

        {/* Funding tracker (informational — this app does not collect payments) */}
        {(problem.funding_estimated || isOfficerOrAdmin) && (
          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy-700">Funding tracker</h2>
              {isOfficerOrAdmin && (
                <button
                  onClick={() =>
                    setFundingForm(
                      fundingForm
                        ? null
                        : {
                            funding_estimated: problem.funding_estimated || 0,
                            funding_pledged: problem.funding_pledged || 0,
                            funding_received: problem.funding_received || 0,
                            funding_link: problem.funding_link || "",
                          }
                    )
                  }
                  className="text-xs font-semibold text-saffron-600 hover:text-saffron-700"
                >
                  {fundingForm ? "Cancel" : "Edit (officer/admin)"}
                </button>
              )}
            </div>

            {!fundingForm ? (
              <>
                {problem.funding_estimated ? (
                  <>
                    <div className="mb-1 flex justify-between text-xs text-navy-500">
                      <span>₹{(problem.funding_received || 0).toLocaleString("en-IN")} received</span>
                      <span>of ₹{problem.funding_estimated.toLocaleString("en-IN")} estimated</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-navy-50">
                      <div className="h-full rounded-full bg-saffron-500" style={{ width: `${fundingPct}%` }} />
                    </div>
                    {problem.funding_link && (
                      <a
                        href={problem.funding_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-xs font-semibold text-saffron-600 hover:underline"
                      >
                        Contribute via verified platform →
                      </a>
                    )}
                    <p className="mt-3 text-[11px] text-navy-300">
                      This app tracks funding transparently but does not collect payments directly —
                      contributions go through the verified platform linked above.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-navy-300">No funding information added yet.</p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Estimated cost (₹)"
                  value={fundingForm.funding_estimated}
                  onChange={(e) => setFundingForm({ ...fundingForm, funding_estimated: +e.target.value })}
                  className="w-full rounded-lg border border-navy-100 px-3 py-1.5 text-sm"
                />
                <input
                  type="number"
                  placeholder="Received so far (₹)"
                  value={fundingForm.funding_received}
                  onChange={(e) => setFundingForm({ ...fundingForm, funding_received: +e.target.value })}
                  className="w-full rounded-lg border border-navy-100 px-3 py-1.5 text-sm"
                />
                <input
                  placeholder="Verified funding platform / UPI link"
                  value={fundingForm.funding_link}
                  onChange={(e) => setFundingForm({ ...fundingForm, funding_link: e.target.value })}
                  className="w-full rounded-lg border border-navy-100 px-3 py-1.5 text-sm"
                />
                <button
                  onClick={saveFunding}
                  className="rounded-lg bg-saffron-500 px-4 py-1.5 text-xs font-semibold text-navy-900 hover:bg-saffron-400"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        )}

        {/* Media gallery */}
        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy-700">Photo / Video evidence</h2>
            <div className="flex items-center gap-3 text-xs font-semibold text-saffron-600">
              <button onClick={() => (requireLogin() ? null : setShowCamera(true))} className="hover:text-saffron-700">
                📷 Add live
              </button>
              <label className="cursor-pointer hover:text-saffron-700">
                {uploading ? "Uploading…" : "+ From device"}
                <input type="file" accept="image/*,video/*" multiple onChange={onPickFiles} className="hidden" />
              </label>
            </div>
          </div>

          {problem.media.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-navy-100 py-8 text-center text-xs text-navy-300">
              No photos or videos attached yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {problem.media.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setLightbox(m)}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-navy-100"
                >
                  {m.media_type === "video" ? (
                    <video src={mediaUrl(m.url)} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={mediaUrl(m.url)} className="h-full w-full object-cover transition-transform group-hover:scale-105" alt="" />
                  )}
                  {m.media_type === "video" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-navy-900/20 text-lg text-white">▶</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {nextOptions.length > 0 && (
          <div className="rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
              Demo: act as an authority
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={actorRole}
                onChange={(e) => setActorRole(e.target.value)}
                className="rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs text-navy-700"
              >
                <option value="officer">Officer</option>
                <option value="citizen">Citizen</option>
                <option value="system">System (auto-escalation)</option>
              </select>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
                className="min-w-[140px] flex-1 rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs text-navy-700"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {nextOptions.map((status) => (
                <button
                  key={status}
                  disabled={updating}
                  onClick={() => advance(status)}
                  className="rounded-lg bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-navy-900 transition-colors hover:bg-saffron-400 disabled:opacity-50"
                >
                  Move to: {status}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-400">Public Timeline</h2>
          <Timeline events={problem.events} />
        </div>
      </div>

      <AnimatePresence>
        {showCamera && <CameraCapture onCapture={onCameraCapture} onClose={() => setShowCamera(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-30 flex items-center justify-center bg-navy-900/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-3xl overflow-hidden rounded-xl bg-navy-900"
            >
              {lightbox.media_type === "video" ? (
                <video src={mediaUrl(lightbox.url)} controls autoPlay className="max-h-[85vh] w-full" />
              ) : (
                <img src={mediaUrl(lightbox.url)} className="max-h-[85vh] w-full object-contain" alt="" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
