/* ===== SETUP DE CÁMARA ===== */
const video = document.getElementById("video");
let usingFront = false;
let mediaRecorder;
let recordedChunks = [];
let recording = false;

async function startCamera() {
    const constraints = {
        audio: false,  // evita eco completo
        video: {
            facingMode: usingFront ? "user" : "environment"
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        window.currentStream = stream;
    } catch (err) {
        console.error("Error cámara:", err);
    }
}

startCamera();

/* ===== SWITCH CAMERA ===== */
document.getElementById("camBtn").onclick = () => {
    usingFront = !usingFront;
    startCamera();
};

/* ===== LIVE STREAMING ===== */
const liveIcon = document.getElementById("liveIcon");

function startLive() {
    liveIcon.style.display = "block";
    liveIcon.style.animation = "blink 1s infinite";
}

function stopLive() {
    liveIcon.style.display = "none";
    liveIcon.style.animation = "none";
}

/* ===== ANIMACIÓN PARPADEO ===== */
const style = document.createElement("style");
style.innerHTML = `
@keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
}`;
document.head.appendChild(style);

/* ===== GRABAR ===== */
document.getElementById("recBtn").onclick = async () => {
    if (!recording) {
        recordedChunks = [];
        const stream = video.srcObject;

        mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

        mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: "video/mp4" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "stream.mp4";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            stopLive();
        };

        mediaRecorder.start();
        recording = true;
        startLive();
    } else {
        mediaRecorder.stop();
        recording = false;
    }
};

/* ===== COMENTARIOS ===== */
const commentsBox = document.getElementById("comments");

const authors = ["علي", "سيف", "مروان", "كريم", "هيثم", "رائد"];
const messages = [
    "استمر", "عمل رائع", "أحسنت", "ممتاز", "جميل جدا"
];

function randomEmoji() {
    return Math.random() < 0.4
        ? (Math.random() < 0.5 ? "🔥" : "👍")
        : "";
}

function addComment() {
    const author = authors[Math.floor(Math.random() * authors.length)];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    const emoji = randomEmoji();

    const line = document.createElement("div");
    line.textContent = `${author}: ${msg} ${emoji}`;
    commentsBox.appendChild(line);

    if (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}

setInterval(addComment, 2200);

/* ===== VIEWERS ===== */
const viewersNumber = document.getElementById("viewersNumber");
let viewers = 51824;

setInterval(() => {
    viewers += Math.floor(Math.random() * 30);
    viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2500);
