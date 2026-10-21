"use client";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface Props { children: ReactNode; onClose: () => void; returnFocusRef: RefObject<HTMLDivElement | null>; }
export default function FeedbackDialog({ children, onClose, returnFocusRef }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const overlay = overlayRef.current, panel = panelRef.current;
    if (!overlay || !panel) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const returnFocusTarget = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow, previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`;
    document.body.style.overflow = "hidden";
    const background = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay)
      .map((element) => ({ element, inert: element.inert }));
    for (const { element } of background) element.inert = true;
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary, a[href], [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
    const focusFirst = () => (focusable()[0] ?? panel).focus({ preventScroll: true });
    focusFirst();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      else if (event.key === "Tab") {
        const items = focusable(), first = items[0], last = items[items.length - 1];
        if (!first) { event.preventDefault(); panel.focus({ preventScroll: true }); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    const containFocus = (event: FocusEvent) => { if (event.target instanceof Node && !panel.contains(event.target)) focusFirst(); };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", containFocus);
      for (const { element, inert } of background) element.inert = inert;
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      const target = previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : returnFocusTarget;
      target?.focus({ preventScroll: true });
    };
  }, [onClose, returnFocusRef]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 overscroll-contain" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title" aria-describedby="feedback-dialog-description" tabIndex={-1} className="relative w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl focus:outline-none">
        <button type="button" aria-label="关闭评价" onClick={onClose} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        {children}
      </div>
    </div>, document.body
  );
}
