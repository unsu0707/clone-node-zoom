const socket = io();

const myFace = document.getElementById("myFace");
const micBtn = document.getElementById("mic");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");
const chat = document.getElementById("chat");
const chatForm = chat.querySelector("form");

call.hidden = true;

let myStream;
let micOn = true;
let cameraOn = true;
let roomName;
let userName;
let myPeerConnection;
let myDataChannel;

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
    } else {
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
  await getMedia(camerasSelect.value);
  if (myPeerConnection) {
    const myVideoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(myVideoTrack);
  }
};

const handleMessageEvent = (event) => {
  addChatHistory(event.data);
};

const addChatHistory = (message) => {
  const ul = chat.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.append(li);
};

const handleChatSubmit = (event) => {
  event.preventDefault();
  chatMessage = chat.querySelector("input").value;
  myDataChannel.send(chatMessage);
  addChatHistory(chatMessage);
};

micBtn.addEventListener("click", handleMicClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);
chatForm.addEventListener("submit", handleChatSubmit);

// Welcome Form (Join a Room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const initCall = async () => {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
};

const handleWelcomeSubmit = async (event) => {
  event.preventDefault();
  const roomNameInput = welcomeForm.querySelector("input#roomName");
  const userNameInput = welcomeForm.querySelector("input#userName");
  await initCall();
  socket.emit("join_room", roomNameInput.value, userNameInput.value);
  roomName = roomNameInput.value;
  roomNameInput.value = "";
};

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Part

socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", handleMessageEvent);
  console.log("Made Data Channel");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("Sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", handleMessageEvent);
  });
  console.log("Received the offer", offer);
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("Sent the Answer");
});

socket.on("answer", (answer) => {
  console.log("Received the answer", answer);
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received ice candidate");
  myPeerConnection.addIceCandidate(ice);
});

// RTC Part

const makeConnection = () => {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
};

const handleIce = (data) => {
  console.log("sent ice candidate");
  socket.emit("ice", data.candidate, roomName);
};

const handleAddStream = (data) => {
  console.log(data.stream);
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
};
