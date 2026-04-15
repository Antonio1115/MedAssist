import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const FSM_USER_UID = "fsm-user-1";
var firebaseMocks;

jest.mock("./firebase/index.jsx", () => {
  const state = { user: null };
  const auth = { currentUser: null };

  const signInWithEmailAndPassword = jest.fn(async () => {
    const user = {
      uid: FSM_USER_UID,
      email: "fsm@example.com",
      displayName: null,
      getIdToken: jest.fn().mockResolvedValue("mock-firebase-token"),
    };

    state.user = user;
    auth.currentUser = user;
    return { user };
  });

  const createUserWithEmailAndPassword = jest.fn();

  const onAuthStateChanged = jest.fn((_, callback) => {
    callback(state.user);
    return jest.fn();
  });

  const signOut = jest.fn();

  firebaseMocks = {
    state,
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
  };

  return {
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
  };
});

jest.mock("./components/Layout.jsx", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-shell">{children}</div>,
}));

import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

describe("FSM Testing - Main User Interaction Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firebaseMocks.state.user = null;
    firebaseMocks.auth.currentUser = null;
    window.localStorage.clear();
    global.fetch = jest.fn();
    global.alert = jest.fn();
  });

  it("State transition: Logged-out -> dashboard blocked and redirected to /login", async () => {
    // FSM State: Logged-out
    // Transition under test: direct /dashboard access is blocked and user is redirected to Login.
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Login" })
    ).toBeInTheDocument();
  });

  it("FSM path: Authenticated -> Instruction Submission -> AI Processing -> Summary Display", async () => {
    const user = userEvent.setup();

    // FSM State: Authenticated (with 2FA)
    // Transition under test: login + valid 2FA code (123456) leads to Dashboard.
    window.localStorage.setItem(`2fa_${FSM_USER_UID}`, "enabled");

    let resolveFetch;
    const pendingFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    global.fetch.mockImplementation(() => pendingFetch);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Email"), "fsm@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Two-Factor Verification")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("123456"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify Code" }));

    expect(await screen.findByText("Medical Assistance")).toBeInTheDocument();

    // FSM State: Instruction Submission
    // Transition under test: user enters instructions and presses Send.
    const textArea = screen.getByPlaceholderText(/Take 1 tablet of Lisinopril/i);
    await user.type(textArea, "Metformin 500mg twice daily after meals.");

    const sendButton = screen.getByRole("button", { name: "Send" });
    await user.click(sendButton);

    // FSM State: AI Processing
    // Transition under test: loading indicator shown and send button disabled while fetch is in-flight.
    expect(screen.getByRole("button", { name: "Thinking..." })).toBeDisabled();

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          summary: "Summary: Take Metformin with breakfast and dinner.",
        }),
      });
      await Promise.resolve();
    });

    // FSM State: Summary Display
    // Transition under test: API summary appears in assistant bubble and processing state ends.
    expect(
      await screen.findByText("Summary: Take Metformin with breakfast and dinner.")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Thinking..." })).not.toBeInTheDocument();
    });
  });
});
