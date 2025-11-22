/* ============================
   ELEMENTOS
============================ */
const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const liveIcon = document.getElementById("liveIcon");

const commentsBox = document.getElementById("comments");
const viewersNumber = document.getElementById("viewersNumber");

const recordCanvas = document.getElementById("recordCanvas");
const ctx = recordCanvas.getContext("2d");

let currentStream = null;
let usingFront = false;

let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

let videoReady = false;

/* ============================
   INICIAR CÁMARA (AUTODETECCIÓN HD/4K)
============================ */
async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    // Resolutions to try, in order
    const constraintsList = [
        { width: { ideal: 3840 }, height: { ideal: 2160 } }, // 4K
        { width: { ideal: 2560 }, height: { ideal: 1440 } }, // 2K
        { width: { ideal: 1920 }, height: { ideal: 1080 } }, // FullHD
        { width: { ideal: 1280 }, height: { ideal: 720 } },  // HD
        { width: { ideal: 720 }, height: { ideal: 480 } }    // fallback
    ];

    let stream;

    for (let c of constraintsList) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: usingFront ? "user" : "environment",
                    ...c
                },
                audio: true
            });
            break;
        } catch (e) { continue; }
    }

    currentStream = stream;
    video.srcObject = stream;

    video.muted = true;
    video.volume = 0;

    // Esperar a que la cámara dé resolución real
    await waitForVideoMetadata();

    return stream;
}

/* ============================
   ESPERAR RESOLUCIÓN REAL
============================ */
function waitForVideoMetadata() {
    return new Promise(res => {
        if (video.videoWidth > 0) {
            videoReady = true;
            return res();
        }
        video.onloadedmetadata = () => {
            videoReady = true;
            res();
        };
    });
}

startCamera();

/* ============================
   CANVAS DRAW LOOP (MODO A)
============================ */
function drawToCanvas() {
    if (!isRecording || !videoReady) {
        requestAnimationFrame(drawToCanvas);
        return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    recordCanvas.width = vw;
    recordCanvas.height = vh;

    ctx.drawImage(video, 0, 0, vw, vh);

    function drawImageFromDOM(id) {
        const el = document.getElementById(id);
        const r = el.getBoundingClientRect();
        ctx.drawImage(el, r.left, r.top, r.width, r.height);
    }

    // Overlays
    drawImageFromDOM("userIcon");
    drawImageFromDOM("eyeIcon");

    // Viewers text
    let vn = viewersNumber.getBoundingClientRect();
    ctx.font = "19px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(viewersNumber.textContent, vn.left, vn.top + vn.height - 6);

    let vl = document.getElementById("viewersLabel").getBoundingClientRect();
    ctx.font = "17px Arial";
    ctx.fillText("viewers", vl.left, vl.top + vl.height - 6);

    // Live icon
    if (isRecording) {
        drawImageFromDOM("liveIcon");
    }

    // Comentarios
    const comments = Array.from(commentsBox.children);
    ctx.font = "26px Arial";
    ctx.fillStyle = "white";

    comments.forEach(c => {
        const r = c.getBoundingClientRect();
        ctx.fillText(c.textContent, r.left, r.top + 26);
    });

    // Iconos inferiores
    ["recBtn", "camBtn", "heartBtn"].forEach(id => {
        drawImageFromDOM(id);
    });

    requestAnimationFrame(drawToCanvas);
}

/* ============================
   INICIAR GRABACIÓN
============================ */
function startRecording() {
    isRecording = true;

    liveIcon.style.display = "block";
    liveIcon.classList.add("blink");

    recordedChunks = [];

    const canvasStream = recordCanvas.captureStream(30);
    const audioTrack = currentStream.getAudioTracks()[0];
    canvasStream.addTrack(audioTrack);

    mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: "video/webm;codecs=vp9"
    });

    mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
    mediaRecorder.onstop = saveRecording;

    mediaRecorder.start();

    drawToCanvas();
}

/* ============================
   DETENER
============================ */
function stopRecording() {
    isRecording = false;
    liveIcon.style.display = "none";
    liveIcon.classList.remove("blink");
    mediaRecorder.stop();
}

/* ============================
   GUARDAR WEBM
============================ */
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stream_recording.webm";
    a.click();
}

/* ============================
   BOTÓN REC
============================ */
recBtn.onclick = () => {
    if (!isRecording) startRecording();
    else stopRecording();
};

/* ============================
   CAMBIO DE CÁMARA SIN CORTAR
============================ */
camBtn.onclick = async () => {
    usingFront = !usingFront;
    await startCamera();
};

/* ============================
   COMENTARIOS ÁRABES
============================ */
const names = ["علي","رائد","سيف","مروان","كريم","هيثم"];
const texts = ["استمر", "أبدعت", "عمل رائع", "جميل", "ممتاز"];
const emojis = ["🔥","👍"];

function addComment() {
    const name = names[Math.floor(Math.random()*names.length)];
    const msg = texts[Math.floor(Math.random()*texts.length)];
    const emoji = Math.random() < 0.4 ? emojis[Math.floor(Math.random()*2)] : "";

    const div = document.createElement("div");
    div.className = "comment";
    div.textContent = `${name}: ${msg} ${emoji}`;
    commentsBox.appendChild(div);

    if (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}
setInterval(addComment, 2200);

/* ============================
   VIEWERS
============================ */
let views = 51824;
setInterval(() => {
    views += Math.floor(Math.random() * 25);
    viewersNumber.textContent = views.toLocaleString("en-US");
}, 2500);
