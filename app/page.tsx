"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { useStore } from "@/store/useStore";
import { VinylDisc } from "@/components/ui";
import { imgUrl } from "@/lib/api";
import {
  MdTrendingUp, MdPeople, MdLanguage, MdAlbum,
  MdDynamicFeed, MdStorefront, MdFavorite, MdStore,
} from "react-icons/md";
import { RiVipCrownFill } from "react-icons/ri";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const marqueeItems = [
  "Dark Side of the Moon", "Abbey Road", "Kind of Blue", "Rumours",
  "Led Zeppelin IV", "Pet Sounds", "Thriller", "Purple Rain",
  "Nevermind", "Horses", "Blue", "A Love Supreme",
];

const GRAD_PAIRS = [
  ["#FF006E", "#7B2FFF"],
  ["#00F5FF", "#7B2FFF"],
  ["#FFE600", "#FF006E"],
  ["#7B2FFF", "#00F5FF"],
  ["#FF006E", "#00F5FF"],
  ["#00F5FF", "#FFE600"],
  ["#FFE600", "#7B2FFF"],
  ["#7B2FFF", "#FF006E"],
];

// ── Demon / anime particle system ─────────────────────────────────────────────
function HeroCanvas({ c1, c2 }: { c1: string; c2: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const colorsRef = useRef({ c1, c2 });

  useEffect(() => { colorsRef.current = { c1, c2 }; }, [c1, c2]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", resize);

    // Particle types: floating embers + large energy rings + scan lines
    type Particle = {
      x: number; y: number; vx: number; vy: number;
      r: number; life: number; maxLife: number; type: "ember" | "ring" | "streak";
      angle: number; speed: number;
    };
    const particles: Particle[] = [];

    const spawn = () => {
      const type = Math.random() < 0.6 ? "ember" : Math.random() < 0.5 ? "ring" : "streak";
      particles.push({
        x: Math.random() * W,
        y: type === "ring" ? Math.random() * H : H + 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: type === "ring" ? 0 : -(0.4 + Math.random() * 1.2),
        r: type === "ring" ? 30 + Math.random() * 80 : type === "streak" ? 1 : 1.5 + Math.random() * 2,
        life: 0,
        maxLife: type === "ring" ? 140 + Math.random() * 80 : 80 + Math.random() * 100,
        type,
        angle: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.01,
      });
    };
    for (let i = 0; i < 60; i++) spawn();

    // Runic slash lines (static decorative)
    const slashes = Array.from({ length: 6 }, (_, i) => ({
      x1: Math.random() * W * 0.5,
      y1: Math.random() * H,
      x2: Math.random() * W * 0.5 + 60,
      y2: Math.random() * H,
      op: 0.03 + Math.random() * 0.07,
    }));

    let frame = 0;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      frame++;
      const { c1: col1, c2: col2 } = colorsRef.current;

      ctx.clearRect(0, 0, W, H);

      // Background energy pulse
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.015);
      const grad = ctx.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, W * 0.7);
      grad.addColorStop(0, col1 + "18");
      grad.addColorStop(0.5, col2 + "08");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Horizontal scan lines (anime CRT vibe)
      for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = `rgba(0,0,0,${0.04 + 0.02 * Math.sin(y * 0.1 + frame * 0.02)})`;
        ctx.fillRect(0, y, W, 1);
      }

      // Decorative slash lines
      slashes.forEach(s => {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.strokeStyle = col1 + Math.floor(s.op * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // Particles
      if (frame % 3 === 0 && particles.length < 120) spawn();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.speed;
        const progress = p.life / p.maxLife;
        const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;

        if (p.type === "ember") {
          // Glowing ember particle
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
          grd.addColorStop(0, col1 + "ff");
          grd.addColorStop(0.4, col2 + "88");
          grd.addColorStop(1, "transparent");
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (p.type === "ring") {
          // Expanding energy ring
          const expandR = p.r * (0.3 + progress * 0.7);
          ctx.beginPath();
          ctx.arc(p.x, p.y, expandR, 0, Math.PI * 2);
          ctx.strokeStyle = (progress < 0.5 ? col1 : col2) + Math.floor(alpha * 0.35 * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 1 - progress * 0.8;
          ctx.stroke();
        } else {
          // Speed streak (anime speed lines)
          const len = 20 + Math.random() * 40;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * len, p.y + p.vy * len);
          ctx.strokeStyle = col2 + Math.floor(alpha * 0.4 * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      // Corner sigil / rune decoration (top-right)
      ctx.save();
      ctx.translate(W - 60, 60);
      ctx.rotate(frame * 0.003);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x2 = Math.cos(a) * 28;
        const y2 = Math.sin(a) * 28;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = col1 + "33";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.strokeStyle = col1 + "22";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();

      // Bottom-left rune ring (counter-rotating)
      ctx.save();
      ctx.translate(50, H - 50);
      ctx.rotate(-frame * 0.005);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x2 = Math.cos(a) * 20;
        const y2 = Math.sin(a) * 20;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = col2 + "33";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 2 }}
    />
  );
}

// ── Glitch text effect component ──────────────────────────────────────────────
function GlitchText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`glitch-wrap ${className ?? ""}`} data-text={text} style={style}>
      {text}
    </span>
  );
}

