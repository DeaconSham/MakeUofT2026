const canvas = document.getElementById('scoutMap');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const scale = 3; // 1cm in real life = 3 pixels on screen

let robotPath = []; // Stores {x, y}
let resources = []; // Stores {x, y, type}
let isResetting = false;

function drawGrid() {
    ctx.strokeStyle = '#333333';
    ctx.beginPath();
    // Draw Axis
    ctx.moveTo(0, centerY); ctx.lineTo(canvas.width, centerY);
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
}
async function updateData() {
    try {
        const response = await fetch('/get_telemetry');
        const data = await response.json();

        if (isResetting) return;

        // Update robot position
        robotPath.push({ x: data.x, y: data.y });

        // Sync the resource list
        resources = data.resources;

        render();
    } catch (e) { console.log("Searching for Scout"); }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // 1. Draw Resources (The "Points of Interest")
    ctx.font = "bold 14px 'Rajdhani', sans-serif";
    resources.forEach(res => {
        const rx = centerX + (res.x * scale);
        const ry = centerY - (res.y * scale);

        ctx.fillStyle = "#ffff00"; // Yellow for resources
        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.fillText(res.label, rx + 8, ry + 4);
    });

    // 2. Draw Robot (The "GPS Dot")
    const current = robotPath[robotPath.length - 1]; // Get only the latest position
    if (current) {
        const rx = centerX + (current.x * scale);
        const ry = centerY - (current.y * scale);

        // Draw a glowing "GPS" style dot
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ff9d";
        ctx.fillStyle = '#00ff9d'; // Green for the robot
        ctx.beginPath();
        ctx.arc(rx, ry, 8, 0, Math.PI * 2); // A circle looks more like a GPS dot than a square
        ctx.fill();

        // Reset shadow so it doesn't affect other drawings
        ctx.shadowBlur = 0;

        // Label the robot
        ctx.fillStyle = "#00ff9d";
        ctx.fillText("BENTOgelion", rx + 12, ry - 12);
    }
}

setInterval(updateData, 500); // Refresh every 0.5s

// --- RESET FUNCTIONALITY ---
document.getElementById('resetBtn').addEventListener('click', async () => {
    console.log("Reset button clicked"); // DEBUG LOG
    if (confirm("Are you sure you want to reset the map and position?")) {
        console.log("Reset confirmed by user"); // DEBUG LOG
        isResetting = true;
        try {
            const response = await fetch('/reset', { method: 'POST' });
            console.log("Reset response status:", response.status); // DEBUG LOG

            if (response.ok) {
                // Clear local data
                robotPath = [];
                resources = [];
                // Force a re-render
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawGrid();
                console.log("Map reset successfully.");
                alert("Map has been reset!"); // Visual feedback
            } else {
                console.error("Reset failed with status:", response.status);
            }
        } catch (e) {
            console.error("Failed to reset:", e);
        } finally {
            isResetting = false;
        }
    }
});