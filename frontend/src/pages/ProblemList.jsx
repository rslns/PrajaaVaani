import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

export default function ProblemList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get("/problems", { params: statusFilter ? { status: statusFilter } : {} })
      .then(({ data }) => setProblems(data))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const stats = useMemo(() => {
    const total = problems.length;
    const resolved = problems.filter((p) => p.current_status === "Verified / Closed").length;
    const inProgress = problems.filter((p) =>
      ["Assigned", "In Progress", "Accepted"].includes(p.current_status)
    ).length;
    return { total, resolved, inProgress };
  }, [problems]);

  const upvote = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    const { data } = await api.post(`/problems/${id}/upvote`);
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, upvote_count: data.upvote_count, priority_score: data.priority_score } : p))
    );
  };

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-navy-500 to-navy-700 px-6 py-10 sm:px-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-saffron-400">
              Public dashboard
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
              Reported Problems
            </h1>
            <p className="mt-1 max-w-md text-sm text-navy-200">
              Every report here moves through a visible, time-bound chain of authorities —
              nothing gets closed without proof, and nothing sits ignored without notice.
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Total", value: stats.total },
              { label: "In progress", value: stats.inProgress },
              { label: "Resolved", value: stats.resolved },
            ].map((s) => (
              <div
                key={s.label}
                className="min-w-[84px] rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur"
              >
                <p className="font-display text-xl font-semibold text-saffron-400">{s.value}</p>
                <p className="text-[11px] uppercase tracking-wide text-navy-200">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-navy-700">
          {statusFilter || "All"} problems
        </h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-sm text-navy-700 shadow-sm focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-100"
        >
          <option value="">All statuses</option>
          <option value="Reported">Reported</option>
          <option value="Under Review">Under Review</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved (Pending Verification)">Pending Verification</option>
          <option value="Verified / Closed">Verified / Closed</option>
        </select>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-navy-50" />
          ))}
        </div>
      )}

      {!loading && problems.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-navy-100 bg-white/60 p-12 text-center">
          <p className="text-sm text-navy-400">
            No problems reported yet.{" "}
            <Link to="/report" className="font-semibold text-saffron-600 hover:underline">
              Be the first to report one →
            </Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {problems.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
          >
            <Link
              to={`/problem/${p.id}`}
              className="group flex h-full flex-col justify-between rounded-2xl border border-navy-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-200 hover:shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-sm font-semibold leading-snug text-navy-800 group-hover:text-navy-900">
                    {p.title}
                  </h2>
                  <StatusBadge status={p.current_status} />
                </div>
                <p className="mt-1 text-xs font-medium text-saffron-600">
                  {p.category} · {p.area_name}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-navy-500">{p.description}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-navy-50 pt-3">
                <span className="flex items-center gap-2 text-xs text-navy-300">
                  {new Date(p.created_at).toLocaleDateString()}
                  {p.severity_count > 0 && (
                    <span className="flex items-center gap-0.5 font-medium text-navy-500">
                      ★ {p.severity_avg.toFixed(1)}
                    </span>
                  )}
                </span>
                <button
                  onClick={(e) => upvote(p.id, e)}
                  className="flex items-center gap-1 rounded-full border border-navy-100 px-2.5 py-1 text-xs font-semibold text-navy-500 transition-colors hover:border-saffron-400 hover:bg-saffron-50 hover:text-saffron-700"
                >
                  ▲ {p.upvote_count}
                </button>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
