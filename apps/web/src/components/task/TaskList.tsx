import { CheckSquare } from "lucide-react";
import type { TaskSummary } from "@arutech/shared-types";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskCard } from "./TaskCard";

export function TaskList({ tasks }: { tasks: TaskSummary[] }) {
  if (tasks.length === 0) {
    return <EmptyState icon={CheckSquare} title="No tasks here" description="Nothing matches these filters yet." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
