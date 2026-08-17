import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function ComingSoon({ icon, title, phase }: { icon: LucideIcon; title: string; phase: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <EmptyState icon={icon} title={title} description={`${phase} — see ARCHITECTURE.md for the full roadmap.`} />
    </div>
  );
}
