const video = document.getElementById("camera");
const recBtn = document.getElementById("rec-btn");
const liveBadge = document.getElementById("live-badge");
const commentsBox = document.getElementById("comments");
const viewersCount = document.getElementById("viewers-count");

let mediaRecorder;
let chunks = [];
let recording = false;

/* CAMERA FIX */
navigator.mediaDevices.getUserMedia({ video: { facingMode:"user" }, audio: true })
.then(stream => {
    video.srcObject = stream;

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        chunks = [];

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "stream.mp4";
        a.click();
    };
})
.catch(err => {
    alert("Permite acceso a la cámara en Safari.");
});

/* RECORD BUTTON */
recBtn.onclick = () => {
    if (!recording) {
        mediaRecorder.start();
        recording = true;
        liveBadge.style.display = "block";
    } else {
        mediaRecorder.stop();
        recording = false;
        liveBadge.style.display = "none";
    }
};

/* VIEWERS COUNTER */
let viewers = 51000;
setInterval(() => {
    viewers += Math.floor(Math.random() * 8);
    viewersCount.textContent = viewers.toLocaleString("en-US");
}, 1500);

/* ARABIC COMMENTS */
const comments = [
    "سامر: أنت بطل 👍",
    "علي: ممتاز",
    "كريم: عمل رائع",
    "مروان: أحسنت 👍",
    "هيثم: أحسنت 🔥"
];

setInterval(() => {
    const c = document.createElement("div");
    c.textContent = comments[Math.floor(Math.random() * comments.length)];

    commentsBox.appendChild(c);

    if (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}, 2300);
