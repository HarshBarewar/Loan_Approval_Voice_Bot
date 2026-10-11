/**
 * Custom React Hook: Web Speech API Speech Recognition (STT)
 * Robust implementation with explicit microphone permission request,
 * audio level monitoring, continuous speech recognition, and instant live transcription.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    AudioContext?: any;
    webkitAudioContext?: any;
  }
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (finalOrInterimTranscript: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({
  lang = 'en-IN',
  onResult,
  onError
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Keep callback references stable to prevent unnecessary re-initializations
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const isListeningRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Initial compatibility check
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SpeechRecognition) {
      setIsSupported(true);
      setPermissionState('prompt');
    } else {
      setIsSupported(false);
      setPermissionState('unsupported');
      setErrorMessage('Speech recognition is not natively supported in this browser. Please use Chrome, Edge, or Brave, or type your answer in the text box.');
    }
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      stopAudioMonitoring();
    };
  }, []);

  // Monitor microphone volume levels using Web Audio API for visual feedback
  const startAudioMonitoring = async (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Normalize 0 to 100
        setAudioLevel(Math.min(100, Math.round(average * 2)));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch {
      // Audio monitoring is optional visual enhancement; ignore if blocked
    }
  };

  const stopAudioMonitoring = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
  };

  /**
   * Start Listening with explicit mic permission check and fresh SpeechRecognition instance
   */
  const startListening = useCallback(async () => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      const msg = 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave, or use manual text input.';
      setErrorMessage(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      return;
    }

    setErrorMessage(null);
    setTranscript('');
    setInterimTranscript('');

    // Step 1: Explicitly request microphone stream to guarantee browser mic access
    let stream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setPermissionState('granted');
      } catch (mediaErr: any) {
        if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
          const msg = 'Microphone permission denied. Please allow microphone access in your browser settings (look for the lock/camera icon in the address bar).';
          setErrorMessage(msg);
          setPermissionState('denied');
          if (onErrorRef.current) onErrorRef.current(msg);
          return;
        } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
          const msg = 'No microphone device was detected on your computer.';
          setErrorMessage(msg);
          if (onErrorRef.current) onErrorRef.current(msg);
          return;
        }
      }
    }

    // Step 2: Clean up any prior recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    // Step 3: Instantiate fresh SpeechRecognition
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Stay listening until stopped or speech recognized
      recognition.interimResults = true; // Stream interim text so user sees real-time transcription
      recognition.maxAlternatives = 1;
      recognition.lang = lang;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setErrorMessage(null);
        if (stream) {
          startAudioMonitoring(stream);
        }
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalStr += result[0].transcript + ' ';
          } else {
            interimStr += result[0].transcript + ' ';
          }
        }

        const fullCurrentText = (finalStr + interimStr).trim();

        if (interimStr.trim()) {
          setInterimTranscript(interimStr.trim());
        } else {
          setInterimTranscript('');
        }

        if (fullCurrentText) {
          setTranscript(fullCurrentText);
          // Pass the recognized words to parent component in real time!
          if (onResultRef.current) {
            onResultRef.current(fullCurrentText);
          }
        }
      };

      recognition.onerror = (event: any) => {
        // Handle common speech recognition errors
        if (event.error === 'no-speech') {
          // No speech detected yet; do not abort, let user speak
          return;
        }

        if (event.error === 'aborted') {
          return;
        }

        let msg = `Speech recognition notice: ${event.error}`;
        if (event.error === 'not-allowed') {
          msg = 'Microphone permission denied. Please allow microphone access in your browser.';
          setPermissionState('denied');
        } else if (event.error === 'network') {
          msg = 'Web Speech network error. If using Chrome, check your internet connectivity to Google speech services, or use manual text input.';
        } else if (event.error === 'audio-capture') {
          msg = 'No microphone device was detected or microphone is busy.';
        }

        setErrorMessage(msg);
        if (onErrorRef.current) onErrorRef.current(msg);
      };

      recognition.onend = () => {
        // If user didn't explicitly stop, but recognition ended, check state
        if (isListeningRef.current) {
          // If speech was recognized, stop gracefully; otherwise can restart or set idle
          setIsListening(false);
          isListeningRef.current = false;
          stopAudioMonitoring();
        } else {
          setIsListening(false);
          stopAudioMonitoring();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      const msg = `Could not start speech recognition: ${err.message}`;
      setErrorMessage(msg);
      setIsListening(false);
      isListeningRef.current = false;
      stopAudioMonitoring();
      if (onErrorRef.current) onErrorRef.current(msg);
    }
  }, [lang]);

  /**
   * Stop Listening
   */
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    stopAudioMonitoring();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    setTranscript,
    interimTranscript,
    errorMessage,
    permissionState,
    audioLevel,
    startListening,
    stopListening,
    resetTranscript
  };
}
