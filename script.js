/* ELEMENTOS */
const video = document.getElementById("video");
const liveBadge = document.getElementById("live-badge");
const viewersText = document.getElementById("viewer-number");
const commentsBox = document.getElementById("comments");

/* Grabación */
let recorder;
let chunks = [];

/* Cámara */
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true
    });

    video.srcObject = stream;
}
startCamera();

/* VIEWERS SUBIENDO PROGRESIVO */
let viewers = 50757;
setInterval(() => {
    viewers += Math.floor(Math.random() * 30 + 10);
    viewersText.textContent = viewers.toLocaleString();
}, 1200);

/* LISTA DE NOMBRES + COMENTARIOS ÁRABES */
const arabNames = ["سيف", "كريم", "علي", "مروان", "سارة", "وليد", "نور", "رائد"];
const arabMsgs = [
    "استمر 👍",
    "جميل جداً 👍",
    "🔥 استمر 🔥",
    "أنت بطل 👍",
    "عمل رائع 👍",
    "أداء ممتاز 👍",
    "ممتاز جداً 👍"
];

/* COMENTARIOS AUTOMÁTICOS (solo árabe) */
function addComment() {
    const name = arabNames[Math.floor(Math.random() * arabNames.length)];
    const msg = arabMsgs[Math.floor(Math.random() * arabMsgs.length)];

    const div = document.createElement("div");
    div.textContent = `${name}: ${msg}`;

    commentsBox.appendChild(div);

    while (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}

setInterval(addComment, 1700);

/* GRABACIÓN — INCLUYENDO OVERLAYS */
document.getElementById("rec-btn").addEventListener("click", () => {
    if (!recorder) startRecording();
    else stopRecording();
});

async function startRecording() {
    liveBadge.style.display = "block";

    const stream = video.captureStream(30);
    recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);

    recorder.onstop = exportRecording;

    recorder.start();
}

function stopRecording() {
    liveBadge.style.display = "none";
    recorder.stop();
}

function exportRecording() {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "recording.mp4";
    a.click();

    URL.revokeObjectURL(url);
    recorder = null;
}
