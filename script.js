/* CAMERA */

let currentCamera = "environment"; // TRASERA POR DEFECTO
let currentStream = null;

async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentCamera },
        audio: false
    });

    document.getElementById("video").srcObject = currentStream;
}

startCamera();

/* CHANGE CAMERA */

document.getElementById("camBtn").onclick = () => {
    currentCamera = currentCamera === "environment" ? "user" : "environment";
    startCamera();
};

/* VIEWERS */

let viewers = 50000;
setInterval(() => {
    viewers += Math.floor(Math.random() * 6);
    document.getElementById("viewersNumber").textContent =
        viewers.toLocaleString("en-US");
}, 1200);

/* COMMENTS */

const commentsList = [
    "سامر: أنت بطل 👍",
    "علي: ممتاز",
    "كريم: عمل رائع",
    "مروان: أحسنت",
    "هيثم: رائع 🔥"
];

setInterval(() => {
    const box = document.getElementById("comments");
    const c = document.createElement("div");
    c.textContent = commentsList[Math.floor(Math.random() * commentsList.length)];
    box.appendChild(c);
    if (box.children.length > 6) box.children[0].remove();
}, 1700);

/* RECORDING */

let rec = false;
let mediaRecorder;
let chunks = [];

document.getElementById("recBtn").onclick = () => {
    const live = document.getElementById("liveContainer");

    if (!rec) {
        mediaRecorder = new MediaRecorder(currentStream, {
            mimeType: "video/webm; codecs=vp8"
        });

        chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = downloadVideo;

        mediaRecorder.start();
        rec = true;
        live.style.display = "block";

    } else {
        mediaRecorder.stop();
        rec = false;
        live.style.display = "none";
    }
};

function downloadVideo() {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stream.mp4";
    a.click();

    URL.revokeObjectURL(url);
}
