const canvas = document.getElementById('scoutMap');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const scale = 3; // 1cm in real life = 3 pixels on screen

let robotPath = []; // Stores {x, y}
let resources = []; // Stores {x, y, type}

function drawGrid() {
    ctx.strokeStyle = '#003300';
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

        // Update robot position
        robotPath.push({ x: data.x, y: data.y });

        // Sync the resource list
        resources = data.resources;

        render();
    } catch (e) { console.log("Searching for Scout..."); }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // 1. Draw Resources (The "Points of Interest")
    ctx.font = "bold 14px 'Courier New'";
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
        ctx.shadowColor = "#00ff00";
        ctx.fillStyle = '#00ff00'; // Green for the robot
        ctx.beginPath();
        ctx.arc(rx, ry, 8, 0, Math.PI * 2); // A circle looks more like a GPS dot than a square
        ctx.fill();
        
        // Reset shadow so it doesn't affect other drawings
        ctx.shadowBlur = 0;

        // Label the robot
        ctx.fillStyle = "#00ff00";
        ctx.fillText("SCOUT-01", rx + 12, ry - 12);
    }
}

setInterval(updateData, 500); // Refresh every 0.5s