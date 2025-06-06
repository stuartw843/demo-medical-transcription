import React, { useState, useEffect } from 'react';

export interface Speaker {
  id: string;
  name: string;
  speaker_identifier: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [newSpeaker, setNewSpeaker] = useState({ name: '', speaker_identifier: '' });

  useEffect(() => {
    if (isOpen) {
      loadSpeakers();
    }
  }, [isOpen]);

  const loadSpeakers = () => {
    const stored = localStorage.getItem('medical-transcription-speakers');
    if (stored) {
      setSpeakers(JSON.parse(stored));
    }
  };

  const saveSpeakers = (updatedSpeakers: Speaker[]) => {
    localStorage.setItem('medical-transcription-speakers', JSON.stringify(updatedSpeakers));
    setSpeakers(updatedSpeakers);
  };

  const addSpeaker = () => {
    if (newSpeaker.name.trim() && newSpeaker.speaker_identifier.trim()) {
      const speaker: Speaker = {
        id: Date.now().toString(),
        name: newSpeaker.name.trim(),
        speaker_identifier: newSpeaker.speaker_identifier.trim()
      };
      saveSpeakers([...speakers, speaker]);
      setNewSpeaker({ name: '', speaker_identifier: '' });
    }
  };

  const deleteSpeaker = (id: string) => {
    const updatedSpeakers = speakers.filter(s => s.id !== id);
    saveSpeakers(updatedSpeakers);
    
    // Clear doctor selection if deleted speaker was selected as doctor
    const selectedDoctor = localStorage.getItem('medical-transcription-selected-doctor');
    if (selectedDoctor) {
      const doctorData = JSON.parse(selectedDoctor);
      if (doctorData.id === id) {
        localStorage.removeItem('medical-transcription-selected-doctor');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Speaker Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Add New Speaker */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Add New Speaker</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={newSpeaker.name}
                onChange={(e) => setNewSpeaker({ ...newSpeaker, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Dr. Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speaker Identifier
              </label>
              <input
                type="text"
                value={newSpeaker.speaker_identifier}
                onChange={(e) => setNewSpeaker({ ...newSpeaker, speaker_identifier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Long identifier string"
              />
            </div>
          </div>
          <button
            onClick={addSpeaker}
            disabled={!newSpeaker.name.trim() || !newSpeaker.speaker_identifier.trim()}
            className="mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
          >
            Add Speaker
          </button>
        </div>

        {/* Speakers List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Current Speakers</h3>
          {speakers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No speakers added yet</p>
          ) : (
            <div className="space-y-3">
              {speakers.map((speaker) => (
                <div key={speaker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{speaker.name}</div>
                    <div className="text-sm text-gray-600 truncate max-w-md">
                      {speaker.speaker_identifier}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSpeaker(speaker.id)}
                    className="text-red-500 hover:text-red-700 ml-4 px-3 py-1 rounded-md hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
