"use client";

import { useEffect, useRef, useState } from "react";
import { readSpeechText } from "@/lib/speech/text";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognition = EventTarget & {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResult = ArrayLike<{ transcript: string }> & {
  isFinal?: boolean;
};

type SpeechRecognitionEvent = {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResult>;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type VoiceInputProps = {
  disabled: boolean;
  onInterimTranscript: (transcript: string) => void;
};

type SpeechTokenResponse = {
  token?: string;
  region?: string;
  source?: string;
  message?: string;
};

type AzureRecognizer = {
  close: () => void;
  stopContinuousRecognitionAsync: (successCallback?: () => void, errorCallback?: (error: string) => void) => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceInput({ disabled, onInterimTranscript }: VoiceInputProps) {
  const [status, setStatus] = useState("VOICE READY");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const azureRecognizerRef = useRef<AzureRecognizer | null>(null);
  const browserRecognitionRef = useRef<SpeechRecognition | null>(null);
  const hasSubmittedRef = useRef(false);
  const transcriptRef = useRef("");

  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, []);

  async function startVoiceInput() {
    if (isListening) {
      stopVoiceInput();
      return;
    }

    if (disabled) {
      return;
    }

    setTranscript("");
    transcriptRef.current = "";
    setIsListening(true);
    setStatus("AZURE TOKEN");
    hasSubmittedRef.current = false;

    try {
      const tokenResponse = await fetch("/api/speech-token", { cache: "no-store" });
      const tokenPayload = (await tokenResponse.json()) as SpeechTokenResponse;

      if (tokenResponse.ok && tokenPayload.token && tokenPayload.region) {
        await recognizeWithAzure(tokenPayload.token, tokenPayload.region);
        return;
      }

      setStatus(tokenPayload.message ? "BROWSER FALLBACK" : "NO TOKEN");
      await recognizeWithBrowser();
    } catch {
      setStatus("BROWSER FALLBACK");
      await recognizeWithBrowser();
    }
  }

  async function recognizeWithAzure(token: string, region: string) {
    setStatus("듣는 중");

    try {
      const speechSdk = await import("microsoft-cognitiveservices-speech-sdk");
      const speechConfig = speechSdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "ko-KR";
      const audioConfig = speechSdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);
      azureRecognizerRef.current = recognizer;

      recognizer.recognizing = (_sender, event) => {
        const text = readSpeechText(event.result);

        if (text) {
          updateTranscript(text);
          setStatus("실시간 인식 중");
        }
      };

      recognizer.recognized = async (_sender, event) => {
        const text = readSpeechText(event.result);

        if (text && !hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          cleanupRecognition();
          await finishRecognition(text, "AZURE SPEECH");
        }
      };

      recognizer.canceled = async () => {
        cleanupRecognition();
        setStatus("BROWSER FALLBACK");
        await recognizeWithBrowser();
      };

      recognizer.sessionStopped = async () => {
        if (!hasSubmittedRef.current) {
          cleanupRecognition();
          const text = transcriptRef.current;
          await finishRecognition(text, text ? "AZURE SPEECH" : "NO SPEECH");
        }
      };

      recognizer.startContinuousRecognitionAsync(
        () => setStatus("듣는 중"),
        async () => {
          cleanupRecognition();
          setStatus("BROWSER FALLBACK");
          await recognizeWithBrowser();
        },
      );
    } catch {
      cleanupRecognition();
      setStatus("BROWSER FALLBACK");
      await recognizeWithBrowser();
    }
  }

  async function recognizeWithBrowser() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setStatus("TEXT FALLBACK");
      setIsListening(false);
      return;
    }

    await new Promise<void>((resolve) => {
      const recognition = new Recognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      browserRecognitionRef.current = recognition;

      recognition.onresult = async (event) => {
        let finalText = "";
        let interimText = "";
        const startIndex = event.resultIndex ?? 0;

        for (let index = startIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result[0]?.transcript?.trim() ?? "";

          if (result.isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }

        const visibleText = finalText || interimText;

        if (visibleText) {
          updateTranscript(visibleText);
          setStatus(finalText ? "BROWSER SPEECH" : "실시간 인식 중");
        }

        if (finalText && !hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          recognition.stop();
          await finishRecognition(finalText, "BROWSER SPEECH");
          resolve();
        }
      };

      recognition.onerror = () => {
        setStatus("TEXT FALLBACK");
        setIsListening(false);
        browserRecognitionRef.current = null;
        resolve();
      };

      recognition.onend = () => {
        setIsListening(false);
        browserRecognitionRef.current = null;
        resolve();
      };

      recognition.start();
      setStatus("듣는 중");
    });
  }

  async function finishRecognition(text: string, nextStatus: string) {
    updateTranscript(text);
    setStatus(nextStatus);
    setIsListening(false);
  }

  function updateTranscript(text: string) {
    transcriptRef.current = text;
    setTranscript(text);
    onInterimTranscript(text);
  }

  function stopVoiceInput() {
    setStatus("STOPPING");
    cleanupRecognition();
    setIsListening(false);
  }

  function cleanupRecognition() {
    const azureRecognizer = azureRecognizerRef.current;
    azureRecognizerRef.current = null;

    if (azureRecognizer) {
      azureRecognizer.stopContinuousRecognitionAsync(
        () => azureRecognizer.close(),
        () => azureRecognizer.close(),
      );
    }

    const browserRecognition = browserRecognitionRef.current;
    browserRecognitionRef.current = null;

    if (browserRecognition) {
      browserRecognition.stop();
    }
  }

  return (
    <div className={isListening ? "voice-panel voice-panel-listening" : "voice-panel"}>
      <button className="voice-button" disabled={disabled && !isListening} onClick={startVoiceInput} type="button">
        {isListening ? "STOP" : "REC"}
      </button>
      <div className="voice-readout" aria-live="polite">
        <span>{status}</span>
        <p>{transcript || "마이크로 말하면 명령이 바로 실행됩니다."}</p>
      </div>
    </div>
  );
}
