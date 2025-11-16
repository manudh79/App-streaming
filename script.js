/* -------------------- CAMERA -------------------- */

let currentCamera = "environment"; // TRASERA POR DEFECTO

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentCamera },
            audio: false        // SIN SONIDO → SIN ECO
        });

        const video = document.getElementById("video");
        video.srcObject = stream;

        return stream;

    } catch (e) {
        console.error("Error cámara:", e);
        alert("No se pudo acceder a la cámara");
    }
}

startCamera();

/* Cambio de cámara */
document.getElementById("camBtn").addEventListener("click", async () => {
    currentCamera = currentCamera === "environment" ? "user" : "environment";
    startCamera();
});


/* -------------------- VIEWERS -------------------- */

let viewers = 51063;

function updateViewers() {
    viewers += Math.floor(Math.random() * 5);
    document.getElementById("viewersNumber").textContent =
        viewers.toLocaleString("en-US");
}

setInterval(updateViewers, 800);


/* -------------------- COMMENTS -------------------- */

const commentsList = [
    "سامر: أنت بطل 👍",
    "علي: ممتاز",
    "كريم: عمل رائع",
    "مروان: أحسنت",
    "هيثم: رائع 🔥",
    "وليد: ممتاز 👍",
    "رامي: استمر",
    "خالد: أحسنت 👍"
];

function addComment() {
    const box = document.getElementById("comments");
    const comment = document.createElement("div");

    let text = commentsList[Math.floor(Math.random() * commentsList.length)];

    comment.textContent = text;

    box.appendChild(comment);

    if (box.children.length > 6) {
        box.children[0].remove();
    }
}

setInterval(addComment, 1800);


/* -------------------- RECORDING -------------------- */

let rec = false;
let mediaRecorder;
let recordedChunks = [];

document.getElementById("recBtn").addEventListener("click", async () => {

    if (!rec) {
        const stream = document.getElementById("video").srcObject;

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/webm; codecs=vp8"
        });

        recordedChunks = [];

        mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);

        mediaRecorder.onstop = downloadVideo;

        mediaRecorder.start();
        rec = true;
        document.getElementById("liveIcon").style.opacity = "1";

    } else {
        mediaRecorder.stop();
        rec = false;
    }
});


function downloadVideo() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stream.mp4";
    a.click();

    URL.revokeObjectURL(url);
}
