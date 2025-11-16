/* ==========================================================
   CAMERA
   ========================================================== */
let stream = null;
let usingFront = false;
let recorder = null;
let chunks = [];
let recording = false;

/* DOM elements */
const video = document.getElementById("video");
const liveBadge = document.getElementById("liveBadge");
const commentsBox = document.getElementById("commentsBox");
const viewersText = document.getElementById("viewersText");

/* ----------------------------------------------------------
   Start Camera
---------------------------------------------------------- */
async function startCamera() {
    try {
        if (stream) stream.getTracks().forEach(t => t.stop());

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: usingFront ? "user" : "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }
        });

        video.srcObject = stream;
        await video.play();

    } catch (e) {
        alert("Error al acceder a la cámara / micrófono");
        console.error(e);
    }
}

startCamera();

/* Camera Switch */
document.getElementById("camBtn").onclick = () => {
    usingFront = !usingFront;
    startCamera();
};

/* ==========================================================
   VIEWERS — slow increase
   ========================================================== */
let viewers = 50604;
setInterval(() => {
    viewers += Math.floor(Math.random() * 30) + 5;  // lento y realista
    viewersText.textContent = viewers.toLocaleString() + " viewers";
}, 2000);

/* ==========================================================
   COMMENTS — Arabic bottom up
   ========================================================== */
const arabicNames = [
    "فهد", "سيف", "كريم", "نور", "مروان",
    "آدم", "ليلى", "سارة", "علي", "ياسين"
];

const arabicMsgs = [
    "جيد جدًا",
    "أحسنت",
    "أداء ممتاز",
    "جميل جدًا",
    "استمر",
    "رائع"
];

function randomComment() {
    const n = arabicNames[Math.floor(Math.random() * arabicNames.length)];
    const m = arabicMsgs[Math.floor(Math.random() * arabicMsgs.length)];
    const emoji = Math.random() < 0.40 ? (Math.random() < 0.5 ? " 👍" : " 🔥") : "";
    return `${n}: ${m}${emoji}`;
}

function addComment() {
    const div = document.createElement("div");
    div.textContent = randomComment();
    commentsBox.appendChild(div);

    if (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}

setInterval(addComment, 3500);

/* ==========================================================
   RECORDING — FIXED & WORKING
   ========================================================== */
document.getElementById("recBtn").onclick = () => {
    if (!recording) startRecording();
    else stopRecording();
};

/* Blink LIVE */
function blinkLive() {
    if (!recording) return;
    liveBadge.style.display =
        liveBadge.style.display === "none" ? "block" : "none";
    setTimeout(blinkLive, 700);
}

async function startRecording() {
    recording = true;
    liveBadge.style.display = "block";
    blinkLive();

    /* Draw to canvas */
    const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
    const ctx = canvas.getContext("2d");

    function drawLoop() {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawLoop);
    }
    drawLoop();

    const canvasStream = canvas.captureStream(30);
    chunks = [];

    recorder = new MediaRecorder(canvasStream, { mimeType: "video/webm" });

    recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "live.webm";
        a.click();
        URL.revokeObjectURL(url);
    };

    recorder.start();
}

function stopRecording() {
    recording = false;
    liveBadge.style.display = "none";
    recorder.stop();
}

