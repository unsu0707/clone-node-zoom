const socket = io();

const myFace = document.getElementById("myFace");
const micBtn = document.getElementById("mic");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let micOn = true;
let cameraOn = true;
let roomName;
let myPeerConnection;

const getCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const currentCamera = myStream.getVideoTracks()[0];
    const cameras = devices.filter((device) => device.kind === "videoinput");
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      camerasSelect.append(option);
    });
    const option = document.createElement("option");
    option.value = "dummy";
    option.innerText = "null";
    camerasSelect.append(option);
    myFace.srcObject = myStream;
  } catch (e) {
    console.log(e);
  }
};
const getMedia = async (deviceId = null) => {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    console.log(myStream.getVideoTracks());
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
};

const handleMicClick = () => {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (micOn) {
    micOn = false;
    micBtn.innerText = "Unmute";
  } else {
    micOn = true;
    micBtn.innerText = "Mute";
  }
};
const handleCameraClick = () => {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOn) {
    cameraOn = false;
    cameraBtn.innerText = "Camera On";
  } else {
    cameraOn = true;
    cameraBtn.innerText = "Camera Off";
  }
};

const handleCameraChange = async () => {
  console.log(camerasSelect.value);
  await getMedia(camerasSelect.value);
};

micBtn.addEventListener("click", handleMicClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// Welcome Form (Join a Room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const startMedia = async () => {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
};

const handleWelcomeSubmit = (event) => {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  socket.emit("join_room", input.value, startMedia);
  roomName = input.value;
  input.value = "";
};

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Part

socket.on("welcome", () => {
  console.log("Somebody joined");
});

// RTC Part

const makeConnection = () => {
  myPeerConnection = new RTCPeerConnection();
  console.log(myStream.getTracks());
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
};
