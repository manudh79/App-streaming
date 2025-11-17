/* =============================
   ELEMENTOS
============================= */
const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const liveIcon = document.getElementById("liveIcon");
const commentsBox = document.getElementById("comments");
const viewersNumber = document.getElementById("viewersNumber");

let currentStream = null;
let recordingStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let usingFront = false;

/* =============================
   INICIAR CÁMARA
============================= */
async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    const constraints = {
        video: { facingMode: usingFront ? "user" : "environment" },
        audio: true
    };

    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;

        if (!recordingStream) {
            recordingStream = new MediaStream([
                currentStream.getVideoTracks()[0],
                currentStream.getAudioTracks()[0]
            ]);
        } else {
            const newTrack = currentStream.getVideoTracks()[0];
            const oldTrack = recordingStream.getVideoTracks()[0];

            recordingStream.removeTrack(oldTrack);
            oldTrack.stop();
            recordingStream.addTrack(newTrack);
        }

    } catch (err) {
        console.error("Error cámara:", err);
    }
}

startCamera();

/* =============================
   CAMBIAR CÁMARA SIN PARAR GRABACIÓN
============================= */
camBtn.onclick = async () => {
    usingFront = !usingFront;
    await startCamera();
};

/* =============================
   INICIAR GRABACIÓN
============================= */
function startRecording() {
    recordedChunks = [];

    mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: "video/webm;codecs=vp9"
    });

    mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = saveRecording;

    mediaRecorder.start();

    liveIcon.style.display = "block";
}

/* =============================
   PARAR GRABACIÓN
============================= */
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
    liveIcon.style.display = "none";
}

/* =============================
   GUARDAR VÍDEO
============================= */
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stream.webm";
    a.click();

    URL.revokeObjectURL(url);
}

/* =============================
   BOTÓN REC
============================= */
recBtn.onclick = () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        startRecording();
    } else {
        stopRecording();
    }
};

/* =============================
   COMENTARIOS
============================= */
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

/* =============================
   VIEWERS EVOLUCIÓN
============================= */
let viewers = 51824;

setInterval(() => {
    viewers += Math.floor(Math.random() * 25);
    viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2500);
