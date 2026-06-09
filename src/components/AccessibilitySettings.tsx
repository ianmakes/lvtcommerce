import React from 'react';
import { Type, Eye, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { ShopSettings } from '../types';

interface AccessibilitySettingsProps {
  settings: ShopSettings;
  onChangeSettings: (newSettings: ShopSettings) => void;
  currentZoom: 'normal' | 'large' | 'xlarge';
  onChangeZoom: (zoom: 'normal' | 'large' | 'xlarge') => void;
  currentTheme: 'light' | 'high-contrast';
  onChangeTheme: (theme: 'light' | 'high-contrast') => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  settings,
  onChangeSettings,
  currentZoom,
  onChangeZoom,
  currentTheme,
  onChangeTheme,
}) => {
  const toggleVoice = () => {
    const nextVoice = !settings.voiceAssistDefault;
    onChangeSettings({
      ...settings,
      voiceAssistDefault: nextVoice,
    });
    
    // Play a audio cue to let them know
    if (nextVoice) {
      speakText("Voice guide is now turned on. I will help read text for you.");
    } else {
      speakText("Voice guide is turned off.");
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.voiceRate || 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleZoomChange = (zoom: 'normal' | 'large' | 'xlarge') => {
    onChangeZoom(zoom);
    let zoomLabel = "normal text size";
    if (zoom === 'large') zoomLabel = "large text size";
    if (zoom === 'xlarge') zoomLabel = "extra large text size";
    speakText(`Text size changed to ${zoomLabel}.`);
  };

  const handleThemeChange = (theme: 'light' | 'high-contrast') => {
    onChangeTheme(theme);
    const themeLabel = theme === 'high-contrast' ? "High contrast black theme" : "Warm cream light theme";
    speakText(`Screen colors changed to ${themeLabel}.`);
  };

  return (
    <div className="accessibility-bar">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <HelpCircle size={24} style={{ color: 'var(--accent-primary)' }} />
          <span>Senior Helper Controls:</span>
        </div>
        
        <div className="acc-controls">
          {/* Zoom Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Type size={20} />
            <button 
              className={`acc-btn ${currentZoom === 'normal' ? 'active' : ''}`}
              onClick={() => handleZoomChange('normal')}
              aria-label="Normal text size"
            >
              Normal
            </button>
            <button 
              className={`acc-btn ${currentZoom === 'large' ? 'active' : ''}`}
              onClick={() => handleZoomChange('large')}
              aria-label="Large text size"
              style={{ fontSize: '1.15rem' }}
            >
              Large
            </button>
            <button 
              className={`acc-btn ${currentZoom === 'xlarge' ? 'active' : ''}`}
              onClick={() => handleZoomChange('xlarge')}
              aria-label="Extra Large text size"
              style={{ fontSize: '1.3rem' }}
            >
              X-Large
            </button>
          </div>

          {/* Theme Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
            <Eye size={20} />
            <button 
              className={`acc-btn ${currentTheme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
              aria-label="Use Cream Light Theme"
            >
              Warm Cream
            </button>
            <button 
              className={`acc-btn ${currentTheme === 'high-contrast' ? 'active' : ''}`}
              onClick={() => handleThemeChange('high-contrast')}
              aria-label="Use High Contrast Dark Theme"
              style={{ backgroundColor: '#000', color: '#fff', borderColor: '#fff' }}
            >
              High Contrast (Black)
            </button>
          </div>

          {/* Voice Guide Toggle */}
          <button 
            className={`acc-btn ${settings.voiceAssistDefault ? 'active' : ''}`}
            onClick={toggleVoice}
            style={{ marginLeft: '16px', minWidth: '160px' }}
            aria-label={settings.voiceAssistDefault ? "Turn voice guide off" : "Turn voice guide on"}
          >
            {settings.voiceAssistDefault ? (
              <>
                <Volume2 size={20} />
                <span>Voice Guide: ON</span>
              </>
            ) : (
              <>
                <VolumeX size={20} />
                <span>Voice Guide: OFF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
