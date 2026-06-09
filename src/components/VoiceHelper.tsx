import React, { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { ShopSettings } from '../types';

interface VoiceHelperProps {
  settings: ShopSettings;
  pageSummaryText: string;
}

export const speakText = (text: string, rate: number = 0.95) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    
    // Clean up HTML tags if any slipped in
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    
    // Attempt to find a warm, natural sounding local voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) || 
                        voices.find(v => v.lang.startsWith('en')) || 
                        voices[0];
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
};

export const VoiceHelper: React.FC<VoiceHelperProps> = ({ settings, pageSummaryText }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Stop speaking when settings or component unmounts
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!settings.voiceAssistDefault) return;

    if (isPlaying) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakText(pageSummaryText, settings.voiceRate);
      
      // Monitor completion
      if ('speechSynthesis' in window) {
        const checkSpeech = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            setIsPlaying(false);
            clearInterval(checkSpeech);
          }
        }, 500);
      }
    }
  };

  if (!settings.voiceAssistDefault) return null;

  return (
    <button 
      className="voice-helper-bubble" 
      onClick={handleSpeak}
      title="Click to hear page description read aloud"
      aria-label="Click to hear page description read aloud"
    >
      {isPlaying ? (
        <>
          <div className="voice-wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>Stop Listening</span>
        </>
      ) : (
        <>
          <Volume2 size={28} />
          <span>Listen to Screen</span>
        </>
      )}
    </button>
  );
};
