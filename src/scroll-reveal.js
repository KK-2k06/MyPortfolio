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

    // Create the master timeline
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".hero-pin-wrap",
            start: "top top",
            end: "+=120%", // Tuned to give a smooth reveal without being overly long
            scrub: 1,
            pin: ".hero-stage",
            anticipatePin: 1
        }
    });

    // ── STEP 1: Curtain Split (Time 0 → 0.5) ─────────────────────────────
    const leftChildren = curtainLeft.children;
    const rightChildren = curtainRight.children;

    tl.to(leftChildren, { xPercent: -100, opacity: 0, stagger: 0.08, ease: "power2.in", duration: 0.5 }, 0);
    tl.to(rightChildren, { xPercent: 100, opacity: 0, stagger: 0.08, ease: "power2.in", duration: 0.5 }, 0);

    // ── STEP 2: Wave-Grid Calm (Time 0.1 → 0.7) ──────────────────────────
    const amplitudeProxy = { value: originalAmplitude };
    tl.to(amplitudeProxy, {
        value: originalAmplitude * 0.15,
        ease: "power2.inOut",
        duration: 0.6,
        onUpdate: () => {
            if (stage.shaderRef) stage.shaderRef.uniforms.uAmplitude.value = amplitudeProxy.value;
        },
    }, 0.1);

    // ── STEP 3: About Fade In Full Viewport (Time 0.45) ──────────────────
    tl.fromTo(aboutSection, {
        autoAlpha: 0,
        pointerEvents: "none"
    }, { 
        autoAlpha: 1, 
        pointerEvents: "none",
        y: 0, 
        ease: "power2.out", 
        duration: 0.5 
    }, 0.45);

    // ── STEP 4: Content Reveal Inside About (Time 0.6) ───────────────────
    tl.fromTo(aboutElements, { 
        opacity: 0, 
        y: 20 
    }, { 
        opacity: 1, 
        y: 0, 
        stagger: 0.08, 
        ease: "power2.out", 
        duration: 0.4 
    }, 0.6);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(init));
} else {
    requestAnimationFrame(init);
}
