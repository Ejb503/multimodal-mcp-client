import { audioContext } from "./utils";
import AudioRecordingWorklet from "./worklets/audio-processing";
import VolMeterWorket from "./worklets/vol-meter";

import { createWorketFromSrc } from "./audioworklet-registry";
import EventEmitter from "eventemitter3";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class AudioRecorder extends EventEmitter {
  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  recordingWorklet: AudioWorkletNode | undefined;
  vuWorklet: AudioWorkletNode | undefined;

  private starting: Promise<void> | null = null;

  constructor(public sampleRate = 16000) {
    super();
  }

  start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Could not request user media");
    }

    this.starting = new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(async (stream) => {
          try {
            this.stream = stream;
            this.audioContext = await audioContext({
              sampleRate: this.sampleRate,
            });
            this.source = this.audioContext.createMediaStreamSource(
              this.stream
            );
            const workletName = "audio-recorder-worklet";
            const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

            await this.audioContext.audioWorklet.addModule(src);
            this.recordingWorklet = new AudioWorkletNode(
              this.audioContext,
              workletName
            );

            this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
              const arrayBuffer = ev.data.data.int16arrayBuffer;
              if (arrayBuffer) {
                const arrayBufferString = arrayBufferToBase64(arrayBuffer);
                this.emit("data", arrayBufferString);
              }
            };
            this.source.connect(this.recordingWorklet);
            const vuWorkletName = "vu-meter";
            await this.audioContext.audioWorklet.addModule(
              createWorketFromSrc(vuWorkletName, VolMeterWorket)
            );
            this.vuWorklet = new AudioWorkletNode(
              this.audioContext,
              vuWorkletName
            );
            this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
              this.emit("volume", ev.data.volume);
            };

            this.source.connect(this.vuWorklet);
            this.recording = true;
            resolve();
            this.starting = null;
          } catch (error) {
            console.error("Error starting audio recording:", error);
            reject(error);
          }
        })
        .catch((error) => {
          console.error("Error getting media stream:", error);
          reject(error);
        });
    });
  }

  stop() {
    // its plausible that stop would be called before start completes
    // such as if the websocket immediately hangs up
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
    };
    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }
}
