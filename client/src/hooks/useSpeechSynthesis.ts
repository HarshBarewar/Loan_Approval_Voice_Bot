/**
 * Custom React Hook: Web Speech Synthesis (TTS)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeechSynthesis(
  defaultRate: number = 1.0,
  initialMuted: boolean = false,
  initialLanguage: 'en-IN' | 'hi-IN' = 'en-IN'
) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [language, setLanguage] = useState<'en-IN' | 'hi-IN'>(initialLanguage);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [rate, setRate] = useState<number>(defaultRate);
  const [isMuted, setIsMuted] = useState<boolean>(initialMuted);
  const lastSpokenTextRef = useRef<string>('');
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Find preferred voice given language and voice list
  const findPreferredVoice = (lang: 'en-IN' | 'hi-IN', available: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (available.length === 0) return null;

    if (lang === 'hi-IN') {
      const hindi =
        available.find(v => v.lang.toLowerCase() === 'hi-in') ||
        available.find(v => v.lang.toLowerCase().startsWith('hi')) ||
        available.find(v => v.name.toLowerCase().includes('hindi') || v.name.includes('हिन्दी'));
      if (hindi) return hindi;
    }

    // Default to Indian English or English
    return (
      available.find(v => v.lang === 'en-IN') ||
      available.find(v => v.lang.startsWith('en') && (v.name.includes('India') || v.name.includes('Natural'))) ||
      available.find(v => v.lang.startsWith('en')) ||
      available[0]
    );
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
        voicesRef.current = available;

        if (available.length > 0) {
          const preferred = findPreferredVoice(language, available);
          if (preferred) setSelectedVoice(preferred);
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

  // When language changes, auto-switch to appropriate voice
  const handleSetLanguage = useCallback((newLang: 'en-IN' | 'hi-IN') => {
    setLanguage(newLang);
    if (voicesRef.current.length > 0) {
      const preferred = findPreferredVoice(newLang, voicesRef.current);
      if (preferred) {
        setSelectedVoice(preferred);
      }
    }
  }, []);

  const cleanTextForSpeech = (text: string, isHindi: boolean): string => {
    let cleaned = text
      .replace(/[*_#`~[\]]/g, '') // remove markdown symbols
      .replace(/\{.*?\}|\[.*?\]/g, ''); // remove json/bracket blocks

    if (isHindi) {
      cleaned = cleaned.replace(/₹\s*(\d+)/g, '$1 रुपये ');
    } else {
      cleaned = cleaned.replace(/₹\s*(\d+)/g, '$1 rupees ');
    }

    return cleaned.replace(/\s+/g, ' ').trim();
  };

  const speak = useCallback(
    (rawText: string, langOverride?: 'en-IN' | 'hi-IN') => {
      if (!isSupported || isMuted || !rawText) return;

      const isHindi = (langOverride || language) === 'hi-IN' || /[\u0900-\u097F]/.test(rawText);
      const cleanText = cleanTextForSpeech(rawText, isHindi);
      if (!cleanText) return;

      lastSpokenTextRef.current = cleanText;

      try {
        // Cancel ongoing speech to prevent overlapping utterances
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = isHindi ? 'hi-IN' : 'en-IN';

        // Select the most appropriate voice
        let voiceToUse = selectedVoice;
        if (isHindi) {
          if (!voiceToUse || (!voiceToUse.lang.toLowerCase().startsWith('hi') && !voiceToUse.name.toLowerCase().includes('hindi') && !voiceToUse.name.includes('हिन्दी'))) {
            const hindiVoice = voices.find(v => v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase() === 'hi-in' || v.name.toLowerCase().includes('hindi') || v.name.includes('हिन्दी'));
            if (hindiVoice) voiceToUse = hindiVoice;
          }
        } else {
          if (!voiceToUse || (!voiceToUse.lang.toLowerCase().startsWith('en') && !voiceToUse.name.toLowerCase().includes('english'))) {
            const enVoice = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'));
            if (enVoice) voiceToUse = enVoice;
          }
        }

        if (voiceToUse) {
          utterance.voice = voiceToUse;
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
    [isSupported, isMuted, selectedVoice, rate, language, voices]
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
    language,
    setLanguage: handleSetLanguage,
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
