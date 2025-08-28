import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import { OpenAIAssistant } from "./openai-assistant";
import { setupChromaKey } from "./chromaKey";

const videoElement = document.getElementById("avatarVideo") as HTMLVideoElement;
const startButton = document.getElementById(
  "startSession"
) as HTMLButtonElement;
const endButton = document.getElementById("endSession") as HTMLButtonElement;
const speakButton = document.getElementById("speakButton") as HTMLButtonElement;
const userInput = document.getElementById("userInput") as HTMLInputElement;
const recordButton = document.getElementById(
  "recordButton"
) as HTMLButtonElement;
const recordingStatus = document.getElementById(
  "recordingStatus"
) as HTMLParagraphElement;
const canvasElement = document.getElementById(
  "avatarCanvas"
) as HTMLCanvasElement;
const chromaKeyToggle = document.getElementById(
  "chromaKeyToggle"
) as HTMLInputElement;
const textModeBtn = document.getElementById("textModeBtn") as HTMLButtonElement;
const voiceModeBtn = document.getElementById(
  "voiceModeBtn"
) as HTMLButtonElement;
const textModeControls = document.getElementById(
  "textModeControls"
) as HTMLElement;
const voiceModeControls = document.getElementById(
  "voiceModeControls"
) as HTMLElement;
const voiceStatus = document.getElementById("voiceStatus") as HTMLElement;

let avatar: any = null;
let sessionData: any = null;
let openaiAssistant: OpenAIAssistant | null = null;
let audioRecorder: any = null;
let isRecording = false;
let currentMode: "text" | "voice" = "text";
let stopChromaKeyProcessing: (() => void) | null = null;

async function fetchAccessToken(): Promise<string> {
  const serverBase = import.meta.env.VITE_SERVER_BASE as string | undefined;
  if (serverBase) {
    const r = await fetch(`${serverBase}/api/heygen/streaming/create-token`, {
      method: "POST",
    });
    const j = await r.json();
    return j.data.token as string;
  }
  const apiKey = import.meta.env.VITE_HEYGEN_API_KEY as string;
  const response = await fetch(
    "https://api.heygen.com/v1/streaming.create_token",
    {
      method: "POST",
      headers: { "x-api-key": apiKey },
    }
  );
  const { data } = await response.json();
  return data.token as string;
}

async function initializeAvatarSession() {
  startButton.disabled = true;
  try {
    const token = await fetchAccessToken();
    avatar = new StreamingAvatar({ token });

    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY as string;
    if (openaiApiKey) {
      openaiAssistant = new OpenAIAssistant(openaiApiKey);
      await openaiAssistant.initialize();
    }

    avatar.on(StreamingEvents.STREAM_READY, handleStreamReady);
    avatar.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);
    avatar.on(StreamingEvents.USER_START as any, () => {
      if (voiceStatus) voiceStatus.textContent = "Listening...";
    });
    avatar.on(StreamingEvents.USER_STOP as any, () => {
      if (voiceStatus) voiceStatus.textContent = "Processing...";
    });
    avatar.on(StreamingEvents.AVATAR_START_TALKING as any, () => {
      if (voiceStatus) voiceStatus.textContent = "Avatar is speaking...";
    });
    avatar.on(StreamingEvents.AVATAR_STOP_TALKING as any, () => {
      if (voiceStatus) voiceStatus.textContent = "Waiting for you to speak...";
    });

    sessionData = await avatar.createStartAvatar({
      quality: AvatarQuality.Medium,
      avatarName: "Wayne_20240711",
      language: "en",
      // v3 and above required per deprecation notice
      // @ts-ignore - field name may differ by SDK version
      version: "v3",
    });

    endButton.disabled = false;
  } catch (e) {
    console.error("Failed to initialize avatar session", e);
    startButton.disabled = false;
  }
}

function handleStreamReady(event: any) {
  if (event?.detail && videoElement) {
    videoElement.srcObject = event.detail;
    (videoElement as any).onloadedmetadata = () =>
      videoElement.play().catch(console.error);
    updateChromaKeyState();
    if (voiceModeBtn) voiceModeBtn.disabled = false;
  }
}

