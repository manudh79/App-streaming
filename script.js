// -----------------------------
// VARIABLES GLOBALES
// -----------------------------
let stream;
let mediaRecorder;
let recordedChunks = [];
let recording = false;
let usingFrontCamera = false;

// Elementos
const video = document.getElementById("video");
const recButton = document.getElementById("rec-btn");
const camButton = document.getElementById("cam-btn");
const liveLabel = document.getElementById("live-label");
const commentsContainer = document.getElementById("comments");
const viewersText = document.getElementById("viewers-count");

// -----------------------------
// INICIAR CÁMARA (TRASERA POR DEFECTO)
// -----------------------------
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: true
        });

        video.srcObject = stream;
    } catch (err) {
        console.error("Error accediendo a la cámara:", err);
    }
}

// -----------------------------
// CAMBIAR DE CÁMARA SIN DETENER LA GRABACIÓN
// -----------------------------
async function switchCamera() {
    usingFrontCamera = !usingFrontCamera;

    const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: usingFrontCamera ? "user" : "environment" },
        audio: true
    });

    const newVideoTrack = newStream.getVideoTracks()[0];

    // Si estamos grabando, sustituimos solo el track sin parar el recorder
    if (mediaRecorder && mediaRecorder.state === "recording") {
        const oldTrack = stream.getVideoTracks()[0];
        stream.removeTrack(oldTrack);
        stream.addTrack(newVideoTrack);
        video.srcObject = stream;
    } else {
        // Si NO se está grabando, reemplaza todo el stream
        stream.getTracks().forEach(t => t.stop());
        stream = newStream;
        video.srcObject = stream;
    }
}

// -----------------------------
// INICIAR / PARAR GRABACIÓN
// -----------------------------
recButton.addEventListener("click", () => {
    if (!recording) {
        startRecording();
    } else {
        stopRecording();
    }
});

function startRecording() {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus"
    });

    mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
    mediaRecorder.start();

    recording = true;
    recButton.classList.add("recording");

    // Activar LIVE STREAMING parpadeando
    liveLabel.style.display = "block";
    liveLabel.classList.add("blinking");
}

function stopRecording() {
    recording = false;
    mediaRecorder.stop();
    recButton.classList.remove("recording");

    // Ocultar live streaming
    liveLabel.style.display = "none";
    liveLabel.classList.remove("blinking");

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "grabacion.webm";
        a.click();

        URL.revokeObjectURL(url);
    };
}

// -----------------------------
// GENERADOR AUTOMÁTICO DE COMENTARIOS
// -----------------------------
const arabicNames = ["سيف", "هيثم", "كريم", "مراد", "علي", "رائد"];
const arabicMsgs = ["استمر", "عمل رائع", "جميل جدا", "أحسنت", "ممتاز"];

function randomComment() {
    const name = arabicNames[Math.floor(Math.random() * arabicNames.length)];
    const msg = arabicMsgs[Math.floor(Math.random() * arabicMsgs.length)];
    const emoji = Math.random() < 0.35 ? (Math.random() < 0.5 ? "🔥" : "👍") : "";

    return `${name}: ${msg} ${emoji}`;
}

setInterval(() => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerText = randomComment();

    commentsContainer.appendChild(div);

    // Mantener solo los últimos 6 comentarios
    if (commentsContainer.children.length > 6) {
        commentsContainer.removeChild(commentsContainer.firstChild);
    }
}, 2000);

// -----------------------------
// VIEWERS RANDOM SUAVE
// -----------------------------
let viewers = 51928;

function updateViewers() {
    const change = Math.floor(Math.random() * 10);
    viewers += Math.random() < 0.5 ? -change : change;
    if (viewers < 50000) viewers = 50000;

    viewersText.textContent = viewers.toLocaleString("en-US");
}

setInterval(updateViewers, 1200);

// -----------------------------
// BOTÓN DE CAMBIO DE CÁMARA
// -----------------------------
camButton.addEventListener("click", switchCamera);

// -----------------------------
// INICIAR TODO
// -----------------------------
startCamera();
