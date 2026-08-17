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
        high: "#40d66f"
    };

    // Reduce only the green intensity for the next sections
    tl.to(shaderProxy, {
        high: "#1a562c", 
        ease: "power2.out",
        duration: phase1Duration,
        onUpdate: () => {
            if (stage.shaderRef) {
                stage.shaderRef.uniforms.uColorHigh.value.set(shaderProxy.high);
            }
        }
    }, 0);


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

    // Keep pointer events none on the projects section so mouse trails still work, 
    // we will enable pointer events only on the interactive children via CSS.
    tl.set(projectsSection, { pointerEvents: "none" }, scrollEnd);

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 3: PROJECTS TRANSITION (Morphing in-place)
    // ════════════════════════════════════════════════════════════════════════
    const proj1 = document.querySelector("#project-1");
    const proj2 = document.querySelector("#project-2");
    const proj3 = document.querySelector("#project-3");
    const proj4 = document.querySelector("#project-4");

    if (proj1 && proj2 && proj3 && proj4) {
        // Initialize hidden projects at the bottom of the container
        tl.set([proj2, proj3, proj4], { yPercent: 100 }, 0);

        // --- Transition 1: Project 1 -> Project 2 ---
        const t1Start = 0.65;
        const t1Duration = 0.10;
        
        tl.to(proj1, {
            scale: 0.92, opacity: 0, yPercent: -5,
            ease: "power2.inOut", duration: t1Duration * 0.5
        }, t1Start);
        tl.set(proj1, { visibility: "hidden" }, t1Start + t1Duration * 0.5);

        tl.to(proj2, 
            { yPercent: 0, opacity: 1, visibility: "visible", ease: "power2.out", duration: t1Duration * 0.85 }, 
        t1Start + t1Duration * 0.15);

        // --- Transition 2: Project 2 -> Project 3 ---
        const t2Start = 0.76;
        const t2Duration = 0.10;
        
        tl.to(proj2, {
            scale: 0.92, opacity: 0, yPercent: -5,
            ease: "power2.inOut", duration: t2Duration * 0.5
        }, t2Start);
        tl.set(proj2, { visibility: "hidden" }, t2Start + t2Duration * 0.5);

        tl.to(proj3, 
            { yPercent: 0, opacity: 1, visibility: "visible", ease: "power2.out", duration: t2Duration * 0.85 }, 
        t2Start + t2Duration * 0.15);

        // --- Transition 3: Project 3 -> Project 4 ---
        const t3Start = 0.87;
        const t3Duration = 0.10;
        
        tl.to(proj3, {
            scale: 0.92, opacity: 0, yPercent: -5,
            ease: "power2.inOut", duration: t3Duration * 0.5
        }, t3Start);
        tl.set(proj3, { visibility: "hidden" }, t3Start + t3Duration * 0.5);

        tl.to(proj4, 
            { yPercent: 0, opacity: 1, visibility: "visible", ease: "power2.out", duration: t3Duration * 0.85 }, 
        t3Start + t3Duration * 0.15);
    }

    // ════════════════════════════════════════════════════════════════════════
    // NAVIGATION FADE-IN-PLACE LOGIC
    // ════════════════════════════════════════════════════════════════════════
    document.querySelectorAll('a[href="#about"], a[href="#project"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href');
            let targetProgress = 0;
            
            if (targetId === '#about') {
                targetProgress = 0.39; // Jump further into Phase 1 to ensure all staggered elements have finished fading in
            } else if (targetId === '#project') {
                targetProgress = 0.63; // Phase 2 completes at 0.60, rest phase is 0.60 - 0.65
            }
            
            const st = tl.scrollTrigger;
            if (st) {
                const targetScroll = st.start + (st.end - st.start) * targetProgress;
                const overlay = document.querySelector('.overlay');
                
                // Block clicks during transition
                document.body.style.pointerEvents = 'none';
                
                // 1. Fade out the entire UI
                gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => {
                    
                    // 2. Instantly jump the native scroll position
                    window.scrollTo({ top: targetScroll, behavior: 'auto' });
                    
                    // 3. Force the GSAP timeline instantly to the target progress
                    tl.progress(targetProgress);
                    
                    // 4. Fade the UI back in
                    gsap.to(overlay, { opacity: 1, duration: 0.4, onComplete: () => {
                        document.body.style.pointerEvents = '';
                    }});
                }});
            }
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(init));
} else {
    requestAnimationFrame(init);
}
