/**
 * Custom React Hook: Web Speech API Speech Recognition (STT)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Declaration for browser SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (finalTranscript: string) => void;
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
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('prompt');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
          setPermissionState('granted');
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (interim) {
            setInterimTranscript(interim);
          }

          if (final) {
            const cleaned = final.trim();
            setTranscript(cleaned);
            setInterimTranscript('');
            if (onResult) {
              onResult(cleaned);
            }
          }
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          let msg = `Speech recognition error: ${event.error}`;
          if (event.error === 'not-allowed') {
            msg = 'Microphone permission denied. Please allow microphone access in browser settings.';
            setPermissionState('denied');
          } else if (event.error === 'no-speech') {
            msg = 'No speech was detected. Please try speaking again.';
          } else if (event.error === 'network') {
            msg = 'Speech recognition network error. Please use manual text input or check connectivity.';
          }
          setErrorMessage(msg);
          if (onError) onError(msg);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
      } catch (err: any) {
        setIsSupported(false);
        setErrorMessage(err.message);
      }
    } else {
      setIsSupported(false);
      setErrorMessage('Browser does not support native SpeechRecognition. Manual text input is enabled.');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [lang, onResult, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage(null);
    try {
      recognitionRef.current.start();
    } catch (err: any) {
      if (err.name !== 'InvalidStateError') {
        setErrorMessage(`Could not start microphone: ${err.message}`);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
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
    startListening,
    stopListening,
    resetTranscript
  };
}
