"use client";

import { PlayCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

type VideoWalkthroughProps = {
  youtubeId: string;
  title: string;
};

export default function VideoWalkthrough({
  youtubeId,
  title,
}: VideoWalkthroughProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-xl bg-gray-950 text-left"
      >
        <img
          src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
          alt={`${title} video thumbnail`}
          loading="lazy"
          className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.02]"
        />

        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-purple-700 shadow-lg transition group-hover:scale-105">
            <PlayCircle size={32} />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <PlayCircle size={18} />
            Watch video
          </div>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-gray-950 px-4 py-3 sm:px-5">
              <p className="truncate text-sm font-semibold text-white sm:text-base">
                {title}
              </p>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close video"
              >
                <X size={20} />
              </button>
            </div>

            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}