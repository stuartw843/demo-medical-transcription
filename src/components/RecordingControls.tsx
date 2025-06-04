import React from 'react';
import { SampleConsultation } from '../data/sampleConsultations';

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  onDeviceSelect: (deviceId: string) => void;
  sampleConsultations: SampleConsultation[];
  selectedConsultation: string;
  onConsultationSelect: (consultationId: string) => void;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  devices,
  selectedDevice,
  onDeviceSelect,
  sampleConsultations,
  selectedConsultation,
  onConsultationSelect,
}) => {
  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <select
        value={selectedConsultation}
        onChange={(e) => onConsultationSelect(e.target.value)}
        className="block w-64 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        disabled={isRecording}
      >
        <option value="">No preloaded consultation</option>
        {sampleConsultations.map((consultation) => (
          <option key={consultation.id} value={consultation.id}>
            {consultation.name}
          </option>
        ))}
      </select>
      <select
        value={selectedDevice}
        onChange={(e) => onDeviceSelect(e.target.value)}
        className="block w-64 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        disabled={isRecording}
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Microphone ${device.deviceId}`}
          </option>
        ))}
      </select>
      {!isRecording ? (
        <button
          onClick={onStartRecording}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-full flex items-center gap-2"
        >
          <span className="w-3 h-3 rounded-full bg-white"></span>
          Start Recording
        </button>
      ) : (
        <button
          onClick={onStopRecording}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-full flex items-center gap-2"
        >
          <span className="w-3 h-3 rounded bg-white"></span>
          Stop Recording
        </button>
      )}
    </div>
  );
};

export default RecordingControls;
