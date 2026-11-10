"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Плейърът се зарежда само в браузъра и отделно от основния код на страницата.
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false },
);

/** Анимацията в началото на страницата (public/home.lottie, 500×500). */
export function HeroAnimation() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="hero-lottie" role="img" aria-label="Анимация: майка и дете разговарят — речта започва у дома">
      <DotLottieReact
        key={reduce ? "still" : "play"}
        src="/home.lottie"
        loop={!reduce}
        autoplay={!reduce}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
