import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Orchestrator from "./ThreeJS/Orchestrator.js";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
).matches;

function init() {
    const orchestrator = new Orchestrator();
    const stage = orchestrator.stage;
    const originalAmplitude = stage.params.waveAmplitude;

    const curtainLeft = document.querySelector(".curtain-left");
    const curtainRight = document.querySelector(".curtain-right");
    const aboutSection = document.querySelector(".about-section");
    const aboutElements = document.querySelectorAll(".eyebrow, .large-statement-container, .about-paragraphs > *, .about-skills-container");
    const projectsSection = document.querySelector(".projects-section");
    const wipeLine = document.querySelector(".wipe-line");

    if (!curtainLeft || !curtainRight || !aboutSection || aboutElements.length === 0) {
        console.warn("[scroll-reveal] Missing DOM elements, skipping init.");
        return;
    }

    if (prefersReducedMotion) {
        gsap.set(aboutSection, { autoAlpha: 0 });
        ScrollTrigger.create({
            trigger: ".hero-pin-wrap",
            start: "top top",
            end: "bottom top",
            scrub: 1,
            onUpdate: (self) => {
                const p = self.progress;
                gsap.set([curtainLeft, curtainRight], { opacity: 1 - p });
                gsap.set(aboutSection, { autoAlpha: p });
            },
        });
        return;
    }

    // Create the master timeline — extended to include the wipe transition
    // Phase 1 (0 → 0.5): Hero → About reveal (curtain split + about fade in)
    // Phase 2 (0.55 → 0.95): About → Projects wipe sweep
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".hero-pin-wrap",
            start: "top top",
            end: "+=350%",
            scrub: 1.2,
            pin: ".hero-stage",
            anticipatePin: 1
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1: HERO → ABOUT  (timeline 0 → 0.35)
    // ════════════════════════════════════════════════════════════════════════

    // ── STEP 1: Curtain Split (Time 0 → 0.18) ─────────────────────────────
    const leftChildren = curtainLeft.children;
    const rightChildren = curtainRight.children;

    tl.to(leftChildren, { xPercent: -100, opacity: 0, stagger: 0.03, ease: "power2.in", duration: 0.18 }, 0);
    tl.to(rightChildren, { xPercent: 100, opacity: 0, stagger: 0.03, ease: "power2.in", duration: 0.18 }, 0);

    // ── STEP 2: Wave-Grid Calm (Time 0.05 → 0.25) ────────────────────────
    const amplitudeProxy = { value: originalAmplitude };
    tl.to(amplitudeProxy, {
        value: originalAmplitude * 0.15,
        ease: "power2.inOut",
        duration: 0.2,
        onUpdate: () => {
            if (stage.shaderRef) stage.shaderRef.uniforms.uAmplitude.value = amplitudeProxy.value;
        },
    }, 0.05);

    // ── STEP 3: About Fade In (Time 0.15 → 0.30) ─────────────────────────
    tl.fromTo(aboutSection, {
        autoAlpha: 0,
        pointerEvents: "none"
    }, { 
        autoAlpha: 1, 
        pointerEvents: "none",
        y: 0, 
        ease: "power2.out", 
        duration: 0.15 
    }, 0.15);

    // ── STEP 4: About Content Stagger (Time 0.22 → 0.35) ─────────────────
    tl.fromTo(aboutElements, { 
        opacity: 0, 
        y: 20 
    }, { 
        opacity: 1, 
        y: 0, 
        stagger: 0.03, 
        ease: "power2.out", 
        duration: 0.13 
    }, 0.22);

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 2: ABOUT → PROJECTS WIPE SWEEP  (timeline 0.65 → 0.98)
    // ════════════════════════════════════════════════════════════════════════

    if (!projectsSection || !wipeLine) return;

    // Generous idle gap (0.35 → 0.65) so About has a moment to breathe

    const wipeStart = 0.65;
    const wipeEnd = 0.98;
    const wipeDuration = wipeEnd - wipeStart; // 0.33

    // Use a proxy to drive all wipe visuals from a single tween
    const wipeProxy = { progress: 0 };

    tl.to(wipeProxy, {
        progress: 1,
        ease: "none",
        duration: wipeDuration,
        onStart: () => {
            // Make projects visible when wipe begins
            projectsSection.style.visibility = "visible";
        },
        onUpdate: () => {
            const p = wipeProxy.progress;
            
            // Map p to xPct from -30 to 130 to ensure the slanted line fully clears the screen
            const xPct = -30 + (p * 160);

            // Calculate the horizontal shift at the top/bottom caused by the 8-degree rotation
            // distance from center to top is H/2. horizontal shift is (H/2) * tan(8deg)
            const rad = 8 * Math.PI / 180;
            const slantPx = (window.innerHeight / 2) * Math.tan(rad);
            const slantPct = (slantPx / window.innerWidth) * 100;

            // ── Wipe line position & visibility ──
            gsap.set(wipeLine, {
                left: `${xPct}%`,
                xPercent: 0,
                opacity: (p > 0.005 && p < 0.995) ? 1 : 0,
            });

            // The line is at xPct. Because it's rotated 8deg, the top is shifted RIGHT by slantPct, 
            // and the bottom is shifted LEFT by slantPct.
            const rightTop = xPct + slantPct;
            const rightBottom = xPct - slantPct;

            // ── Projects: reveal from left via polygon ──
            // Polygon: TopLeft, TopRight, BottomRight, BottomLeft
            gsap.set(projectsSection, {
                clipPath: `polygon(0% 0%, ${rightTop}% 0%, ${rightBottom}% 100%, 0% 100%)`,
                pointerEvents: p > 0.95 ? "auto" : "none",
            });

            // ── About: erase from left via polygon ──
            gsap.set(aboutSection, {
                clipPath: `polygon(${rightTop}% 0%, 100% 0%, 100% 100%, ${rightBottom}% 100%)`,
                pointerEvents: p < 0.05 ? "auto" : "none",
            });
        },
        onReverseComplete: () => {
            // Reset everything when scrolling back past the wipe start
            gsap.set(wipeLine, { opacity: 0 });
            gsap.set(projectsSection, {
                clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
                visibility: "hidden",
                pointerEvents: "none",
            });
            gsap.set(aboutSection, {
                clipPath: "inset(0 0 0 0)",
            });
        },
    }, wipeStart);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(init));
} else {
    requestAnimationFrame(init);
}
