import React from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  isListening = false,
  isSpeaking = false,
  audioLevel = 0
}) => {
  // If not active, show a subtle flatline/idle wave
  const bars = 18;

  return (
    <div className="flex items-center space-x-1 h-8 px-2 select-none" title={
      isListening ? 'Microphone listening...' : isSpeaking ? 'Priya speaking...' : 'Voice engine idle'
    }>
      {Array.from({ length: bars }).map((_, i) => {
        // Compute pseudo height or audio-reactive height
        let heightPercent = 20;
        let colorClass = 'bg-slate-300';

        if (isListening) {
          const dynamicFactor = Math.sin((i / bars) * Math.PI) * (audioLevel > 5 ? audioLevel * 1.8 : 35);
          const variation = (i % 3 === 0 ? 15 : i % 2 === 0 ? -10 : 5);
          heightPercent = Math.min(100, Math.max(15, dynamicFactor + variation));
          colorClass = 'bg-red-500';
        } else if (isSpeaking) {
          const wave = Math.sin((Date.now() / 200) + (i * 0.4)) * 35 + 50;
          heightPercent = Math.min(100, Math.max(20, wave));
          colorClass = 'bg-emerald-500';
        } else if (isActive) {
          heightPercent = 20 + (i % 2 === 0 ? 10 : 0);
          colorClass = 'bg-slate-400';
        }

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${colorClass}`}
            style={{
              height: `${heightPercent}%`,
              opacity: isActive ? 1 : 0.4
            }}
          />
        );
      })}
    </div>
  );
};
