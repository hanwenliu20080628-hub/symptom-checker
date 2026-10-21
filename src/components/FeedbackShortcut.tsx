"use client";
import { useEffect, useState, type RefObject } from "react";
export default function FeedbackShortcut({ targetRef }: { targetRef: RefObject<HTMLDivElement | null> }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    }, { rootMargin: "0px 0px -24px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);
  if (!visible) return null;
  return (
    <button type="button" aria-label="去评价，滚动到表达帮助评价" aria-controls="feedback-section" onClick={() => {
      const target = targetRef.current;
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }} className="fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-full text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
      <span className="rounded-full bg-white/95 px-3 py-1 text-sm font-medium shadow-sm">去评价</span>
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m-7-7 7 7 7-7" /></svg>
      </span>
    </button>
  );
}