function handleStreamDisconnected() {
  if (videoElement) videoElement.srcObject = null;
  startButton.disabled = false;
  endButton.disabled = true;
  if (stopChromaKeyProcessing) {
    stopChromaKeyProcessing();
    stopChromaKeyProcessing = null;
  }
}

async function terminateAvatarSession() {
  if (!avatar || !sessionData) return;
  try {
    await avatar.stopAvatar();
  } catch {}
  if (videoElement) videoElement.srcObject = null;
  if (stopChromaKeyProcessing) {
    stopChromaKeyProcessing();
    stopChromaKeyProcessing = null;
  }
  avatar = null;
  startButton.disabled = false;
  endButton.disabled = true;
}

async function handleSpeak() {
  if (!avatar || !userInput.value) return;
  try {
    if (openaiAssistant) {
      const response = await openaiAssistant.getResponse(userInput.value);
      await avatar.speak({ text: response, taskType: TaskType.REPEAT as any });
    } else {
      await avatar.speak({ text: userInput.value });
    }
  } catch (e) {
    console.error("Error getting response", e);
  } finally {
    userInput.value = "";
  }
}

startButton.addEventListener("click", initializeAvatarSession);
endButton.addEventListener("click", terminateAvatarSession);
speakButton.addEventListener("click", handleSpeak);
recordButton.addEventListener("click", async () => {
  const { AudioRecorder } = await import("./audio-handler");
  if (!audioRecorder) {
    audioRecorder = new AudioRecorder(
      (status: string) => {
        if (recordingStatus) recordingStatus.textContent = status;
      },
      async (text: string) => {
        if (avatar) {
          await avatar.speak({ text });
        }
      }
    );
  }

  if (!isRecording) {
    recordButton.textContent = "Stop Recording";
    await audioRecorder.startRecording();
    isRecording = true;
  } else {
    recordButton.textContent = "Start Recording";
    audioRecorder.stopRecording();
    isRecording = false;
  }
});

async function startVoiceChat() {
  if (!avatar) return;
  try {
    await (avatar as any).startVoiceChat({ useSilencePrompt: false });
    if (voiceStatus) voiceStatus.textContent = "Waiting for you to speak...";
  } catch (e) {
    console.error("Error starting voice chat", e);
    if (voiceStatus) voiceStatus.textContent = "Error starting voice chat";
  }
}

async function switchMode(mode: "text" | "voice") {
  if (currentMode === mode) return;
  currentMode = mode;
  if (mode === "text") {
    textModeBtn?.classList.add("active");
    voiceModeBtn?.classList.remove("active");
    if (textModeControls) textModeControls.style.display = "block";
    if (voiceModeControls) voiceModeControls.style.display = "none";
    try {
      await (avatar as any)?.closeVoiceChat();
    } catch {}
  } else {
    textModeBtn?.classList.remove("active");
    voiceModeBtn?.classList.add("active");
    if (textModeControls) textModeControls.style.display = "none";
    if (voiceModeControls) voiceModeControls.style.display = "block";
    await startVoiceChat();
  }
}

textModeBtn?.addEventListener("click", () => switchMode("text"));
voiceModeBtn?.addEventListener("click", () => switchMode("voice"));

function updateChromaKeyState() {
  if (!videoElement.srcObject) return;
  if (stopChromaKeyProcessing) {
    stopChromaKeyProcessing();
    stopChromaKeyProcessing = null;
  }
  if (chromaKeyToggle?.checked && canvasElement) {
    canvasElement.style.display = "block";
    videoElement.style.display = "none";
    stopChromaKeyProcessing = setupChromaKey(videoElement, canvasElement, {
      minHue: 60,
      maxHue: 180,
      minSaturation: 0.1,
      threshold: 1.0,
    });
  } else {
    videoElement.style.display = "block";
    if (canvasElement) canvasElement.style.display = "none";
  }
}

chromaKeyToggle?.addEventListener("click", updateChromaKeyState);
