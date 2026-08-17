import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AssigneePicker } from "@/components/task/AssigneePicker";

const RAHUL = { id: "user-1", firstName: "Rahul", lastName: "Iyer", email: "rahul@arutechconsultancy.com", avatarUrl: null };

describe("AssigneePicker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("searches /api/users as the user types and lets them pick a result", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { items: [RAHUL] } }), { status: 200 }),
    );
    const onChange = vi.fn();

    render(<AssigneePicker selected={[]} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/search employees/i), { target: { value: "Rahul" } });

    const option = await screen.findByText("Rahul Iyer", {}, { timeout: 2000 });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: "user-1", firstName: "Rahul" })]);
  });

  it("renders selected assignees as removable chips and calls onChange with them removed", () => {
    const onChange = vi.fn();
    render(<AssigneePicker selected={[RAHUL]} onChange={onChange} />);

    expect(screen.getByText("Rahul Iyer")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/remove rahul iyer/i));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("excludes users already assigned elsewhere from the results", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { items: [RAHUL] } }), { status: 200 }),
    );

    render(<AssigneePicker selected={[]} onChange={vi.fn()} excludeUserIds={["user-1"]} />);
    fireEvent.change(screen.getByPlaceholderText(/search employees/i), { target: { value: "Rahul" } });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText("Rahul Iyer")).not.toBeInTheDocument();
  });
});