export default function HomePage() {
  const { isLoggedIn, trendingAlbums, blogs, loadHome, homeLoading } = useStore();
  const [mounted, setMounted] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const swiperRef = useRef<any>(null);

  // GSAP refs
  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    loadHome();
  }, []);

  // Hero entrance animation
  useEffect(() => {
    if (!mounted || !heroRef.current) return;
    const tl = gsap.timeline({ delay: 0.1 });
    tl.fromTo(".hero-line", { opacity: 0, y: 60, skewX: -8 }, { opacity: 1, y: 0, skewX: 0, duration: 0.7, stagger: 0.1, ease: "expo.out" })
      .fromTo(".hero-sub", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.3")
      .fromTo(".hero-cta", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.5)" }, "-=0.3")
      .fromTo(".hero-badge", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");
  }, [mounted]);

  // Scroll animations
  useEffect(() => {
    if (!mounted) return;
    if (statsRef.current) {
      gsap.fromTo(statsRef.current.querySelectorAll(".stat-card"),
        { opacity: 0, y: 40, scale: 0.93 },
        { opacity: 1, y: 0, scale: 1, duration: 0.65, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: statsRef.current, start: "top 82%" } }
      );
    }
    if (featuresRef.current) {
      gsap.fromTo(featuresRef.current.querySelectorAll(".feat-card"),
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power2.out", scrollTrigger: { trigger: featuresRef.current, start: "top 80%" } }
      );
    }
    return () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, [mounted]);

  // Slide change transition
  const handleSlideChange = (swiper: any) => {
    const newIdx = swiper.realIndex;
    setPrevIdx(activeIdx);
    setTransitioning(true);
    setTimeout(() => {
      setActiveIdx(newIdx);
      setTransitioning(false);
    }, 150);
  };

  if (!mounted) return null;

  const slides = homeLoading || trendingAlbums.length === 0
    ? Array.from({ length: 5 }, (_, i) => ({ id: String(i), title: "Loading…", coverUrl: "", albumArtists: [], year: 0, trendingScore: 0, format: "" }))
    : trendingAlbums.slice(0, 8);

  const activeAlbum = slides[activeIdx] || slides[0];
  const activeArtist = activeAlbum?.albumArtists?.[0]?.artist?.name || "Unknown";
  const [c1, c2] = GRAD_PAIRS[activeIdx % GRAD_PAIRS.length];

  return (
    <AppLayout>
      <div className="space-y-10 w-full">

        {/* ══════════════════════════════════════════════════════════════════
            HERO — Cinematic Anime / Demon Autoplay Banner
        ══════════════════════════════════════════════════════════════════ */}
        <div
          ref={heroRef}
          className="relative w-full overflow-hidden"
          style={{
            minHeight: "clamp(500px, 62vw, 760px)",
            borderRadius: "1.25rem",
            border: "1px solid var(--bdr)",
            background: "#050508",
            ["--hero-c1" as any]: c1,
            ["--hero-c2" as any]: c2,
          }}
        >
          {/* ── Canvas particle system ── */}
          <HeroCanvas c1={c1} c2={c2} />

          {/* ── Deep bg gradient that transitions with slide ── */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 80% 60% at 70% 40%, ${c1}12 0%, transparent 65%),
                           radial-gradient(ellipse 60% 80% at 20% 80%, ${c2}0e 0%, transparent 60%),
                           linear-gradient(160deg, #0a0812 0%, #050508 50%, #08050f 100%)`,
              transition: "background 0.9s ease",
              zIndex: 1,
            }}
          />

          {/* ── Diagonal slash accent lines (static anime-style) ── */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 3, opacity: 0.07 }}
            preserveAspectRatio="none"
          >
            <line x1="55%" y1="0%" x2="45%" y2="100%" stroke={c1} strokeWidth="1" />
            <line x1="58%" y1="0%" x2="48%" y2="100%" stroke={c1} strokeWidth="0.5" />
            <line x1="62%" y1="0%" x2="52%" y2="100%" stroke={c2} strokeWidth="0.5" />
            <line x1="0" y1="30%" x2="100%" y2="25%" stroke={c2} strokeWidth="0.4" />
          </svg>

          {/* ── Noise texture overlay ── */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 3,
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
              opacity: 0.4,
            }}
          />

          {/* ── SWIPER — full bleed right side ── */}
          <div
            className="absolute inset-0"
            style={{ zIndex: 4 }}
          >
            <Swiper
              ref={swiperRef}
              modules={[Autoplay, Navigation, Pagination]}
              autoplay={{ delay: 3800, disableOnInteraction: false, pauseOnMouseEnter: true }}
              loop
              speed={700}
              pagination={{ clickable: true, dynamicBullets: true, el: ".vhq-bullets" }}
              navigation={false}
              onSlideChange={handleSlideChange}
              className="w-full h-full"
              style={{ height: "clamp(500px, 62vw, 760px)" }}
            >
              {slides.map((album, i) => {
                const cover = imgUrl(album.coverUrl);
                const [a1, a2] = GRAD_PAIRS[i % GRAD_PAIRS.length];
                return (
                  <SwiperSlide key={album.id}>
                    <div className="relative w-full h-full">
                      {/* Full-bleed blurred cover as atmosphere bg */}
                      {cover ? (
                        <img
                          src={cover}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{
                            filter: "blur(40px) saturate(1.6) brightness(0.18)",
                            transform: "scale(1.15)",
                          }}
                        />
                      ) : null}

                      {/* Right side cover display area */}
                      <div
                        className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
                        style={{ width: "52%", paddingRight: "clamp(1.5rem,4vw,4rem)" }}
                      >
                        <div className="relative flex items-center justify-center" style={{ width: "100%", height: "100%" }}>

                          {/* Outer glow ring (anime aura) */}
                          <div
                            className="absolute rounded-full"
                            style={{
                              width: "clamp(260px, 34vw, 460px)",
                              height: "clamp(260px, 34vw, 460px)",
                              background: `radial-gradient(circle, ${a1}22 0%, ${a2}0a 50%, transparent 70%)`,
                              animation: "auraPulse 3s ease-in-out infinite",
                            }}
                          />

                          {/* Spinning outer ring */}
                          <div
                            className="absolute rounded-full"
                            style={{
                              width: "clamp(240px, 32vw, 430px)",
                              height: "clamp(240px, 32vw, 430px)",
                              border: `1px solid ${a1}28`,
                              animation: "spinCW 18s linear infinite",
                            }}
                          />
                          <div
                            className="absolute rounded-full"
                            style={{
                              width: "clamp(210px, 28vw, 380px)",
                              height: "clamp(210px, 28vw, 380px)",
                              border: `1px dashed ${a2}20`,
                              animation: "spinCCW 12s linear infinite",
                            }}
                          />

                          {/* Vinyl disc behind cover */}
                          <div
                            className="absolute"
                            style={{
                              right: "clamp(-20px, -2vw, -30px)",
                              top: "50%",
                              transform: "translateY(-50%)",
                              opacity: 0.25,
                              zIndex: 0,
                              animation: "spinCW 8s linear infinite",
                            }}
                          >
                            <VinylDisc color={a1} size={clamp(120, 16, 200)} />
                          </div>

                          {/* Main cover card */}
                          {cover ? (
                            <div
                              className="relative z-10"
                              style={{
                                width: "clamp(180px, 24vw, 320px)",
                                aspectRatio: "1",
                                borderRadius: "1rem",
                                overflow: "hidden",
                                boxShadow: `0 0 0 1px ${a1}30, 0 0 60px ${a1}40, 0 40px 80px rgba(0,0,0,0.8)`,
                                animation: "coverFloat 5s ease-in-out infinite",
                              }}
                            >
                              <img src={cover} alt={album.title} className="w-full h-full object-cover" />
                              {/* Sheen */}
                              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, ${a2}18 100%)` }} />
                              {/* Bottom bar */}
                              <div
                                className="absolute bottom-0 left-0 right-0 px-3 py-2"
                                style={{
                                  background: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)`,
                                  backdropFilter: "blur(4px)",
                                }}
                              >
                                <div className="text-xs font-bold text-white truncate">{album.title}</div>
                                <div className="text-xs" style={{ color: a1 }}>{album.albumArtists?.[0]?.artist?.name || ""}</div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="relative z-10 rounded-2xl animate-pulse"
                              style={{ width: "clamp(180px,24vw,320px)", aspectRatio: "1", background: "rgba(255,255,255,0.05)" }}
                            />
                          )}

                          {/* Floating score chip */}
                          {album.trendingScore > 0 && (
                            <div
                              className="absolute z-20"
                              style={{
                                top: "clamp(15%, 15%, 20%)",
                                right: "clamp(5%, 8%, 12%)",
                                background: `${a1}ee`,
                                borderRadius: "2rem",
                                padding: "4px 10px",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                color: "#fff",
                                letterSpacing: "0.05em",
                                boxShadow: `0 0 16px ${a1}88`,
                                animation: "floatChip 3s ease-in-out infinite",
                              }}
                            >
                              ↑ {album.trendingScore}
                            </div>
                          )}

                          {/* Side accent bar */}
                          <div
                            className="absolute left-2 top-1/2"
                            style={{
                              transform: "translateY(-50%)",
                              width: 2,
                              height: "clamp(80px, 14vw, 180px)",
                              background: `linear-gradient(to bottom, transparent, ${a1}, transparent)`,
                              borderRadius: 2,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>

          {/* ── LEFT: Hero copy — sits above swiper ── */}
          <div
            className="absolute left-0 top-0 bottom-0 z-20 flex flex-col justify-center"
            style={{
              width: "min(520px, 52%)",
              padding: "clamp(2rem,5vw,4rem)",
              pointerEvents: "none",
            }}
          >
            {/* Left gradient mask so text stays readable */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to right, #050508 55%, transparent 100%)",
                borderRadius: "1.25rem 0 0 1.25rem",
              }}
            />

            <div className="relative z-10" style={{ pointerEvents: "auto" }}>

              {/* ── Eyebrow label ── */}
              <div
                className="hero-badge flex items-center gap-2 mb-4"
                style={{ opacity: 0 }}
              >
                <div style={{ width: 24, height: 1, background: c1 }} />
                <span
                  className="font-syne text-xs font-bold tracking-widest uppercase"
                  style={{ color: c1, letterSpacing: "0.22em" }}
                >
                  The Vinyl Headquarters
                </span>
              </div>

              {/* ── Main headline ── */}
              <div className="mb-6">
                <div
                  className="hero-line font-bebas leading-none discover-stroke-line"
                  style={{
                    fontSize: "clamp(3.5rem, 9vw, 7.5rem)",
                    opacity: 0,
                    lineHeight: 1,
                    color: "transparent",
                  }}
                >
                  Discover.
                </div>
                <div
                  className="hero-line font-bebas leading-none gradient-text-line"
                  style={{
                    fontSize: "clamp(3.5rem, 9vw, 7.5rem)",
                    opacity: 0,
                    lineHeight: 1,
                    // gradient applied via className below to avoid stacking context issues
                  }}
                >
                  Collect.
                </div>
                <div
                  className="hero-line font-bebas leading-none"
                  style={{
                    fontSize: "clamp(3.5rem, 9vw, 7.5rem)",
                    opacity: 0,
                    lineHeight: 1,
                    color: "#ffffff",
                  }}
                >
                  Connect.
                </div>
              </div>

              {/* ── Sub copy ── */}
              <p
                className="hero-sub text-sm md:text-base mb-7 max-w-sm leading-relaxed"
                style={{ color: "var(--tx2)", opacity: 0 }}
              >
                The ultimate platform for vinyl record collectors. Browse the
                marketplace, build your digital collection, and connect with
                50,000+ vinyl lovers worldwide.
              </p>

              {/* ── CTAs ── */}
              <div className="flex flex-wrap gap-3 mb-8">
                {isLoggedIn ? (
                  <>
                    <Link href="/feed" style={{ pointerEvents: "auto" }}>
                      <button
                        className="hero-cta btn btn-lg"
                        style={{
                          opacity: 0,
                          background: `linear-gradient(135deg, ${c1}, ${c2})`,
                          border: "none",
                          color: "#fff",
                          fontWeight: 700,
                          boxShadow: `0 0 24px ${c1}66`,
                          transition: "box-shadow 0.2s, transform 0.2s",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${c1}aa`;
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${c1}66`;
                          (e.currentTarget as HTMLElement).style.transform = "";
                        }}
                      >
                        Go to Feed
                      </button>
                    </Link>
                    <Link href="/marketplace" style={{ pointerEvents: "auto" }}>
                      <button
                        className="hero-cta btn btn-lg"
                        style={{
                          opacity: 0,
                          background: "transparent",
                          border: `1px solid ${c2}66`,
                          color: c2,
                          transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = c2;
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${c2}44`;
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${c2}66`;
                          (e.currentTarget as HTMLElement).style.boxShadow = "";
                          (e.currentTarget as HTMLElement).style.transform = "";
                        }}
                      >
                        Marketplace
                      </button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth" style={{ pointerEvents: "auto" }}>
                      <button
                        className="hero-cta btn btn-lg"
                        style={{
                          opacity: 0,
                          background: `linear-gradient(135deg, ${c1}, ${c2})`,
                          border: "none",
                          color: "#fff",
                          fontWeight: 700,
                          boxShadow: `0 0 24px ${c1}66`,
                          transition: "box-shadow 0.2s, transform 0.2s",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${c1}aa`;
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${c1}66`;
                          (e.currentTarget as HTMLElement).style.transform = "";
                        }}
                      >
                        Get Started Free
                      </button>
                    </Link>
                    <Link href="/marketplace" style={{ pointerEvents: "auto" }}>
                      <button
                        className="hero-cta btn btn-lg"
                        style={{
                          opacity: 0,
                          background: "transparent",
                          border: `1px solid ${c2}66`,
                          color: c2,
                          transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = c2;
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${c2}44`;
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${c2}66`;
                          (e.currentTarget as HTMLElement).style.boxShadow = "";
                          (e.currentTarget as HTMLElement).style.transform = "";
                        }}
                      >
                        Browse Records
                      </button>
                    </Link>
                  </>
                )}
              </div>

              {/* ── Active album info badge ── */}
              {!homeLoading && activeAlbum?.title && activeAlbum.title !== "Loading…" && (
                <div
                  ref={badgeRef}
                  className="hero-badge flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{
                    opacity: 0,
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${c1}28`,
                    backdropFilter: "blur(10px)",
                    maxWidth: 300,
                    transition: "border-color 0.6s",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ border: `1px solid ${c1}44` }}
                  >
                    {imgUrl(activeAlbum.coverUrl) ? (
                      <img src={imgUrl(activeAlbum.coverUrl)!} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full" style={{ background: c1 + "33" }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-xs font-syne font-bold tracking-widest uppercase mb-0.5"
                      style={{ color: c1, fontSize: "0.6rem" }}
                    >
                      Now Trending
                    </div>
                    <div className="text-sm font-bold text-white truncate">{activeAlbum.title}</div>
                    <div className="text-xs truncate" style={{ color: "var(--tx3)" }}>
                      {activeArtist}{activeAlbum.year > 0 ? ` · ${activeAlbum.year}` : ""}
                    </div>
                  </div>
                  {/* Animated dot */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 ml-auto"
                    style={{ background: c1, boxShadow: `0 0 8px ${c1}`, animation: "blink 1.5s ease-in-out infinite" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom thumbnail strip + pagination ── */}
          <div
            className="absolute bottom-4 left-0 right-0 z-30 flex items-center justify-between px-6"
          >
            {/* Slide counter */}
            <div className="flex items-center gap-2">
              <span className="font-bebas text-2xl" style={{ color: c1, lineHeight: 1 }}>
                {String(activeIdx + 1).padStart(2, "0")}
              </span>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)" }} />
              <span className="font-bebas text-base" style={{ color: "var(--tx3)", lineHeight: 1 }}>
                {String(slides.length).padStart(2, "0")}
              </span>
            </div>

            {/* Thumbnail strip */}
            {!homeLoading && trendingAlbums.length > 0 && (
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none", maxWidth: "60%" }}>
                {slides.map((album, i) => {
                  const cv = imgUrl(album.coverUrl);
                  const [ta] = GRAD_PAIRS[i % GRAD_PAIRS.length];
                  return (
                    <button
                      key={album.id}
                      onClick={() => swiperRef.current?.swiper?.slideToLoop(i)}
                      className="flex-shrink-0 rounded-lg overflow-hidden"
                      style={{
                        width: 38, height: 38,
                        border: `2px solid ${i === activeIdx ? ta : "transparent"}`,
                        opacity: i === activeIdx ? 1 : 0.35,
                        transform: i === activeIdx ? "scale(1.15)" : "scale(1)",
                        transition: "all 0.3s",
                        background: "var(--surf)",
                        cursor: "pointer",
                      }}
                    >
                      {cv
                        ? <img src={cv} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full" style={{ background: ta + "44" }} />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Progress bar */}
            <div style={{ width: 80, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 1, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${((activeIdx + 1) / slides.length) * 100}%`,
                  background: `linear-gradient(90deg, ${c1}, ${c2})`,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            STATS
        ════════════════════════════════════════════════════════════════════ */}
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {[
            { n: "50K+", l: "Collectors",  c: "#FF006E", icon: <MdPeople size={22} /> },
            { n: "2M+",  l: "Records",     c: "#00F5FF", icon: <MdAlbum size={22} /> },
            { n: "12K+", l: "Listings",    c: "#FFE600", icon: <MdStorefront size={22} /> },
            { n: "120+", l: "Countries",   c: "#7B2FFF", icon: <MdLanguage size={22} /> },
          ].map(({ n, l, c, icon }) => (
            <div key={l} className="card-static stat-card p-5 text-center flex flex-col items-center gap-2" style={{ opacity: 0 }}>
              <div style={{ color: c }}>{icon}</div>
              <div className="stat-n text-4xl" style={{ color: c }}>{n}</div>
              <div className="text-xs font-syne font-bold tracking-widest uppercase" style={{ color: "var(--tx3)" }}>{l}</div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            MARQUEE
        ════════════════════════════════════════════════════════════════════ */}
        <div className="overflow-hidden rounded-xl py-4 w-full" style={{ background: "var(--card)", border: "1px solid var(--bdr)" }}>
          <div className="marquee flex gap-10 whitespace-nowrap" style={{ width: "max-content" }}>
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="font-bebas text-xl tracking-widest flex items-center gap-3" style={{ color: "var(--tx3)" }}>
                <MdAlbum size={16} style={{ color: "rgba(255,0,110,0.4)" }} />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TRENDING ALBUMS GRID
        ════════════════════════════════════════════════════════════════════ */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 lbl mb-1"><MdTrendingUp size={14} /> Hot Right Now</div>
              <div className="font-bebas text-3xl text-white">Trending Records</div>
            </div>
            <Link href="/marketplace"><button className="btn btn-ghost btn-sm">View All</button></Link>
          </div>

          {homeLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="w-full h-28 rounded-xl mb-3" style={{ background: "var(--surf)" }} />
                  <div className="h-3 rounded mb-2" style={{ background: "var(--surf)", width: "80%" }} />
                  <div className="h-3 rounded" style={{ background: "var(--surf)", width: "50%" }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {trendingAlbums.slice(0, 8).map((album, i) => {
                const cover = imgUrl(album.coverUrl);
                const artist = album.albumArtists?.[0]?.artist?.name || "Unknown";
                const [ac] = GRAD_PAIRS[i % GRAD_PAIRS.length];
                return (
                  <Link key={album.id} href="/marketplace">
                    <div
                      className="card p-4 cursor-pointer h-full group"
                      style={{ transition: "transform 0.2s, box-shadow 0.2s" }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${ac}33`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform = "";
                        (e.currentTarget as HTMLElement).style.boxShadow = "";
                      }}
                    >
                      <div
                        className="relative w-full h-28 rounded-xl mb-3 flex items-center justify-center overflow-hidden"
                        style={{ background: `${ac}12`, border: `1px solid ${ac}28` }}
                      >
                        {cover ? (
                          <img src={cover} alt={album.title} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <VinylDisc color={ac} size={72} />
                        )}
                        {album.trendingScore > 0 && (
                          <span className="badge badge-pk absolute top-2 left-2" style={{ fontSize: "0.52rem" }}>Hot</span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-white truncate mb-0.5">{album.title}</div>
                      <div className="text-xs mb-2" style={{ color: "var(--tx2)" }}>{artist} · {album.year > 0 ? album.year : "—"}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${ac}18`, color: ac }}>
                          {album.trendingScore > 0 ? `↑ ${album.trendingScore}` : "New"}
                        </span>
                        <button className="btn btn-pk btn-sm">View</button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            BLOG POSTS
        ════════════════════════════════════════════════════════════════════ */}
        {blogs.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 lbl mb-1"><MdDynamicFeed size={14} /> Editorial</div>
                <div className="font-bebas text-3xl text-white">From the Blog</div>
              </div>
              <Link href="/feed"><button className="btn btn-ghost btn-sm">All Posts</button></Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {blogs.slice(0, 3).map(blog => (
                <div key={blog.id} className="card p-5 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1">
                    {blog.tags?.slice(0, 3).map(t => (
                      <span key={t.tag.name} className="badge badge-cy" style={{ fontSize: "0.5rem" }}>{t.tag.name}</span>
                    ))}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white leading-tight mb-1">{blog.title}</div>
                    <div className="text-xs leading-relaxed" style={{ color: "var(--tx2)" }}>{blog.excerpt?.slice(0, 100)}…</div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t" style={{ borderColor: "var(--bdr)" }}>
                    {imgUrl(blog.author.avatarUrl) ? (
                      <img src={imgUrl(blog.author.avatarUrl)!} className="w-6 h-6 rounded-full" alt="" />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--surf)", color: "var(--tx2)" }}>
                        {blog.author.username[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs" style={{ color: "var(--tx3)" }}>@{blog.author.username}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            FEATURES GRID
        ════════════════════════════════════════════════════════════════════ */}
        <div ref={featuresRef} className="w-full">
          <div className="lbl mb-2">Everything You Need</div>
          <div className="font-bebas text-3xl text-white mb-6">Built for Collectors</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <MdAlbum size={26} />,       title: "Digital Collection", desc: "Scan barcodes to add records instantly. Track value, condition and notes.", free: true,  href: "/collection" },
              { icon: <MdStorefront size={26} />,   title: "P2P Marketplace",   desc: "Buy and sell with zero seller fees. Message directly, deal your way.",  free: false, href: "/marketplace" },
              { icon: <MdDynamicFeed size={26} />,  title: "Community Feed",    desc: "Hauls, setups, favourites — share your vinyl life.",                    free: false, href: "/feed" },
              { icon: <MdFavorite size={26} />,     title: "Wish List",         desc: "Save records and get notified when prices drop.",                       free: false, href: "/wishlist" },
              { icon: <MdStore size={26} />,        title: "Stores Directory",  desc: "Hand-curated map of the best record shops worldwide.",                  free: true,  href: "/stores" },
              { icon: <RiVipCrownFill size={24} />, title: "Premium",           desc: "Unlimited collection, marketplace, feed & messaging.",                  free: false, href: "/premium" },
            ].map(f => (
              <Link key={f.title} href={f.href}>
                <div className="card feat-card p-5 flex gap-4 hover:border-current transition-colors cursor-pointer h-full" style={{ opacity: 0 }}>
                  <div style={{ color: f.free ? "var(--cy)" : "var(--pk)", flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold text-sm text-white">{f.title}</div>
                      {f.free
                        ? <span className="badge badge-gr" style={{ fontSize: "0.48rem" }}>FREE</span>
                        : <span className="badge badge-pk" style={{ fontSize: "0.48rem" }}>PRO</span>}
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: "var(--tx2)" }}>{f.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CTA
        ════════════════════════════════════════════════════════════════════ */}
        {!isLoggedIn && (
          <div className="rounded-2xl p-10 text-center w-full" style={{ background: "linear-gradient(135deg,rgba(255,0,110,0.08),rgba(123,47,255,0.08))", border: "1px solid rgba(255,0,110,0.15)" }}>
            <MdAlbum size={52} style={{ color: "var(--pk)", margin: "0 auto 16px" }} />
            <div className="font-bebas text-4xl g1 mb-3">Ready to Join?</div>
            <div className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--tx2)" }}>Free to start. Upgrade for unlimited collection, marketplace access, feed and messaging.</div>
            <Link href="/auth"><button className="btn btn-pk btn-lg">Start for Free — No Credit Card</button></Link>
          </div>
        )}

      </div>

      {/* ── Global keyframes & styles ── */}
      <style jsx global>{`
        @keyframes coverFloat {
          0%, 100% { transform: translateY(0px) rotate(-0.5deg); }
          50%       { transform: translateY(-16px) rotate(0.5deg); }
        }
        @keyframes auraPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.08); opacity: 1; }
        }
        @keyframes spinCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spinCCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes floatChip {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-14px) rotate(1deg); }
        }

        /* Gradient text — applied as a class so GSAP opacity changes
           don't create a new stacking context that breaks background-clip */
        .discover-stroke-line {
          -webkit-text-stroke: 1px var(--hero-c1, #FF006E);
          color: transparent;
        }
        .gradient-text-line {
          background: linear-gradient(90deg, var(--hero-c1, #FF006E), var(--hero-c2, #7B2FFF));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }

        /* Glitch text effect */
        .glitch-wrap {
          position: relative;
          display: inline-block;
        }
        .glitch-wrap::before,
        .glitch-wrap::after {
          content: attr(data-text);
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          opacity: 0.12;
        }
        .glitch-wrap::before {
          color: #FF006E;
          animation: glitchA 4s infinite;
          clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%);
        }
        .glitch-wrap::after {
          color: #00F5FF;
          animation: glitchB 4s infinite;
          clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%);
        }
        @keyframes glitchA {
          0%, 90%, 100% { transform: translate(0); }
          92%           { transform: translate(-3px, 1px); }
          94%           { transform: translate(3px, -1px); }
          96%           { transform: translate(-2px, 0); }
        }
        @keyframes glitchB {
          0%, 88%, 100% { transform: translate(0); }
          90%           { transform: translate(3px, -1px); }
          92%           { transform: translate(-3px, 2px); }
          95%           { transform: translate(2px, 0); }
        }

        /* Swiper bullets */
        .swiper-pagination-bullet {
          background: rgba(255,255,255,0.3) !important;
          width: 6px !important;
          height: 6px !important;
        }
        .swiper-pagination-bullet-active {
          background: #FF006E !important;
          width: 20px !important;
          border-radius: 3px !important;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </AppLayout>
  );
}

function clamp(val: number, _min: number, _max: number) { return val; }