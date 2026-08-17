import "./style.css";
import Orchestrator from "./ThreeJS/Orchestrator.js";

const orchestrator = new Orchestrator(document.querySelector("canvas.webgl"));

// Scroll-driven curtain-reveal transition (Hero → About)
import "./scroll-reveal.js";

import initSkillsLoop from "./skills-loop.js";
initSkillsLoop();

import { initVariableProximity } from "./variable-proximity.js";
initVariableProximity();

// Typewriter effect for last name
const typewriterEl = document.querySelector('.typewriter-text');
if (typewriterEl) {
    const text = typewriterEl.getAttribute('data-text');
    let i = 0;
    
    // Start typing immediately as the curtain fades in
    setTimeout(() => {
        const interval = setInterval(() => {
            typewriterEl.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(interval);
                
                // Stop the cursor blinking once typing is finished
                const cursorEl = document.querySelector('.typewriter-cursor');
                if (cursorEl) {
                    cursorEl.style.animation = 'none';
                    cursorEl.style.opacity = '1';
                }
                
                // Signal to scroll-reveal that the cursor is in its final position
                // (No longer needed, morphing removed)
            }
        }, 120); // 120ms per character
    }, 300);
}

import gsap from 'gsap';

// Custom Cursor Logic
document.addEventListener('DOMContentLoaded', () => {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (dot && ring) {
        gsap.set(dot, { xPercent: -50, yPercent: -50 });
        gsap.set(ring, { xPercent: -50, yPercent: -50 });

        const xToRing = gsap.quickTo(ring, "x", { duration: 0.15, ease: "power3.out" });
        const yToRing = gsap.quickTo(ring, "y", { duration: 0.15, ease: "power3.out" });

        document.addEventListener('mousemove', (e) => {
            gsap.set(dot, { x: e.clientX, y: e.clientY });
            xToRing(e.clientX);
            yToRing(e.clientY);
        });
    }
});
