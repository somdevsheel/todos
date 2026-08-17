import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const toastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

describe("LoginForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    toastError.mockClear();
    vi.restoreAllMocks();
  });

  it("shows validation errors and does not submit when fields are empty", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/enter your company email/i)).toBeInTheDocument();
    expect(await screen.findByText(/enter your password/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("submits to /api/auth/login and redirects to the dashboard on success", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { user: { id: "1" } } }), { status: 200 }),
    );

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: "rahul@arutechconsultancy.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "correct-password-1" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces a toast error and does not redirect on invalid credentials", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } }),
        { status: 401 },
      ),
    );

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: "rahul@arutechconsultancy.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Invalid email or password."));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to a custom `next` path when provided", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }));

    render(<LoginForm redirectTo="/tasks" />);
    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: "rahul@arutechconsultancy.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "correct-password-1" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/tasks"));
  });
});
