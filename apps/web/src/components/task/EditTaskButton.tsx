"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { TaskDetail } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TaskForm } from "./TaskForm";

export function EditTaskButton({ task }: { task: TaskDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit task">
        <TaskForm
          task={task}
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
