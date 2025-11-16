/****************************************
 * CÁMARA
 ****************************************/
const video = document.getElementById("video");
const recBtn = document.getElementById("rec-btn");
const camBtn = document.getElementById("cam-btn");
const liveBadge = document.getElementById("live-badge");

let stream;
let recorder;
let chunks = [];
let usingFront = true;

/* INICIAR CÁMARA */
async function startCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
    }

    stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: usingFront ? "user" : "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false   // SIN ECO
    });

    video.srcObject = stream;
}

startCamera();

/* CAMBIAR CÁMARA */
camBtn.onclick = () => {
    usingFront = !usingFront;
    startCamera();
};

/****************************************
 * GRABACIÓN + EXPORTACIÓN MP4
 ****************************************/
recBtn.onclick = () => {
    if (!recorder) startRecording();
    else stopRecording();
};

function startRecording() {
    chunks = [];

    recorder = new MediaRecorder(stream, {
        mimeType: "video/webm"
    });

    recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "stream_recording.webm";
        a.click();

        URL.revokeObjectURL(url);
        recorder = null;
    };

    recorder.start();
    liveBadge.style.display = "block"; // muestra LIVE
}

function stopRecording() {
    recorder.stop();
    liveBadge.style.display = "none"; // oculta LIVE
}

/****************************************
 * VIEWERS SUBIENDO
 ****************************************/
let viewers = 50000;
setInterval(() => {
    viewers = Math.floor(viewers * 1.004);
    document.getElementById("viewers-count").textContent =
        viewers.toLocaleString() + " viewers";
}, 2000);

/****************************************
 * COMENTARIOS ÁRABES
 ****************************************/
const commentsBox = document.getElementById("comments");

const names = ["علي", "سيف", "وليد", "فهد", "كريم", "راشد", "مراد"];
const msgs = [
    "جميل جداً 👍",
    "استمر 👍",
    "عمل رائع 👍",
    "🔥🔥 استمر",
    "ممتاز جداً 👍"
];

function addComment() {
    const name = names[Math.floor(Math.random() * names.length)];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    const full = `${name}: ${msg}`;

    const div = document.createElement("div");
    div.textContent = full;

    commentsBox.appendChild(div);

    // máx 5 comentarios
    if (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}

setInterval(addComment, 2300);
