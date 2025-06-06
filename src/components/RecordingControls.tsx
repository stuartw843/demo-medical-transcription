import React, { useState, useEffect } from 'react';
import { SampleConsultation } from '../data/sampleConsultations';
import SettingsModal, { Speaker } from './SettingsModal';

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
  onDoctorSelect: (doctor: Speaker | null) => void;
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
  onDoctorSelect,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Speaker | null>(null);

  useEffect(() => {
    loadSpeakers();
    loadSelectedDoctor();
  }, []);

  const loadSpeakers = () => {
    const stored = localStorage.getItem('medical-transcription-speakers');
    if (stored) {
      setSpeakers(JSON.parse(stored));
    }
  };

  const loadSelectedDoctor = () => {
    const stored = localStorage.getItem('medical-transcription-selected-doctor');
    if (stored) {
      const doctor = JSON.parse(stored);
      setSelectedDoctor(doctor);
      onDoctorSelect(doctor);
    }
  };

  const handleDoctorSelect = (speakerId: string) => {
    if (speakerId === '') {
      setSelectedDoctor(null);
      localStorage.removeItem('medical-transcription-selected-doctor');
      onDoctorSelect(null);
    } else {
      const doctor = speakers.find(s => s.id === speakerId) || null;
      setSelectedDoctor(doctor);
      if (doctor) {
        localStorage.setItem('medical-transcription-selected-doctor', JSON.stringify(doctor));
      }
      onDoctorSelect(doctor);
    }
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    loadSpeakers(); // Refresh speakers list when modal closes
    // Check if selected doctor still exists
    if (selectedDoctor) {
      const doctorStillExists = speakers.some(s => s.id === selectedDoctor.id);
      if (!doctorStillExists) {
        setSelectedDoctor(null);
        localStorage.removeItem('medical-transcription-selected-doctor');
        onDoctorSelect(null);
      }
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4 mb-6">
        {/* Settings and Doctor Selection Row */}
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
            disabled={isRecording}
          >
            ⚙️ Speaker Settings
          </button>
          
          <select
            value={selectedDoctor?.id || ''}
            onChange={(e) => handleDoctorSelect(e.target.value)}
            className="block w-64 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isRecording}
          >
            <option value="">Select Doctor</option>
            {speakers.map((speaker) => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.name}
              </option>
            ))}
          </select>
        </div>

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
        
        {/* Main Recording Controls */}
        <div className="flex gap-4 items-center">
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
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
      />
    </>
  );
};

export default RecordingControls;
