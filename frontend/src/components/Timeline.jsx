import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";

export default function Timeline({ events }) {
  return (
    <ol className="relative border-s-2 border-navy-100 ml-3">
      {events.map((event, i) => (
        <motion.li
          key={event.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="mb-6 ms-6"
        >
          <span
            className={`absolute -start-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${
              event.actor_role === "system" ? "bg-orange-500" : "bg-navy-500"
            }`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={event.to_status} />
            {event.actor_role === "system" && (
              <span className="text-xs font-semibold text-orange-600">AUTO-ESCALATED</span>
            )}
            <span className="text-xs text-navy-300">
              {new Date(event.created_at).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-navy-600">
            {event.note || `Marked by ${event.actor_role}`}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}
