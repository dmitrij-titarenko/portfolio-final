document.addEventListener("DOMContentLoaded", () => {
    // Create the custom cursor element
    const cursor = document.createElement("div");
    cursor.classList.add("cursor");
    document.body.appendChild(cursor);

    // Store cursor position
    let cursorX = 0;
    let cursorY = 0;

    // Smooth cursor movement using requestAnimationFrame
    function updateCursor() {
        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        requestAnimationFrame(updateCursor);
    }
    requestAnimationFrame(updateCursor);

    // Update position variables on mousemove
    document.addEventListener("mousemove", (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
    });

    // Add a hover effect for interactive elements
    const interactiveElements = document.querySelectorAll("button, a, input");
    interactiveElements.forEach((el) => {
        el.addEventListener("mouseenter", () => {
            cursor.classList.add("hover");
        });

        el.addEventListener("mouseleave", () => {
            cursor.classList.remove("hover");
        });
    });

    // Handle click animation
    document.addEventListener("mousedown", () => {
        cursor.classList.add("click");
    });

    document.addEventListener("mouseup", () => {
        cursor.classList.remove("click");
    });
});