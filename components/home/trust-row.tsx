import { Download, FlaskConical, ShieldCheck } from "lucide-react";

const REASSURANCES = [
  {
    icon: FlaskConical,
    label: "En bêta : accès libre, aucune carte requise",
  },
  {
    icon: ShieldCheck,
    label: "Vos données ne sont jamais revendues",
  },
  {
    icon: Download,
    label: "Vous pouvez tout exporter en un clic",
  },
];

export function TrustRow() {
  return (
    <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {REASSURANCES.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center gap-2 rounded-full border border-border bg-pill-bg px-4 py-2 text-base font-medium text-heading"
        >
          <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}
