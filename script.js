/* ELEMENTOS */
const video = document.getElementById("video");
const canvas = document.getElementById("recordCanvas");
const ctx = canvas.getContext("2d");

const recButton = document.getElementById("recButton");
const switchCam = document.getElementById("switchCam");
const likeButton = document.getElementById("likeButton");
const liveBadge = document.getElementById("liveBadge");

let currentCam = "environment";
let isRecording = false;
let recorder;
let chunks = [];
let stream;

/* COMENTARIOS */
const commentsBox = document.getElementById("comments");
const sampleComments = [
    "رائد: استمر", "سيف: أحسنت", "علي: ممتاز", "كريم: عمل رائع",
    "يوسف: استمر", "مروان: ممتاز", "هيثم: جميل جدا"
];
const emojis = ["🔥", "👍"];

/* INICIAR CÁMARA */
async function startCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());

    stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentCam },
        audio: true
    });

    video.srcObject = stream;

    /* Si estamos grabando, actualizar la pista de vídeo sin parar el recorder */
    if (isRecording && recorder && recorder.state === "recording") {
        const newTrack = stream.getVideoTracks()[0];
        const sender = recorder.stream.getVideoTracks()[0];

        recorder.stream.removeTrack(sender);
        recorder.stream.addTrack(newTrack);
    }
}

startCamera();

/* AÑADIR COMENTARIOS AUTOMÁTICOS */
setInterval(() => {
    const base = sampleComments[Math.floor(Math.random()*sampleComments.length)];
    const emoji = Math.random() < 0.4 ? emojis[Math.floor(Math.random()*emojis.length)] : "";
    const final = `${base} ${emoji}`.trim();

    const div = document.createElement("div");
    div.textContent = final;
    commentsBox.appendChild(div);

    if (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}, 1500);

/* DIBUJAR FRAME EN CANVAS */
function drawFrame() {
    if (!isRecording) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const scale = canvas.width / window.innerWidth;

    function icon(id, x, y, w) {
        const img = document.getElementById(id);
        if (!img.complete) return;
        ctx.drawImage(img, x * scale, y * scale, w * scale, w * scale);
    }

    /* USER ICON */
    icon("userIcon", 6, 6, 58);

    ctx.fillStyle = "white";
    ctx.font = `${19 * scale}px Arial`;
    ctx.fillText("KALAL_Y", 72 * scale, 35 * scale);

    icon("eyeIcon", 72, 48, 28);
    ctx.font = `${17 * scale}px Arial`;
    ctx.fillText(document.getElementById("viewersCount").innerText,
        106 * scale, 68 * scale);

    if (isRecording) {
        ctx.fillStyle = "#d22";
        ctx.fillRect(canvas.width - (160 * scale), 6 * scale, 150 * scale, 40 * scale);
        ctx.fillStyle = "white";
        ctx.font = `${18 * scale}px Arial`;
        ctx.fillText("LIVE STREAMING",
            canvas.width - (150 * scale),
            33 * scale
        );
    }

    requestAnimationFrame(drawFrame);
}

/* GRABAR */
recButton.onclick = () => {
    if (!isRecording) {
        chunks = [];
        recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = exportVideo;

        recorder.start();
        isRecording = true;

        liveBadge.style.opacity = 1;
        liveBadge.classList.add("blink");

        drawFrame();
    } else {
        isRecording = false;

        liveBadge.style.opacity = 0;
        liveBadge.classList.remove("blink");

        recorder.stop();
    }
};

/* EXPORTAR */
function exportVideo() {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stream.webm";
    a.click();
}

/* CAMBIAR CÁMARA SIN CORTAR GRABACIÓN */
switchCam.onclick = () => {
    currentCam = currentCam === "environment" ? "user" : "environment";
    startCamera();
};
