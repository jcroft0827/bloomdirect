type StatusBadgeVariant =
  | "violet"
  | "emerald"
  | "blue"
  | "amber"
  | "red"
  | "slate";

type StatusBadgeProps = {
  label: string;
  variant: StatusBadgeVariant;
};

const statusBadgeClasses: Record<StatusBadgeVariant, string> = {
  violet: "bg-violet-400/10 text-violet-300",
  emerald: "bg-emerald-400/10 text-emerald-300",
  blue: "bg-blue-400/10 text-blue-300",
  amber: "bg-amber-400/10 text-amber-300",
  red: "bg-red-400/10 text-red-300",
  slate: "bg-slate-400/10 text-slate-300",
};

export default function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClasses[variant]}`}
    >
      {label}
    </span>
  );
}
