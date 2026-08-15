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

    // Create the master timeline — extended to include the stack transition
    // Phase 1 (0 → 0.15): Hero → About reveal
    // Pause   (0.15 → 0.40): Locked About section (Increased time here)
    // Phase 2 (0.40 → 0.60): About → Projects vertical scroll
    // Phase 3 (0.60 → 1.0): Projects Card Stack shuffle
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".hero-pin-wrap",
            start: "top top",
            end: "+=1000%", // Longer scroll distance to fit all phases comfortably
            scrub: 1.2,
            pin: ".hero-stage",
            anticipatePin: 1
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1: HERO → ABOUT  (timeline 0 → 0.15)
    // ════════════════════════════════════════════════════════════════════════

    const phase1Duration = 0.15;

    // ── STEP 1: Curtain Split ─────────────────────────────
    const leftChildren = curtainLeft.children;
    const rightChildren = curtainRight.children;

    tl.to(leftChildren, { xPercent: -100, opacity: 0, stagger: 0.02, ease: "power2.in", duration: phase1Duration * 0.8 }, 0);
    tl.to(rightChildren, { xPercent: 100, opacity: 0, stagger: 0.02, ease: "power2.in", duration: phase1Duration * 0.8 }, 0);

    tl.to(orchestrator.camera.position, {
        z: 35,
        y: -10,
        ease: "power1.inOut",
        duration: phase1Duration
    }, 0);

    // Proxy object to tween colors and amplitude correctly into the shader
    const shaderProxy = {
        base: "#2c2c2c",
        high: "#40d66f",
        amplitude: originalAmplitude
    };

    // Dim the grid significantly for the About section (approx 40% brightness)
    tl.to(shaderProxy, {
        base: "#121212", 
        high: "#1a562c", 
        amplitude: originalAmplitude * 1.5,
        ease: "power2.out",
        duration: phase1Duration,
        onUpdate: () => {
            if (stage.shaderRef) {
                stage.shaderRef.uniforms.uColorBase.value.set(shaderProxy.base);
                stage.shaderRef.uniforms.uColorHigh.value.set(shaderProxy.high);
                stage.shaderRef.uniforms.uAmplitude.value = shaderProxy.amplitude;
            }
        }
    }, 0);

    // ── STEP 2: About Fade In ─────────────────────────
    tl.fromTo(aboutSection, 
        { autoAlpha: 0, scale: 0.95, pointerEvents: "none" },
        { autoAlpha: 1, scale: 1, pointerEvents: "none", ease: "power2.out", duration: phase1Duration * 0.8 }, 
        phase1Duration * 0.4
    );

    tl.fromTo(aboutElements, 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.05, ease: "power2.out", duration: phase1Duration * 0.6 },
        phase1Duration * 0.5
    );

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 2: ABOUT → PROJECTS VERTICAL SCROLL  (timeline 0.4 → 0.6)
    // ════════════════════════════════════════════════════════════════════════

    if (!projectsSection) return;

    // Set initial state for Projects section so it sits below the viewport
    gsap.set(projectsSection, {
        visibility: "visible",
        pointerEvents: "none", // Prevent interaction while scrolling up
        yPercent: 100
    });

    const scrollStart = 0.40;
    const scrollEnd = 0.60;
    const scrollDuration = scrollEnd - scrollStart;

    // Animate both sections simultaneously to simulate native vertical scrolling
    tl.to(aboutSection, {
        yPercent: -100,
        ease: "none",
        duration: scrollDuration
    }, scrollStart);

    tl.to(projectsSection, {
        yPercent: 0,
        ease: "none",
        duration: scrollDuration
    }, scrollStart);

    // Re-enable pointer events on Projects section when fully in view
    tl.set(projectsSection, { pointerEvents: "auto" }, scrollEnd);

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 3: PROJECTS CARD STACK SHUFFLE  (timeline 0.6 → 1.0)
    // ════════════════════════════════════════════════════════════════════════
    const cards = [
        document.getElementById("card-0"),
        document.getElementById("card-1"),
        document.getElementById("card-2")
    ];
    const trackers = [
        document.getElementById("tracker-0"),
        document.getElementById("tracker-1"),
        document.getElementById("tracker-2")
    ];

    if (cards[0] && trackers[0]) {
        // Initial setup for the stack (stacked vertically peeking from bottom)
        gsap.set(cards[0], { y: 0, scale: 1, zIndex: 3, opacity: 1 });
        gsap.set(cards[1], { y: 40, scale: 0.95, zIndex: 2, opacity: 1 });
        gsap.set(cards[2], { y: 80, scale: 0.90, zIndex: 1, opacity: 1 });

        const stackStart = 0.60;
        const stackDuration = 0.40;
        const step = stackDuration / 2; // two transitions (0->1, 1->2)

        // Step 1: Card 0 leaves (slides UP and fades), Card 1 active, Card 2 moves up
        tl.to(cards[0], { yPercent: -50, scale: 1.05, opacity: 0, ease: "power2.inOut", duration: step }, stackStart);
        tl.to(cards[1], { y: 0, scale: 1, ease: "power2.inOut", duration: step }, stackStart);
        tl.to(cards[2], { y: 40, scale: 0.95, ease: "power2.inOut", duration: step }, stackStart);
        
        // Tracker 0 to 1
        tl.add(() => {
            trackers.forEach(t => t.classList.remove("active"));
            trackers[1].classList.add("active");
        }, stackStart + (step * 0.5));
        
        // Reverse for Tracker 0 to 1
        tl.add(() => {
            trackers.forEach(t => t.classList.remove("active"));
            trackers[0].classList.add("active");
        }, stackStart + (step * 0.49)); 

        // Step 2: Card 1 leaves, Card 2 active
        const step2Start = stackStart + step;
        tl.to(cards[1], { yPercent: -50, scale: 1.05, opacity: 0, ease: "power2.inOut", duration: step }, step2Start);
        tl.to(cards[2], { y: 0, scale: 1, ease: "power2.inOut", duration: step }, step2Start);

        // Tracker 1 to 2
        tl.add(() => {
            trackers.forEach(t => t.classList.remove("active"));
            trackers[2].classList.add("active");
        }, step2Start + (step * 0.5));

        // Reverse for Tracker 1 to 2
        tl.add(() => {
            trackers.forEach(t => t.classList.remove("active"));
            trackers[1].classList.add("active");
        }, step2Start + (step * 0.49));
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(init));
} else {
    requestAnimationFrame(init);
}
