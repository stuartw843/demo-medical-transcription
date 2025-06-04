import React, { useEffect, useRef } from 'react';

interface SpeechSegment {
  speaker: string;
  text: string;
  timestamp?: string;
}

interface TranscriptionPanelProps {
  transcript: SpeechSegment[];
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ transcript }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [transcript]);

  if (!transcript || transcript.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8 mb-6">
        <h2 className="text-xl font-semibold mb-4">Live Transcript</h2>
        <div ref={scrollContainerRef} className="h-64 lg:h-[32rem] overflow-y-auto bg-gray-50 p-4 lg:p-6 rounded">
          Waiting for speech...
        </div>
      </div>
    );
  }

  // Group consecutive segments by speaker
  const groupedTranscript = transcript.reduce((acc: SpeechSegment[], curr) => {
    const lastSegment = acc[acc.length - 1];
    
    if (lastSegment && lastSegment.speaker === curr.speaker) {
      // Combine text with the previous segment
      lastSegment.text += ' ' + curr.text;
      // Update timestamp if needed
      if (curr.timestamp) {
        lastSegment.timestamp = curr.timestamp;
      }
      return acc;
    }
    
    // Add new segment if speaker changes
    return [...acc, { ...curr }];
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8 mb-6">
      <h2 className="text-xl font-semibold mb-4">Live Transcript</h2>
      <div ref={scrollContainerRef} className="h-64 lg:h-[32rem] overflow-y-auto bg-gray-50 p-4 lg:p-6 rounded space-y-4">
        {groupedTranscript.map((segment, index) => (
          <div key={index} className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-28">
              <div className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium">
                {segment.speaker}
              </div>
              {segment.timestamp && (
                <div className="text-xs text-gray-500 mt-1">
                  {segment.timestamp}
                </div>
              )}
            </div>
            <div className="flex-grow bg-white rounded-lg p-3 shadow-sm">
              <p className="text-gray-700">{segment.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptionPanel;
