// -----------------------------
// VARIABLES PRINCIPALES
// -----------------------------
let stream;
let recorder;
let chunks = [];
let recording = false;

// ELEMENTOS DEL DOM
const video = document.getElementById("video");
const recBtn = document.getElementById("rec-btn");
const camBtn = document.getElementById("cam-btn");
const heartBtn = document.getElementById("heart-btn");
const liveBadge = document.getElementById("live-badge");
const viewersBox = document.getElementById("viewers-count");
const commentsBox = document.getElementById("comments");

// ESTADO DE CÁMARA
let usingFront = true;

// -----------------------------
// INICIAR CÁMARA
// -----------------------------
async function startCamera() {
    try {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: usingFront ? "user" : "environment",
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: true
        });

        video.srcObject = stream;

    } catch (e) {
        alert("Error al abrir la cámara.");
        console.error(e);
    }
}

startCamera();

// -----------------------------
// CAMBIAR CÁMARA
// -----------------------------
camBtn.addEventListener("click", () => {
    usingFront = !usingFront;
    startCamera();
});

// -----------------------------
// INICIAR / DETENER GRABACIÓN
// -----------------------------
recBtn.addEventListener("click", () => {
    if (!recording) startRecording();
    else stopRecording();
});

function startRecording() {
    recording = true;
    chunks = [];

    // Mostrar LIVE STREAMING
    liveBadge.style.display = "block";

    // Crear recorder
    recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9"
    });

    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        // Descargar archivo
        const a = document.createElement("a");
        a.href = url;
        a.download = "live_recording.mp4"; // renombrado a MP4
        a.click();
        URL.revokeObjectURL(url);
    };

    recorder.start();
}

function stopRecording() {
    recording = false;
    recorder.stop();
    liveBadge.style.display = "none";
}

// -----------------------------
// VIEWERS - CRECIMIENTO SUAVE
// -----------------------------
let viewers = 50000;

setInterval(() => {
    viewers = Math.floor(viewers * 1.003);
    viewersBox.innerText = viewers.toLocaleString();
}, 1400);

// -----------------------------
// COMENTARIOS ÁRABES
// -----------------------------
const names = ["رائد","سيف","وليد","علي","سامر","كريم","مروان","فراس","هيثم","فهد"];
const msgs = ["جميل جداً","استمر","عمل رائع","أنت بطل","ممتاز","جيد جداً","أحسنت"];
const emojis = ["👍","🔥"];
const emojiChance = 0.4; // solo 40% de mensajes con emoji

function generateComment() {
    const n = names[Math.floor(Math.random() * names.length)];
    const m = msgs[Math.floor(Math.random() * msgs.length)];

    let emoji = "";
    if (Math.random() < emojiChance) {
        emoji = " " + emojis[Math.floor(Math.random() * emojis.length)];
    }

    return `${n}: ${m}${emoji}`;
}

// Pintar comentarios
setInterval(() => {
    const newComment = document.createElement("div");
    newComment.textContent = generateComment();

    commentsBox.appendChild(newComment);

    // Mantener máximo 5
    if (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }

}, 2200);
