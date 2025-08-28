"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Script from "next/script";

type LivekitRoom = any; // Loaded from UMD on window
type LivekitClientNamespace = any;

export default function InteractivoPage() {
  const [avatarId, setAvatarId] = useState<string>("");
  const [voiceId, setVoiceId] = useState<string>("");
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [mode, setMode] = useState<"api" | "sdk">("api");
  const [apiStreamReady, setApiStreamReady] = useState<boolean>(false);
  const [apiIsSpeaking, setApiIsSpeaking] = useState<boolean>(false);

  // SDK demo state
  const [sdkAvatarId, setSdkAvatarId] = useState<string>("");
  const [sdkVoiceId, setSdkVoiceId] = useState<string>("");
  const [sdkStatusLines, setSdkStatusLines] = useState<string[]>([]);
  const [sdkStarting, setSdkStarting] = useState<boolean>(false);
  const [sdkConnected, setSdkConnected] = useState<boolean>(false);
  const [sdkIsSpeaking, setSdkIsSpeaking] = useState<boolean>(false);
  const [sdkStreamReady, setSdkStreamReady] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sdkVideoRef = useRef<HTMLVideoElement | null>(null);

  // Runtime objects
  const sessionInfoRef = useRef<any>(null);
  const roomRef = useRef<LivekitRoom | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const keepAliveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // SDK refs
  const sdkRoomRef = useRef<LivekitRoom | null>(null);
  const sdkMediaStreamRef = useRef<MediaStream | null>(null);
  const sdkSessionInfoRef = useRef<any>(null);
  const sdkSessionTokenRef = useRef<string | null>(null);
  const sdkKeepAliveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sdkClientRef = useRef<any>(null);

  const serverUrl = "https://api.heygen.com"; // HeyGen endpoint remains

  const log = useCallback((message: string) => {
    setStatusLines((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  }, []);

  const sdkLog = useCallback((message: string) => {
    setSdkStatusLines((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  }, []);

  const getLK = useCallback((): LivekitClientNamespace => {
    const w = globalThis as any;
    if (!w || !w.LivekitClient) throw new Error("LivekitClient not loaded yet");
    return w.LivekitClient;
  }, []);

  const getSessionToken = useCallback(async () => {
    const resp = await fetch(`/api/heygen/streaming/create-token`, {
      method: "POST",
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(
        `No se pudo crear el token (server): ${resp.status} ${t}`
      );
    }
    const data = await resp.json();
    sessionTokenRef.current = data?.data?.token as string;
    log("Token de sesión obtenido");
  }, [log]);

  const getSdkSessionToken = useCallback(async () => {
    const resp = await fetch(`/api/heygen/streaming/create-token`, {
      method: "POST",
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(
        `No se pudo crear el token (server): ${resp.status} ${t}`
      );
    }
    const data = await resp.json();
    sdkSessionTokenRef.current = data?.data?.token as string;
    sdkLog("Token de sesión obtenido (SDK)");
  }, [sdkLog]);

  const connectWebSocket = useCallback(
    async (sessionId: string) => {
      const token = sessionTokenRef.current;
      if (!token) throw new Error("Falta session token");
      const params = new URLSearchParams({
        session_id: sessionId,
        session_token: token,
        silence_response: String(false),
        opening_text: "Hola, soy ReplicadosIA. ¿En qué te ayudo?",
        stt_language: "en",
      });
      const wsUrl = `wss://${
        new URL(serverUrl).hostname
      }/v1/ws/streaming.chat?${params}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.addEventListener("open", () => log("WebSocket conectado"));
      ws.addEventListener("close", () => log("WebSocket cerrado"));
      ws.addEventListener("error", () => log("Error en WebSocket"));
      ws.addEventListener("message", (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          // eslint-disable-next-line no-console
          console.log("WS", payload);
          const evtType = payload?.type || payload?.event_type;
          if (
            evtType === "avatar.speak_started" ||
            evtType === "agent.speak_started" ||
            evtType === "speak_started"
          ) {
            setApiIsSpeaking(true);
          }
          if (
            evtType === "avatar.speak_ended" ||
            evtType === "agent.speak_ended" ||
            evtType === "speak_ended" ||
            evtType === "avatar.speak_interrupted" ||
            evtType === "agent.speak_interrupted"
          ) {
            setApiIsSpeaking(false);
          }
        } catch {}
      });
    },
    [log]
  );

  const createNewSession = useCallback(async () => {
    if (!sessionTokenRef.current) {
      await getSessionToken();
    }
    const body: any = {
      quality: "high",
      avatar_name: avatarId || undefined,
      voice: voiceId ? { voice_id: voiceId, rate: 1.0 } : undefined,
      version: "v3",
      video_encoding: "H264",
      activity_idle_timeout: 180, // 3 minutes (recommendation)
    };
    const resp = await fetch(`${serverUrl}/v1/streaming.new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionTokenRef.current}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`No se pudo crear la sesión: ${resp.status} ${t}`);
    }
    const data = await resp.json();
    sessionInfoRef.current = data.data;

    const LK = getLK();
    const room: LivekitRoom = new LK.Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: LK.VideoPresets.h720.resolution },
    });
    roomRef.current = room;

    room.on(LK.RoomEvent.DataReceived, (message: any) => {
      try {
        const txt = new TextDecoder().decode(message);
        // eslint-disable-next-line no-console
        console.log("Room message", JSON.parse(txt));
      } catch {}
    });

    const mediaStream = new MediaStream();
    mediaStreamRef.current = mediaStream;
    room.on(LK.RoomEvent.TrackSubscribed, (track: any) => {
      if (track.kind === "video" || track.kind === "audio") {
        mediaStream.addTrack(track.mediaStreamTrack);
        if (
          mediaStream.getVideoTracks().length > 0 &&
          mediaStream.getAudioTracks().length > 0 &&
          videoRef.current
        ) {
          videoRef.current.srcObject = mediaStream;
          log("Stream de medios listo");
          setApiStreamReady(true);
        }
      }
    });
    room.on(LK.RoomEvent.TrackUnsubscribed, (track: any) => {
      const mediaTrack = track.mediaStreamTrack;
      if (mediaTrack) mediaStream.removeTrack(mediaTrack);
    });
    room.on(LK.RoomEvent.Disconnected, (reason: string) => {
      log(`Sala desconectada: ${reason}`);
      setApiStreamReady(false);
      setApiIsSpeaking(false);
    });

    await room.prepareConnection(
      sessionInfoRef.current.url,
      sessionInfoRef.current.access_token
    );
    log("Conexión preparada");
    await connectWebSocket(sessionInfoRef.current.session_id);
    log("Sesión creada correctamente");
  }, [avatarId, voiceId, getSessionToken, connectWebSocket, getLK, log]);

  const startStreamingSession = useCallback(async () => {
    const resp = await fetch(`${serverUrl}/v1/streaming.start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionTokenRef.current}`,
      },
      body: JSON.stringify({ session_id: sessionInfoRef.current.session_id }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`No se pudo iniciar streaming: ${resp.status} ${t}`);
    }
    const LK = getLK();
    await roomRef.current?.connect(
      sessionInfoRef.current.url,
      sessionInfoRef.current.access_token
    );
    setIsConnected(true);
    log("Conectado a la sala");

    // Start periodic keep-alive slightly below idle timeout
    if (keepAliveTimerRef.current)
      clearInterval(keepAliveTimerRef.current as any);
    keepAliveTimerRef.current = setInterval(async () => {
      try {
        await fetch(`${serverUrl}/v1/streaming.keep_alive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionTokenRef.current}`,
          },
          body: JSON.stringify({
            session_id: sessionInfoRef.current.session_id,
          }),
        });
        log("keep_alive sent");
      } catch {}
    }, 120000); // every 2 min
  }, [getLK, log]);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    try {
      await createNewSession();
      await startStreamingSession();
    } catch (e: any) {
      log(e?.message || String(e));
    } finally {
      setIsStarting(false);
    }
  }, [createNewSession, startStreamingSession, log]);

  const sendText = useCallback(
    async (text: string, taskType: "talk" | "repeat" = "talk") => {
      if (!sessionInfoRef.current) {
        log("No hay sesión activa");
        return;
      }
      const resp = await fetch(`${serverUrl}/v1/streaming.task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionTokenRef.current}`,
        },
        body: JSON.stringify({
          session_id: sessionInfoRef.current.session_id,
          text,
          task_type: taskType,
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        log(`No se pudo enviar tarea: ${resp.status} ${t}`);
        return;
      }
      log(`Texto enviado (${taskType}): ${text}`);
    },
    [log]
  );

  const handleClose = useCallback(async () => {
    if (!sessionInfoRef.current) {
      log("No hay sesión activa");
      return;
    }
    try {
      await fetch(`${serverUrl}/v1/streaming.stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionTokenRef.current}`,
        },
        body: JSON.stringify({ session_id: sessionInfoRef.current.session_id }),
      });
    } catch {}

    try {
      wsRef.current?.close();
    } catch {}
    try {
      roomRef.current?.disconnect();
    } catch {}

    if (videoRef.current) videoRef.current.srcObject = null;
    sessionInfoRef.current = null;
    roomRef.current = null;
    mediaStreamRef.current = null;
    sessionTokenRef.current = null;
    if (keepAliveTimerRef.current)
      clearInterval(keepAliveTimerRef.current as any);
    keepAliveTimerRef.current = null;
    setIsConnected(false);
    setApiStreamReady(false);
    setApiIsSpeaking(false);
    log("Sesión cerrada");
  }, [log]);

  // ===== SDK DEMO =====
  const sdkStart = useCallback(async () => {
    setSdkStarting(true);
    try {
      if (!sdkSessionTokenRef.current) await getSdkSessionToken();
      const { StreamingAvatar, StreamingEvents }: any = await import(
        "@heygen/streaming-avatar"
      );
      const avatarClient: any = new StreamingAvatar({
        token: sdkSessionTokenRef.current,
      });
      sdkClientRef.current = avatarClient;
      try {
        const E: any = StreamingEvents || {};
        avatarClient.on?.(
          E.AVATAR_START_TALKING || "AVATAR_START_TALKING",
          () => {
            setSdkIsSpeaking(true);
            sdkLog("Avatar start talking");
          }
        );
        avatarClient.on?.(
          E.AVATAR_STOP_TALKING || "AVATAR_STOP_TALKING",
          () => {
            setSdkIsSpeaking(false);
            sdkLog("Avatar stop talking");
          }
        );
        avatarClient.on?.(E.STREAM_READY || "STREAM_READY", () => {
          setSdkStreamReady(true);
          sdkLog("Stream ready");
        });
        avatarClient.on?.(
          E.STREAM_DISCONNECTED || "STREAM_DISCONNECTED",
          () => {
            setSdkStreamReady(false);
            sdkLog("Stream disconnected");
          }
        );
      } catch {}
      const sessionData = await avatarClient.createStartAvatar({
        avatarName: sdkAvatarId || undefined,
        quality: "high",
        version: "v3",
        videoEncoding: "H264",
        voice: sdkVoiceId ? { voice_id: sdkVoiceId, rate: 1.0 } : undefined,
        activityIdleTimeout: 180,
      });
      sdkSessionInfoRef.current = sessionData;
      sdkLog(`Session started: ${sessionData.session_id}`);

      const LK = getLK();
      const room: any = new LK.Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: LK.VideoPresets.h720.resolution },
      });
      sdkRoomRef.current = room;

      sdkMediaStreamRef.current = new MediaStream();
      room.on(LK.RoomEvent.TrackSubscribed, (track: any) => {
        if (track.kind === "video" || track.kind === "audio") {
          sdkMediaStreamRef.current!.addTrack(track.mediaStreamTrack);
          if (
            sdkMediaStreamRef.current!.getVideoTracks().length > 0 &&
            sdkMediaStreamRef.current!.getAudioTracks().length > 0 &&
            sdkVideoRef.current
          ) {
            sdkVideoRef.current.srcObject = sdkMediaStreamRef.current!;
            sdkLog("Media stream ready");
          }
        }
      });
      room.on(LK.RoomEvent.Disconnected, (reason: string) =>
        sdkLog(`Room disconnected: ${reason}`)
      );

      await room.prepareConnection(sessionData.url, sessionData.access_token);
      await room.connect(sessionData.url, sessionData.access_token);
      setSdkConnected(true);
      sdkLog("Connected to room");

      if (sdkKeepAliveTimerRef.current)
        clearInterval(sdkKeepAliveTimerRef.current as any);
      sdkKeepAliveTimerRef.current = setInterval(async () => {
        try {
          await fetch(`${serverUrl}/v1/streaming.keep_alive`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sdkSessionTokenRef.current}`,
            },
            body: JSON.stringify({
              session_id: sdkSessionInfoRef.current.session_id,
            }),
          });
          sdkLog("keep_alive sent");
        } catch {}
      }, 120000);
    } catch (e: any) {
      sdkLog(e?.message || String(e));
    } finally {
      setSdkStarting(false);
    }
  }, [getSdkSessionToken, getLK, sdkAvatarId, sdkVoiceId, sdkLog]);

  const sdkSpeak = useCallback(
    async (text: string, taskType: "talk" | "repeat" = "talk") => {
      if (!sdkSessionInfoRef.current) return;
      try {
        await fetch(`${serverUrl}/v1/streaming.task`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sdkSessionTokenRef.current}`,
          },
          body: JSON.stringify({
            session_id: sdkSessionInfoRef.current.session_id,
            text,
            task_type: taskType,
          }),
        });
        sdkLog(`Sent text (${taskType}): ${text}`);
      } catch (e: any) {
        sdkLog(e?.message || String(e));
      }
    },
    [sdkLog]
  );

  const sdkStop = useCallback(async () => {
    try {
      if (sdkSessionInfoRef.current && sdkSessionTokenRef.current) {
        await fetch(`${serverUrl}/v1/streaming.stop`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sdkSessionTokenRef.current}`,
          },
          body: JSON.stringify({
            session_id: sdkSessionInfoRef.current.session_id,
          }),
        });
      }
    } catch {}
    try {
      const c: any = sdkClientRef.current;
      if (c?.off) {
        [
          "AVATAR_START_TALKING",
          "AVATAR_STOP_TALKING",
          "STREAM_READY",
          "STREAM_DISCONNECTED",
        ].forEach((ev) => {
          try {
            c.off(ev as any);
          } catch {}
        });
      }
    } catch {}
    try {
      sdkRoomRef.current?.disconnect();
    } catch {}
    if (sdkVideoRef.current) sdkVideoRef.current.srcObject = null;
    sdkRoomRef.current = null;
    sdkMediaStreamRef.current = null;
    sdkSessionInfoRef.current = null;
    sdkSessionTokenRef.current = null;
    sdkClientRef.current = null;
    if (sdkKeepAliveTimerRef.current)
      clearInterval(sdkKeepAliveTimerRef.current as any);
    sdkKeepAliveTimerRef.current = null;
    setSdkConnected(false);
    setSdkIsSpeaking(false);
    setSdkStreamReady(false);
    sdkLog("Session closed");
  }, [sdkLog]);

  const StatusBox = useMemo(
    () => (
      <div className="p-2.5 bg-gray-50 border border-gray-300 rounded-md h-[160px] overflow-y-auto font-mono text-sm">
        {statusLines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    ),
    [statusLines]
  );

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js"
        strategy="afterInteractive"
      />

      <div className="mx-auto max-w-5xl p-5">
        <h1 className="text-2xl font-semibold mb-4">
          Interactivo • ReplicadosIA
        </h1>

        {/* Mode toggle */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => {
              if (mode === "sdk" && sdkConnected) sdkStop();
              setMode("api");
            }}
            className={mode === "api" ? "btn-accent" : "btn-outline"}
          >
            Usar API
          </button>
          <button
            onClick={() => {
              if (mode === "api" && isConnected) handleClose();
              setMode("sdk");
            }}
            className={mode === "sdk" ? "btn-accent" : "btn-outline"}
          >
            Usar SDK
          </button>
        </div>

        {/* API Box */}
        {mode === "api" && (
          <div className="mb-8 rounded-md border-2 border-[#007bff] p-4">
            <div className="mb-4 inline-flex items-center">
              <span className="btn-accent">Usar API</span>
            </div>
            <p className="text-sm text-[#555] mb-4">
              Flujo directo de Streaming API + LiveKit.
            </p>

            <div className="flex flex-wrap gap-2.5 mb-5 items-center">
              <input
                value={avatarId}
                onChange={(e) => setAvatarId(e.target.value)}
                type="text"
                placeholder="Avatar ID (p.ej. Wayne_20240711)"
                className="flex-1 min-w-[200px] p-2 border border-gray-300 rounded-md"
              />
              <input
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                type="text"
                placeholder="Voice ID (opcional)"
                className="flex-1 min-w-[200px] p-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={handleStart}
                disabled={isStarting || isConnected}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? "Iniciando…" : "Start"}
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Close
              </button>
              {apiStreamReady && (
                <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 border border-green-300">
                  Stream listo
                </span>
              )}
              {apiIsSpeaking && (
                <span className="ml-2 rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800 border border-yellow-300">
                  Hablando…
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5 mb-5">
              <input
                id="task-input"
                type="text"
                placeholder="Texto para que el avatar hable"
                className="flex-1 min-w-[200px] p-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={() => {
                  const el = document.getElementById(
                    "task-input"
                  ) as HTMLInputElement;
                  const txt = el?.value?.trim();
                  if (txt) {
                    sendText(txt, "talk");
                    el.value = "";
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Talk (LLM)
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById(
                    "task-input"
                  ) as HTMLInputElement;
                  const txt = el?.value?.trim();
                  if (txt) {
                    sendText(txt, "repeat");
                    el.value = "";
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Repeat
              </button>
            </div>

            <video
              ref={videoRef}
              className="w-full max-h-[420px] border rounded-lg my-5 bg-black"
              autoPlay
              playsInline
              muted
            />

            {StatusBox}
          </div>
        )}

        {/* SDK Box */}
        {mode === "sdk" && (
          <div className="rounded-md border-2 border-[#007bff] p-4">
            <div className="mb-4 inline-flex items-center">
              <span className="btn-accent">Usar SDK</span>
            </div>
            <p className="text-sm text-[#555] mb-4">
              Uso del SDK con el mismo backend de tokens.
            </p>

            <div className="flex flex-wrap gap-2.5 mb-5 items-center">
              <input
                value={sdkAvatarId}
                onChange={(e) => setSdkAvatarId(e.target.value)}
                type="text"
                placeholder="Avatar ID (opcional)"
                className="flex-1 min-w-[200px] p-2 border border-gray-300 rounded-md"
              />
              <input
                value={sdkVoiceId}
                onChange={(e) => setSdkVoiceId(e.target.value)}
                type="text"
                placeholder="Voice ID (opcional)"
                className="flex-1 min-w-[200px] p-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={sdkStart}
                disabled={sdkStarting || sdkConnected}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sdkStarting ? "Iniciando…" : "Start"}
              </button>
              <button
                onClick={sdkStop}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Close
              </button>
              {sdkStreamReady && (
                <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 border border-green-300">
                  Stream listo
                </span>
              )}
              {sdkIsSpeaking && (
                <span className="ml-2 rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800 border border-yellow-300">
                  Hablando…
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5 mb-5">
              <input
                id="sdk-task-input"
                type="text"
                placeholder="Texto para que el avatar hable (SDK)"
                className="flex-1 min-w-[200px] p-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={() => {
                  const el = document.getElementById(
                    "sdk-task-input"
                  ) as HTMLInputElement;
                  const txt = el?.value?.trim();
                  if (txt) {
                    sdkSpeak(txt, "talk");
                    el.value = "";
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Talk (LLM)
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById(
                    "sdk-task-input"
                  ) as HTMLInputElement;
                  const txt = el?.value?.trim();
                  if (txt) {
                    sdkSpeak(txt, "repeat");
                    el.value = "";
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Repeat
              </button>
            </div>

            <video
              ref={sdkVideoRef}
              className="w-full max-h-[420px] border rounded-lg my-5 bg-black"
              autoPlay
              playsInline
              muted
            />

            <div className="p-2.5 bg-gray-50 border border-gray-300 rounded-md h-[160px] overflow-y-auto font-mono text-sm">
              {sdkStatusLines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
