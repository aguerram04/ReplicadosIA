export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  constructor(
    private onStatusChange: (status: string) => void,
    private onTranscriptionComplete: (text: string) => void
  ) {}

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        await this.sendToWhisper(audioBlob);
      };

      this.mediaRecorder.start(1000);
      this.onStatusChange("Recording... Speak now");
    } catch (error: any) {
      this.onStatusChange("Error: " + error?.message);
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.onStatusChange("Processing audio...");
      const stream = this.mediaRecorder.stream;
      stream.getTracks().forEach((t) => t.stop());
    }
  }

  private async sendToWhisper(audioBlob: Blob) {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      this.onStatusChange("");
      this.onTranscriptionComplete(data.text as string);
    } catch (error) {
      this.onStatusChange("Error: Failed to transcribe audio");
    }
  }
}
