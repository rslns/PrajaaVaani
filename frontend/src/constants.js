export const CATEGORIES = [
  "Roads",
  "Drainage",
  "Water",
  "Garbage",
  "Streetlight",
  "Government School",
  "Government Hospital",
  "Electricity",
  "Other",
];

// Keep these in sync with backend/app/models.py ProblemStatus
export const STATUS_STYLES = {
  "Reported": { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-400" },
  "Under Review": { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  "Accepted": { bg: "bg-sky-100", text: "text-sky-800", dot: "bg-sky-500" },
  "Assigned": { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500" },
  "In Progress": { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-500" },
  "Resolved (Pending Verification)": { bg: "bg-lime-100", text: "text-lime-800", dot: "bg-lime-500" },
  "Verified / Closed": { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-600" },
  "Rejected": { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
  "Reopened": { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
};

// Which statuses an officer can move a problem to next, from its current status.
// Mirrors backend ALLOWED_TRANSITIONS so the UI only ever offers legal moves.
export const NEXT_STATUS_OPTIONS = {
  "Reported": ["Under Review", "Rejected"],
  "Under Review": ["Accepted", "Rejected"],
  "Accepted": ["Assigned"],
  "Assigned": ["In Progress"],
  "In Progress": ["Resolved (Pending Verification)"],
  "Resolved (Pending Verification)": ["Verified / Closed", "Reopened"],
  "Reopened": ["Assigned", "In Progress"],
};
