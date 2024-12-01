document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById("loader");
    const loaderContent = document.querySelector(".loader-content");
    const secondaryBg = document.querySelector(".secondary-bg");
    const thirdBg = document.querySelector(".third-bg");

    let count = 0;
    const duration = 3500; // Counter duration
    const maxCount = 100;

    const easeInOut = (t) =>
        t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Ease in-out formula

    const startTime = Date.now();

    const updateCounter = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1); // Ensure it doesn't exceed 1
        const easedProgress = easeInOut(progress);

        count = Math.round(maxCount * easedProgress);
        document.querySelector(".loader-counter").textContent = count;

        // Change background color of .secondary-bg based on progress
        const colorProgress = Math.round(255 * (1 - progress)); // Fade from white to black
        secondaryBg.style.backgroundColor = `rgb(${colorProgress}, ${colorProgress}, ${colorProgress})`;

        // Change text color of .loader-content from black to white
        const textColorProgress = Math.round(255 * progress); // Fade from black to white
        loaderContent.style.color = `rgb(${textColorProgress}, ${textColorProgress}, ${textColorProgress})`;

        if (elapsed < duration) {
            requestAnimationFrame(updateCounter);
        } else {
            completeLoading();
        }
    };

    const completeLoading = () => {
        // Fade out content
        gsap.to(loaderContent, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                // Animate wave effect for loader
                gsap.timeline()
                    .to(secondaryBg, {
                        y: "-100%",
                        duration: 1.8,
                        ease: "power4.inOut",
                    }, 0) // Start immediately
                    .to(thirdBg, {
                        y: "-100%",
                        duration: 1.8,
                        ease: "power4.inOut",
                    }, 0.1) // Start slightly delayed
                    .to(loader, {
                        y: "-100%",
                        duration: 1.8,
                        ease: "power4.inOut",
                        onComplete: () => loader.remove(), // Remove loader
                    }, 0.1); // Start after other animations
            }
        });
    };

    updateCounter();
});