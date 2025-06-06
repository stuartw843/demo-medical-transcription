import React, { useState, useEffect } from 'react';

interface SpeechSegment {
  speaker: string;
  text: string;
  timestamp?: string;
}

interface TranscriptionOverlayProps {
  partialSegment: SpeechSegment | null;
  isVisible: boolean;
  activeSection: string;
  position?: 'top' | 'bottom';
}

const TranscriptionOverlay: React.FC<TranscriptionOverlayProps> = ({
  partialSegment,
  isVisible,
  activeSection,
  position = 'bottom'
}) => {
  const [displayText, setDisplayText] = useState<string>('');
  const [isFinal, setIsFinal] = useState<boolean>(false);
  const [isRecordingActive, setIsRecordingActive] = useState<boolean>(false);

  // Track if recording is active based on segments being received
  useEffect(() => {
    if (partialSegment) {
      setIsRecordingActive(true);
    }
  }, [partialSegment]);

  // Process partial segment text only
  useEffect(() => {
    if (partialSegment?.text) {
      setDisplayText(partialSegment.text.trim());
      setIsFinal(false);
    } else if (!isRecordingActive) {
      // Only clear when recording is not active
      setDisplayText('');
      setIsFinal(false);
    }
  }, [partialSegment, isRecordingActive]);

  // Reset recording state when not visible (recording stopped)
  useEffect(() => {
    if (!isVisible) {
      setIsRecordingActive(false);
      setDisplayText('');
      setIsFinal(false);
    }
  }, [isVisible]);

  // Don't show if not visible
  if (!isVisible) {
    return null;
  }

  // Show recording indicator even when no text yet
  const shouldShowOverlay = isVisible && (displayText || isRecordingActive);

  if (!shouldShowOverlay) {
    return null;
  }

  const getSectionColor = (section: string) => {
    switch (section) {
      case 'subjective': return 'bg-blue-900/90 border-blue-400';
      case 'objective': return 'bg-green-900/90 border-green-400';
      case 'assessment': return 'bg-orange-900/90 border-orange-400';
      case 'plan': return 'bg-purple-900/90 border-purple-400';
      default: return 'bg-gray-900/90 border-gray-400';
    }
  };

  const positionClasses = position === 'top' 
    ? 'top-4' 
    : 'bottom-4';

  return (
    <div className={`fixed left-1/2 transform -translate-x-1/2 ${positionClasses} z-50 max-w-2xl w-auto`}>
      <div className={`${getSectionColor(activeSection)} text-white px-6 py-3 rounded-lg shadow-2xl border-2 backdrop-blur-sm transition-all duration-300 ease-in-out`}>
        <div className="flex items-center space-x-3">
          {/* Recording indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium opacity-75 capitalize">
              {activeSection}
            </span>
          </div>
          
          {/* Transcription text */}
          <div className="flex-1">
            <p className="text-sm font-medium leading-relaxed">
              {displayText ? (
                <span className="text-white transition-opacity duration-300">
                  {displayText}
                </span>
              ) : (
                <span className="text-gray-300 italic">Listening...</span>
              )}
              {/* Typing cursor */}
              <span className="inline-block w-1 h-4 bg-yellow-300 ml-1 animate-pulse"></span>
            </p>
          </div>
          
          {/* Speaker indicator */}
          {partialSegment?.speaker && (
            <div className="text-xs font-mono bg-white/20 px-2 py-1 rounded">
              {partialSegment.speaker}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptionOverlay;
