/**
 * Custom React Hook: Web Speech Synthesis (TTS)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeechSynthesis(defaultRate: number = 1.0, initialMuted: boolean = false) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [rate, setRate] = useState<number>(defaultRate);
  const [isMuted, setIsMuted] = useState<boolean>(initialMuted);
  const lastSpokenTextRef = useRef<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);

        // Auto-select preferred voice: Indian English or English or Hindi
        if (!selectedVoice && available.length > 0) {
          const preferred =
            available.find(v => v.lang === 'en-IN') ||
            available.find(v => v.lang.startsWith('en') && (v.name.includes('India') || v.name.includes('Natural'))) ||
            available.find(v => v.lang.startsWith('en')) ||
            available[0];
          setSelectedVoice(preferred);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/[*_#`~[\]]/g, '') // remove markdown symbols
      .replace(/\{.*?\}|\[.*?\]/g, '') // remove json/bracket blocks
      .replace(/₹\s*(\d+)/g, '$1 rupees ') // vocalize rupee symbols cleanly
      .replace(/\s+/g, ' ')
      .trim();
  };

  const speak = useCallback(
    (rawText: string) => {
      if (!isSupported || isMuted || !rawText) return;

      const cleanText = cleanTextForSpeech(rawText);
      if (!cleanText) return;

      lastSpokenTextRef.current = cleanText;

      try {
        // Cancel ongoing speech to prevent overlapping utterances
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        utterance.rate = rate;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.warn('Speech synthesis error:', e.error);
          }
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Failed to speak utterance:', err);
        setIsSpeaking(false);
      }
    },
    [isSupported, isMuted, selectedVoice, rate]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } catch {
      // ignore
    }
  }, [isSupported]);

  const replay = useCallback(() => {
    if (lastSpokenTextRef.current) {
      speak(lastSpokenTextRef.current);
    }
  }, [speak]);

  return {
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    isSpeaking,
    rate,
    setRate,
    isMuted,
    setIsMuted,
    speak,
    stop,
    replay
  };
}
