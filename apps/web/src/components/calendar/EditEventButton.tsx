"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { EventDetail } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EventForm } from "./EventForm";

export function EditEventButton({ event }: { event: EventDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit event">
        <EventForm
          event={event}
          onCancel={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
