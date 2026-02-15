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

    // 1. Draw Path (Green Line)
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    robotPath.forEach((p, i) => {
        const sx = centerX + (p.x * scale);
        const sy = centerY - (p.y * scale); // Subtract because Y is up in math but down in JS
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // 2. Draw Object Markers with Labels
    ctx.font = "bold 12px 'Courier New'";
    resources.forEach(res => {
        const rx = centerX + (res.x * scale);
        const ry = centerY - (res.y * scale);

        // Draw marker dot with glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ff00";
        ctx.fillStyle = "#00ff00";
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw label background
        const labelText = `${res.label}`;
        const posText = `(${res.x}, ${res.y})`;
        const timeText = res.timestamp ? res.timestamp.split(' ')[1] : ''; // Just show time

        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(rx + 10, ry - 25, 120, 40);

        // Draw label text
        ctx.font = "bold 11px 'Courier New'";
        ctx.fillStyle = "#00ff00";
        ctx.fillText(labelText, rx + 15, ry - 12);

        ctx.font = "9px 'Courier New'";
        ctx.fillStyle = "#00cc00";
        ctx.fillText(posText, rx + 15, ry - 1);

        ctx.fillStyle = "#888888";
        ctx.fillText(timeText, rx + 15, ry + 10);
    });

    // 3. Draw Robot (Current Position)
    const current = robotPath[robotPath.length - 1];
    if (current) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(centerX + (current.x * scale) - 5, centerY - (current.y * scale) - 5, 10, 10);
    }
}

setInterval(updateData, 500); // Refresh every 0.5s