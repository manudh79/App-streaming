let video = document.getElementById("video");
let recBtn = document.getElementById("recBtn");
let camBtn = document.getElementById("camBtn");
let liveContainer = document.getElementById("liveContainer");
let commentsBox = document.getElementById("comments");

let currentStream;
let usingFrontCamera = false;
let mediaRecorder;
let chunks = [];

/* ==========================
   INICIAR CÁMARA TRASERA
========================== */
async function startCamera() {

    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: usingFrontCamera ? "user" : "environment" },
        audio: false
    });

    video.srcObject = currentStream;
}

startCamera();

/* Cambiar cámara */
camBtn.addEventListener("click", () => {
    usingFrontCamera = !usingFrontCamera;
    startCamera();
});

/* ==========================
      GRABACIÓN
========================== */
recBtn.addEventListener("click", () => {

    if (!mediaRecorder || mediaRecorder.state === "inactive") {

        liveContainer.style.display = "block";

        mediaRecorder = new MediaRecorder(currentStream, { mimeType: "video/webm" });
        chunks = [];

        mediaRecorder.ondataavailable = e => chunks.push(e.data);

        mediaRecorder.onstop = () => {
            liveContainer.style.display = "none";

            const blob = new Blob(chunks, { type: "video/mp4" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "stream.mp4";
            a.click();
        };

        mediaRecorder.start();
    } else {
        mediaRecorder.stop();
    }
});

/* ==========================
      COMENTARIOS
========================== */

// nombres árabes
const names = ["رائد","علي","كريم","مروان","هيثم","سيف"];

// comentarios base
const texts = ["جميل", "عمل رائع", "ممتاز", "استمر", "أحسنت"];

// emojis (solo 40% de uso)
const emojis = ["🔥", "👍"];

function addComment() {

    const name = names[Math.floor(Math.random() * names.length)];
    const text = texts[Math.floor(Math.random() * texts.length)];

    let line = `${name}: ${text}`;

    // solo 40% de probabilidad de añadir un emoji
    if (Math.random() < 0.40) {
        line += " " + emojis[Math.floor(Math.random() * emojis.length)];
    }

    const el = document.createElement("div");
    el.className = "comment";
    el.textContent = line;

    commentsBox.prepend(el);

    if (commentsBox.children.length > 6) {
        commentsBox.removeChild(commentsBox.lastChild);
    }
}

setInterval(addComment, 2000);
