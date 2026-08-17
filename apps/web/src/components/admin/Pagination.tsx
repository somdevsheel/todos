"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PaginationMeta } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";

export function Pagination({ meta }: { meta: PaginationMeta }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (meta.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm text-[var(--color-ink-muted)]">
      <span>
        Page {meta.page} of {meta.totalPages} ({meta.totalItems} total)
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => goToPage(meta.page - 1)}>
          Previous
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => goToPage(meta.page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
