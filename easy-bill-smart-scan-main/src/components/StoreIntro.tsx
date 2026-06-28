import { useEffect, useState } from "react";
import { ShoppingBasket, BarChart3, Wallet, ArrowDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const SLIDES = [
  {
    icon: ShoppingBasket,
    kicker: "Welcome",
    title: "FreshMart POS",
    body: "A modern point-of-sale built for grocery shops. Scan codes, weigh in quarters, and bill in seconds.",
    accent: "from-primary via-accent to-brand-cyan",
  },
  {
    icon: BarChart3,
    kicker: "Smart Reports",
    title: "Profit at a glance",
    body: "Day-wise and month-wise sales, stock-in vs sold balance, and a bar chart that tells your story.",
    accent: "from-accent via-brand-cyan to-brand-amber",
  },
  {
    icon: Wallet,
    kicker: "All-in-one",
    title: "Stock · Expenses · Bills",
    body: "Track every rupee in and out. Stocked 8 bottles, sold 1 — balance shows 7. Simple.",
    accent: "from-brand-cyan via-brand-amber to-primary",
  },
];

export function StoreIntro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<"up" | "down">("up");

  const next = () => {
    if (i >= SLIDES.length - 1) { onDone(); return; }
    setDir("up"); setI((v) => v + 1);
  };
  const prev = () => {
    if (i === 0) return;
    setDir("down"); setI((v) => v - 1);
  };

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 30) return;
      if (e.deltaY > 0) next(); else prev();
    };
    let startY = 0;
    const onTS = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTE = (e: TouchEvent) => {
      const dy = startY - e.changedTouches[0].clientY;
      if (Math.abs(dy) < 40) return;
      if (dy > 0) next(); else prev();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " " || e.key === "Enter") next();
      if (e.key === "ArrowUp") prev();
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTS, { passive: true });
    window.addEventListener("touchend", onTE, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchend", onTE);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const S = SLIDES[i];
  const Icon = S.icon;

  return (
    <div className="perspective-1000 relative h-screen w-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/20">
      {/* floating blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 animate-blob rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 animate-blob rounded-full bg-accent/40 blur-3xl [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/3 h-80 w-80 animate-blob rounded-full bg-brand-cyan/30 blur-3xl [animation-delay:4s]" />
        <div className="absolute bottom-10 left-10 h-72 w-72 animate-blob rounded-full bg-brand-amber/30 blur-3xl [animation-delay:6s]" />
      </div>

      {/* slide */}
      <div
        key={i}
        className={`preserve-3d relative z-10 flex h-full items-center justify-center p-6 ${
          dir === "up" ? "animate-swipe-up" : "animate-swipe-down"
        }`}
      >
        <div className="tilt-3d w-full max-w-xl rounded-3xl border border-white/30 bg-white/10 p-10 shadow-glow backdrop-blur-2xl dark:bg-white/5">
          <div className={`mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${S.accent} animate-float shadow-glow`}>
            <Icon className="h-10 w-10 text-white drop-shadow" />
          </div>
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> {S.kicker}
          </p>
          <h2 className="text-gradient-tri text-4xl font-extrabold leading-tight md:text-5xl">
            {S.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-foreground/80">{S.body}</p>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex gap-2">
              {SLIDES.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    idx === i ? "w-8 gradient-tri" : "w-2 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <Button onClick={next} className="btn-3d gradient-tri border-0 text-white">
              {i === SLIDES.length - 1 ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </div>

      {/* swipe hint */}
      <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center gap-1 text-muted-foreground">
        <ArrowDown className="h-5 w-5 animate-bounce" />
        <span className="text-xs uppercase tracking-widest">Swipe / scroll up</span>
      </div>

      <button
        onClick={onDone}
        className="absolute right-4 top-4 z-10 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition-all hover:text-foreground"
      >
        Skip
      </button>
    </div>
  );
}
