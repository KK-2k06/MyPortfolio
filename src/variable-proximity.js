export function initVariableProximity() {
    const statement = document.querySelector(".large-statement");
    if (!statement) return;

    const text = statement.textContent.trim();
    statement.innerHTML = "";

    // The resting weight and the hover weight
    const MIN_WEIGHT = 400; // Lighter resting state for stronger effect
    const MAX_WEIGHT = 900;
    const MAX_DISTANCE = 80; // Reduced radius so it only works when directly on the text

    const spans = [];

    // Split into words first to prevent mid-word line breaking
    const words = text.split(" ");
    
    words.forEach((word, wordIndex) => {
        const wordSpan = document.createElement("span");
        wordSpan.style.display = "inline-block";
        wordSpan.style.whiteSpace = "nowrap";

        // Split word into characters
        const chars = word.split("");
        chars.forEach(char => {
            const charSpan = document.createElement("span");
            charSpan.textContent = char;
            charSpan.style.display = "inline-block";
            // A tiny transition smooths out the raw mousemove updates
            charSpan.style.transition = "font-variation-settings 0.1s ease-out";
            charSpan.style.fontVariationSettings = `"wght" ${MIN_WEIGHT}`;
            
            wordSpan.appendChild(charSpan);
            spans.push(charSpan);
        });

        statement.appendChild(wordSpan);

        // Add a space after each word except the last one
        if (wordIndex < words.length - 1) {
            statement.appendChild(document.createTextNode(" "));
        }
    });

    let mouseX = 0;
    let mouseY = 0;
    let isHovering = false;
    let rafId = null;

    // We only need to compute this when mouse moves
    window.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        if (!rafId) {
            rafId = requestAnimationFrame(updateWeights);
        }
    });

    function updateWeights() {
        spans.forEach(span => {
            const rect = span.getBoundingClientRect();
            // Center of the character
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const dx = mouseX - centerX;
            const dy = mouseY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let weight = MIN_WEIGHT;
            if (distance < MAX_DISTANCE) {
                // Calculate falloff (1 = exactly at center, 0 = at MAX_DISTANCE)
                const factor = 1 - (distance / MAX_DISTANCE);
                // Gaussian-like ease out for a bubbly, natural bulge
                const easeFactor = Math.sin(factor * (Math.PI / 2));
                weight = MIN_WEIGHT + ((MAX_WEIGHT - MIN_WEIGHT) * easeFactor);
            }

            span.style.fontVariationSettings = `"wght" ${weight}`;
        });
        
        rafId = null;
    }

    // Reset when mouse leaves document
    document.addEventListener("mouseleave", () => {
        spans.forEach(span => {
            span.style.fontVariationSettings = `"wght" ${MIN_WEIGHT}`;
        });
    });
}
