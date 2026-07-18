import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackCapture } from "../feedback-capture.js";

vi.mock("@medv/finder", () => ({
  finder: vi.fn(() => "main h1"),
}));

vi.mock("modern-screenshot", () => ({
  domToPng: vi.fn(() => Promise.resolve("data:image/png;base64,small")),
}));

type JsonResponse = { ok: boolean; status?: number; json: () => Promise<unknown> };

const PROBE = "/api/probe";
const SUBMIT = "/api/submit";

function installFetch(
  options: { probe?: { isAdmin: boolean; role: string | null } | null; feedback?: JsonResponse } = {},
) {
  const probe = options.probe === undefined ? { isAdmin: true, role: "admin" } : options.probe;
  const feedback = options.feedback ?? { ok: true, json: async () => ({ id: "feedback-1", status: "new" }) };
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    if (String(input).includes(PROBE)) {
      if (probe === null) return Promise.reject(new Error("probe failed"));
      return Promise.resolve({ ok: true, json: async () => probe });
    }
    return Promise.resolve(feedback);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function postCallBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const call = fetchMock.mock.calls.find((c) => c[0] === SUBMIT);
  if (!call) throw new Error(`POST ${SUBMIT} was not called`);
  return JSON.parse((call[1] as RequestInit).body as string);
}

describe("FeedbackCapture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: 1, configurable: true });
    window.history.pushState({}, "", "/get/donate?x=1#hero");
    installFetch();
  });

  function renderWidget(extra?: React.ReactNode) {
    return render(
      <>
        <FeedbackCapture submissionEndpoint={SUBMIT} capabilityProbeEndpoint={PROBE} />
        {extra}
      </>,
    );
  }

  it("renders nothing while the capability-probe fetch is pending", () => {
    let resolveProbe: (value: unknown) => void = () => {};
    global.fetch = vi.fn(() => new Promise((resolve) => (resolveProbe = resolve))) as unknown as typeof fetch;
    render(<FeedbackCapture submissionEndpoint={SUBMIT} capabilityProbeEndpoint={PROBE} />);
    expect(screen.queryByRole("button", { name: /open feedback capture/i })).not.toBeInTheDocument();
    void resolveProbe;
  });

  it("renders nothing when disabled", () => {
    render(
      <FeedbackCapture submissionEndpoint={SUBMIT} capabilityProbeEndpoint={PROBE} enabled={false} />,
    );
    expect(screen.queryByRole("button", { name: /open feedback capture/i })).not.toBeInTheDocument();
  });

  it("stays hidden when the capability-probe fetch resolves unauthorized", async () => {
    installFetch({ probe: { isAdmin: false, role: null } });
    renderWidget();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(PROBE, expect.anything()));
    expect(screen.queryByRole("button", { name: /open feedback capture/i })).not.toBeInTheDocument();
  });

  it("stays hidden when the capability-probe fetch rejects/errors", async () => {
    installFetch({ probe: null });
    renderWidget();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(PROBE, expect.anything()));
    expect(screen.queryByRole("button", { name: /open feedback capture/i })).not.toBeInTheDocument();
  });

  it("renders the capture button when the capability-probe fetch resolves authorized", async () => {
    renderWidget();
    expect(await screen.findByRole("button", { name: /open feedback capture/i })).toBeInTheDocument();
  });

  it("captures a selected element without copying input values", async () => {
    renderWidget(
      <input aria-label="Secret field" defaultValue="private value" data-component="InputThing" />,
    );

    await userEvent.click(await screen.findByRole("button", { name: /open feedback capture/i }));
    await userEvent.click(screen.getByRole("button", { name: /select page element/i }));
    fireEvent.click(screen.getByLabelText("Secret field"));

    expect(await screen.findByText("main h1")).toBeInTheDocument();
    expect(screen.getByText("No text captured")).toBeInTheDocument();
    expect(screen.queryByText("private value")).not.toBeInTheDocument();
  });

  it("submits to the configured submissionEndpoint, not a hardcoded path", async () => {
    const fetchMock = installFetch();
    renderWidget(
      <h1 data-source-file="src/app/get/donate/page.tsx" data-component="DonateHero">
        Give locally
      </h1>,
    );

    await userEvent.click(await screen.findByRole("button", { name: /open feedback capture/i }));
    await userEvent.click(screen.getByRole("button", { name: /select page element/i }));
    fireEvent.click(screen.getByText("Give locally"));

    await userEvent.type(await screen.findByLabelText(/request/i), "Change the headline.");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        SUBMIT,
        expect.objectContaining({ method: "POST", headers: { "Content-Type": "application/json" } }),
      ),
    );
    expect(postCallBody(fetchMock)).toMatchObject({
      pageUrl: "/get/donate?x=1#hero",
      elementSelector: "main h1",
      sourceFileHint: "src/app/get/donate/page.tsx",
      componentHint: "DonateHero",
      elementText: "Give locally",
      requestText: "Change the headline.",
      changeKindGuess: "copy",
      screenshotDataUrl: "data:image/png;base64,small",
      viewport: { width: 1440, height: 900, devicePixelRatio: 1 },
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("fetches the capability probe from the configured capabilityProbeEndpoint, not a hardcoded path", async () => {
    const fetchMock = installFetch();
    renderWidget();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(PROBE, expect.anything()));
  });

  it("falls back to no screenshot when screenshot capture fails", async () => {
    const fetchMock = installFetch();
    const screenshot = await import("modern-screenshot");
    (screenshot.domToPng as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("blocked"));
    renderWidget(<h1>Give locally</h1>);

    await userEvent.click(await screen.findByRole("button", { name: /open feedback capture/i }));
    await userEvent.click(screen.getByRole("button", { name: /select page element/i }));
    fireEvent.click(screen.getByText("Give locally"));
    await userEvent.type(await screen.findByLabelText(/request/i), "Submit without image.");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(SUBMIT, expect.anything()));
    expect(postCallBody(fetchMock).screenshotDataUrl).toBeNull();
  });

  it("does not throw on unmount during a pending capability-probe fetch", async () => {
    let resolveProbe: (value: unknown) => void = () => {};
    global.fetch = vi.fn(() => new Promise((resolve) => (resolveProbe = resolve))) as unknown as typeof fetch;
    const { unmount } = render(
      <FeedbackCapture submissionEndpoint={SUBMIT} capabilityProbeEndpoint={PROBE} />,
    );
    expect(() => unmount()).not.toThrow();
    resolveProbe({ ok: true, json: async () => ({ isAdmin: true, role: "admin" }) });
  });
});
