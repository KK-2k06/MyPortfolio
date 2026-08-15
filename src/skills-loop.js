import gsap from "gsap";
import Draggable from "gsap/Draggable";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(Draggable, ScrollTrigger);

export default function initSkillsLoop() {
    const container = document.querySelector('.about-skills-container');
    const loopInner = document.querySelector('.about-skills-loop');
    const firstList = document.querySelector('.skills-list');

    if (!container || !loopInner || !firstList) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Wait a brief moment to ensure fonts/layout are calculated
    setTimeout(() => {
        const listHeight = firstList.offsetHeight;
        if (listHeight === 0) return;

        let idleTween = null;

        const wrapY = gsap.utils.wrap(-listHeight, 0);

        function playIdle() {
            if (prefersReducedMotion) return;
            if (idleTween) idleTween.kill();
            
            // Create a fresh relative tween from current position
            idleTween = gsap.to(loopInner, {
                y: `-=${listHeight}`,
                duration: listHeight / 50, // approx 50px per second
                ease: "none",
                repeat: -1,
                modifiers: {
                    y: gsap.utils.unitize(wrapY)
                }
            });
        }

        function pauseIdle() {
            if (idleTween) idleTween.kill();
        }

        if (!prefersReducedMotion) {
            let isSkillsActive = true;
            
            // Start scrolling immediately and never stop (unless hovered/dragged)
            playIdle();

            // Pause on hover
            container.addEventListener('mouseenter', () => {
                if (!Draggable.get(loopInner)?.isDragging) {
                    pauseIdle();
                }
            });
            container.addEventListener('mouseleave', () => {
                const isCoasting = momentumTween && momentumTween.isActive();
                // Only resume if we are still within the valid scroll window!
                if (isSkillsActive && !Draggable.get(loopInner)?.isDragging && !container.matches(':focus-visible') && !isCoasting) {
                    playIdle();
                }
            });
        }

        // Setup custom momentum state
        let dragVelocity = 0;
        let lastY = 0;
        let lastTime = 0;
        let momentumTween = null;

        Draggable.create(loopInner, {
            type: "y",
            onPress() {
                pauseIdle();
                if (momentumTween) momentumTween.kill();
                lastY = this.y;
                lastTime = Date.now();
            },
            onDrag() {
                const now = Date.now();
                const dt = Math.max(1, now - lastTime);
                dragVelocity = (this.y - lastY) / dt; // velocity in px/ms
                
                const wrappedY = wrapY(this.y);
                if (wrappedY !== this.y) {
                    gsap.set(loopInner, { y: wrappedY });
                    this.update(); // Sync Draggable internal state
                }

                lastY = this.y;
                lastTime = now;
            },
            onRelease() {
                if (prefersReducedMotion) return;

                // Basic custom throw physics to simulate InertiaPlugin
                const coastDistance = dragVelocity * 600; // Throw multiplier
                
                if (Math.abs(coastDistance) > 10) {
                    momentumTween = gsap.to(loopInner, {
                        y: `+=${coastDistance}`,
                        duration: 1.2,
                        ease: "power2.out",
                        modifiers: {
                            y: gsap.utils.unitize(wrapY)
                        },
                        onUpdate: () => {
                            // Keep Draggable's tracker synced with the tween
                            Draggable.get(loopInner).update();
                        },
                        onComplete: () => {
                            if (!container.matches(':hover') && !container.matches(':focus-visible')) {
                                playIdle();
                            }
                        }
                    });
                } else {
                    if (!container.matches(':hover') && !container.matches(':focus-visible')) {
                        playIdle();
                    }
                }
            }
        });

        // Keyboard Accessibility
        container.addEventListener('focus', () => {
            if (container.matches(':focus-visible')) {
                pauseIdle();
            }
        });
        container.addEventListener('blur', () => {
            if (!container.matches(':hover')) playIdle();
        });
        container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const step = 40;
                const dir = e.key === 'ArrowUp' ? -1 : 1;
                const draggable = Draggable.get(loopInner);
                
                const newY = wrapY(draggable.y + (step * dir));
                gsap.set(loopInner, { y: newY });
                draggable.update();
            }
        });
        
    }, 150); // slight delay to allow layout to settle
}
