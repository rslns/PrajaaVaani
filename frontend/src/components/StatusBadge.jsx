import { STATUS_STYLES } from "../constants";

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES["Reported"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
