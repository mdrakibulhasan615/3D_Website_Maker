"use client";

/**
 * Tiny schematic previews of each section template — grey boxes, no images.
 * Cheap to render (a real preview would mean rendering every template in its own iframe).
 */
import type { ReactNode } from "react";

const bar = (w: string, h = 3, extra = "bg-neutral-300") => <div className={`rounded-sm ${extra}`} style={{ width: w, height: h }} />;
const box = (extra = "") => <div className={`rounded-[3px] bg-neutral-200 ${extra}`} />;

const THUMBS: Record<string, ReactNode> = {
  "hero-centered": (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      {bar("24%", 3, "bg-indigo-300")}
      {bar("70%", 5, "bg-neutral-400")}
      {bar("50%")}
      <div className="mt-0.5 flex gap-1">
        {bar("14px", 5, "bg-indigo-500")}
        {bar("14px", 5, "bg-neutral-300")}
      </div>
    </div>
  ),
  "hero-split": (
    <div className="flex h-full items-center gap-2 px-1">
      <div className="flex flex-1 flex-col gap-1">
        {bar("90%", 5, "bg-neutral-400")}
        {bar("70%")}
        {bar("30%", 5, "bg-indigo-500")}
      </div>
      <div className="h-[70%] flex-1 rounded bg-neutral-200" />
    </div>
  ),
  "feature-grid": (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      {bar("45%", 4, "bg-neutral-400")}
      <div className="grid w-[86%] grid-cols-3 gap-1">{Array.from({ length: 6 }, (_, i) => <div key={i}>{box("h-3")}</div>)}</div>
    </div>
  ),
  "bento-grid": (
    <div className="grid h-full grid-cols-4 grid-rows-3 gap-[3px] p-1">
      <div className="col-span-2 row-span-2 rounded-[3px] bg-gradient-to-br from-indigo-400 to-pink-400" />
      <div className="col-span-2 rounded-[3px] bg-neutral-500" />
      {box()}
      {box()}
      <div className="col-span-2 rounded-[3px] bg-amber-100" />
      <div className="col-span-2 rounded-[3px] border border-neutral-200" />
    </div>
  ),
  pricing: (
    <div className="flex h-full items-center justify-center gap-1 px-1">
      <div className="h-[62%] flex-1 rounded-[3px] border border-neutral-200" />
      <div className="h-[78%] flex-1 rounded-[3px] bg-neutral-700" />
      <div className="h-[62%] flex-1 rounded-[3px] border border-neutral-200" />
    </div>
  ),
  testimonials: (
    <div className="flex h-full items-center gap-1 bg-neutral-100 px-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex h-[60%] flex-1 flex-col justify-between rounded-[3px] bg-white p-1">
          {bar("90%", 2)}
          <div className="h-2 w-2 rounded-full bg-indigo-400" />
        </div>
      ))}
    </div>
  ),
  "cta-band": (
    <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-indigo-500 to-violet-600">
      {bar("60%", 4, "bg-white/80")}
      {bar("18px", 5, "bg-white")}
    </div>
  ),
};

export function SectionThumb({ id }: { id: string }) {
  return <div className="h-14 overflow-hidden rounded border border-neutral-200 bg-white">{THUMBS[id] ?? null}</div>;
}
