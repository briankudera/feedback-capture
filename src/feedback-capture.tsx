"use client";

import { finder } from "@medv/finder";
import { Check, MessageSquare, MousePointer2, Send, X } from "lucide-react";
import { domToPng } from "modern-screenshot";
import React, { useEffect, useMemo, useState } from "react";
import { CHANGE_KINDS, SCREENSHOT_MAX_BYTES, type ChangeKind } from "./constants.js";
import styles from "./feedback-capture.module.css";
import type { CapabilityProbeResponse } from "./auth-types.js";

const SAVED_TOAST_MS = 3500;

export type FeedbackCaptureProps = {
  /** Path the widget POSTs the validated payload to (REQ-051). */
  submissionEndpoint: string;
  /** Path the widget fetches on mount to self-gate (REQ-051). */
  capabilityProbeEndpoint: string;
  /** Host-controlled kill switch. */
  enabled?: boolean;
};

type SelectedElement = {
  selector: string;
  pageUrl: string;
  elementText: string | null;
  sourceFileHint: string | null;
  componentHint: string | null;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio?: number;
  };
  screenshotDataUrl: string | null;
};

function isFormControl(element: Element): boolean {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function closestHint(element: Element, attr: string): string | null {
  return element.closest(`[${attr}]`)?.getAttribute(attr) ?? null;
}

function snapshotText(element: Element): string | null {
  if (isFormControl(element)) return null;
  const text =
    "innerText" in element
      ? String((element as HTMLElement).innerText ?? "")
      : (element.textContent ?? "");
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, 4000) : null;
}

function describeElement(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const component = closestHint(element, "data-component");
  return component ? `${tag} · ${component}` : tag;
}

async function captureScreenshot(element: Element): Promise<string | null> {
  try {
    const dataUrl = await domToPng(element, {
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 1, 2),
    });
    return dataUrl.length <= SCREENSHOT_MAX_BYTES ? dataUrl : null;
  } catch {
    return null;
  }
}

export function FeedbackCapture({
  submissionEndpoint,
  capabilityProbeEndpoint,
  enabled = true,
}: FeedbackCaptureProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [hovered, setHovered] = useState<Element | null>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [requestText, setRequestText] = useState("");
  const [changeKindGuess, setChangeKindGuess] = useState<ChangeKind>("copy");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  // Whether the capability-probe fetch has resolved (authorized or not) yet.
  // Nothing renders until this flips true (REQ-043).
  const [probeResolved, setProbeResolved] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const visible = enabled && probeResolved && allowed;
  const canSubmit = useMemo(
    () => Boolean(selected && requestText.trim() && !pending),
    [pending, requestText, selected],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(capabilityProbeEndpoint, { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CapabilityProbeResponse | null) => {
        if (cancelled) return;
        setAllowed(Boolean(data?.isAdmin));
        setProbeResolved(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAllowed(false);
        setProbeResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [capabilityProbeEndpoint]);

  useEffect(() => {
    if (!visible || !selecting || selected || pending) return;

    const ignore = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("[data-feedback-capture-root]"));

    const onPointerOver = (event: PointerEvent) => {
      if (ignore(event.target)) return;
      setHovered(event.target instanceof Element ? event.target : null);
    };

    const onClick = async (event: MouseEvent) => {
      if (ignore(event.target) || !(event.target instanceof Element)) return;
      event.preventDefault();
      event.stopPropagation();
      const target = event.target;
      setSelecting(false);
      setHovered(null);
      setError("");

      const selector = finder(target, { root: document.body, timeoutMs: 500 });
      const screenshotDataUrl = await captureScreenshot(target);
      setSelected({
        selector,
        pageUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        elementText: snapshotText(target),
        sourceFileHint: closestHint(target, "data-source-file"),
        componentHint: closestHint(target, "data-component"),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1,
        },
        screenshotDataUrl,
      });
      setOpen(true);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelecting(false);
        setHovered(null);
      }
    };

    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [visible, pending, selecting, selected]);

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), SAVED_TOAST_MS);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  if (!visible) return null;

  const clear = () => {
    setOpen(false);
    setSelecting(false);
    setHovered(null);
    setSelected(null);
    setRequestText("");
    setChangeKindGuess("copy");
    setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !requestText.trim()) return;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(submissionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageUrl: selected.pageUrl,
          elementSelector: selected.selector,
          sourceFileHint: selected.sourceFileHint,
          elementText: selected.elementText,
          componentHint: selected.componentHint,
          viewport: selected.viewport,
          screenshotDataUrl: selected.screenshotDataUrl,
          requestText,
          changeKindGuess,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      setSaved(true);
      setSelected(null);
      setRequestText("");
      setChangeKindGuess("copy");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setPending(false);
    }
  };

  const hoverRect = hovered && selecting ? hovered.getBoundingClientRect() : null;
  const hoverLabel = hovered && hoverRect ? describeElement(hovered) : null;

  return (
    <div className={styles.root} data-feedback-capture-root>
      {hoverRect && hoverLabel && (
        <div
          className={styles.highlight}
          style={{
            top: hoverRect.top,
            left: hoverRect.left,
            width: hoverRect.width,
            height: hoverRect.height,
          }}
        >
          <span className={styles.highlightLabel}>
            {hoverLabel} · {Math.round(hoverRect.width)}×{Math.round(hoverRect.height)}
          </span>
        </div>
      )}

      {selecting && (
        <div className={styles.selectingHint} role="status">
          <MousePointer2 size={15} aria-hidden="true" />
          Hover to preview · click to attach feedback · Esc to cancel
        </div>
      )}

      {saved && !open && (
        <div className={styles.saved} role="status">
          <Check size={16} aria-hidden="true" />
          Saved
        </div>
      )}

      {!open && (
        <button
          className={styles.fab}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open feedback capture"
        >
          <MessageSquare size={18} aria-hidden="true" />
          <span>Feedback</span>
        </button>
      )}

      {open && (
        <form className={styles.panel} onSubmit={submit} aria-label="Feedback capture form">
          <div className={styles.header}>
            <h2>Feedback</h2>
            <button
              type="button"
              className={styles.iconButton}
              onClick={clear}
              aria-label="Close feedback capture"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {!selected ? (
            <button
              type="button"
              className={styles.selectButton}
              onClick={() => {
                setSelecting(true);
                setOpen(false);
                setSaved(false);
              }}
            >
              <MousePointer2 size={17} aria-hidden="true" />
              Select page element
            </button>
          ) : (
            <div className={styles.selection}>
              <div>
                <strong>Page</strong>
                <span>{selected.pageUrl}</span>
              </div>
              <div>
                <strong>Selector</strong>
                <span>{selected.selector}</span>
              </div>
              <div>
                <strong>Text</strong>
                <span>{selected.elementText || "No text captured"}</span>
              </div>
            </div>
          )}

          <label className={styles.field}>
            <span>Change type</span>
            <select
              value={changeKindGuess}
              onChange={(event) => setChangeKindGuess(event.target.value as ChangeKind)}
            >
              {CHANGE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Request</span>
            <textarea
              value={requestText}
              onChange={(event) => setRequestText(event.target.value)}
              rows={4}
              maxLength={4000}
              required
            />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={clear}
              disabled={pending}
            >
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} disabled={!canSubmit}>
              <Send size={16} aria-hidden="true" />
              {pending ? "Saving" : "Submit"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
