import { useState, useEffect, useCallback, useRef } from 'react';
import OpenAI from 'openai';
import { io, Socket } from 'socket.io-client';
import TranscriptionPanel from './components/TranscriptionPanel';
import RecordingControls from './components/RecordingControls';
import EnhancedMedicalEditor from './components/EnhancedMedicalEditor';
import { sampleConsultations } from './data/sampleConsultations';
import { Speaker } from './components/SettingsModal';

let openai: OpenAI;
try {
  openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });
} catch (error) {
  console.error('Error initializing OpenAI client:', error);
}

interface SpeechSegment {
  speaker: string;
  text: string;
  timestamp?: string;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<SpeechSegment[]>([]);
  const [partialSegment, setPartialSegment] = useState<SpeechSegment | null>(null);
  const [analysis, setAnalysis] = useState<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    icdCodes: string[];
    keyTerms: string[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedConsultation, setSelectedConsultation] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<Speaker | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getDevices = async () => {
    try {
      // Request permission to access media devices
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioDevices = (await navigator.mediaDevices.enumerateDevices())
        .filter(device => device.kind === 'audioinput');
      setDevices(audioDevices);
      if (audioDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(audioDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
      setError('Failed to access audio devices');
    }
  };



  useEffect(() => {
    getDevices();
    // Connect to WebSocket server
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('transcription', (data) => {
      if (data.isPartial) {
        setPartialSegment(data.segment);
      } else {
        setTranscript(prev => {
          // If we have a preloaded consultation, append new segments
          if (selectedConsultation) {
            return [...prev, data.segment];
          }
          // Otherwise start fresh with just the new segment
          return [...prev, data.segment];
        });
        setPartialSegment(null);
      }
    });

    socketRef.current.on('error', (data) => {
      setError(data.message);
      stopRecording();
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const generateAnalysis = useCallback(async (segments: SpeechSegment[]) => {
    setIsAnalyzing(true);
    try {
      const transcriptText = segments
        .map(segment => `${segment.speaker}: ${segment.text}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert medical scribe. Create concise, professional SOAP notes from the consultation transcript.

**FORMATTING RULES:**
- Use bullet points for clarity
- Keep sentences short and direct
- Use standard medical abbreviations
- **Bold important clinical findings, diagnoses, medications, and critical information**
- Use markdown formatting (**text** for bold)
- Focus on clinically relevant information only

**SECTIONS:**

**Subjective:**
- **Chief Complaint:** Brief reason for visit
- **HPI:** Key symptoms, onset, duration, **severity (1-10)**, quality, triggers, relieving factors
- Pertinent positives and negatives only
- **Current medications** (name, dose, frequency)
- **Allergies:** Drug allergies only
- Relevant PMH, social history, family history

**Objective:**
- **Vital signs** (if mentioned)
- **Physical exam:** Only abnormal findings and pertinent normals
- **Diagnostic results:** Labs, imaging, tests (if mentioned)

**Assessment:**
- **Primary diagnosis** with confidence level
- Secondary diagnoses (if applicable)
- Brief clinical reasoning (1-2 sentences max)

**Plan:**
- **Medications:** Name, dose, frequency, duration
- **Diagnostic tests** ordered
- **Follow-up** timeline
- Patient education (key points only)
- **Referrals** (if needed)

**ICD-10 Codes:**
Format: "CODE - Description"

**Key Medical Terms:**
List 5-8 most important medical terms from consultation

**BOLD THESE ITEMS:**
- All diagnoses and medical conditions
- Medication names and dosages
- Abnormal vital signs or lab values
- Severity scores and measurements
- Critical symptoms or findings
- Follow-up instructions and timelines
- Allergies and contraindications

Keep each section under 150 words. Prioritize actionable clinical information.`
          },
          {
            role: 'user',
            content: transcriptText
          }
        ]
      }).catch(error => {
        console.error('OpenAI API Error Details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });
        throw error;
      });
      const response = completion.choices[0]?.message?.content;
      if (response) {
        // Parse the response into sections
        // Split response into sections and parse
        const sections = {
          subjective: '',
          objective: '',
          assessment: '',
          plan: '',
          icdCodes: [] as string[],
          keyTerms: [] as string[]
        };

        // Split response into sections using regex to handle multiline content
        const sectionRegex = /(Subjective:|Objective:|Assessment:|Plan:|ICD-10 Codes:|Key Medical Terms:)([\s\S]*?)(?=(Subjective:|Objective:|Assessment:|Plan:|ICD-10 Codes:|Key Medical Terms:|$))/g;
        let match;

        while ((match = sectionRegex.exec(response)) !== null) {
          const [, sectionName, content] = match;
          let trimmedContent = content.trim();
          
          // Clean up asterisks and formatting artifacts
          trimmedContent = trimmedContent
            .replace(/^\*+\s*/gm, '') // Remove asterisks at start of lines
            .replace(/\*+$/gm, '') // Remove asterisks at end of lines
            .replace(/\*+\d+\./g, '') // Remove numbered asterisks like **2.
            .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
            .trim();

          switch (sectionName.trim()) {
            case 'Subjective:':
              sections.subjective = trimmedContent;
              break;
            case 'Objective:':
              sections.objective = trimmedContent;
              break;
            case 'Assessment:':
              sections.assessment = trimmedContent;
              break;
            case 'Plan:':
              sections.plan = trimmedContent;
              break;
            case 'ICD-10 Codes:':
              sections.icdCodes = trimmedContent
                .split('\n')
                .map(line => line.trim().replace(/^\*+\s*/, '').replace(/\*+$/, ''))
                .filter(line => line.length > 0);
              break;
            case 'Key Medical Terms:':
              sections.keyTerms = trimmedContent
                .split('\n')
                .map(line => line.trim().replace(/^\*+\s*/, '').replace(/\*+$/, ''))
                .filter(line => line.length > 0);
              break;
          }
        }

        setAnalysis(sections);
      }
    } catch (error) {
      console.error('Error generating analysis:', error);
      setError('Failed to generate medical notes');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      // If there's a selected consultation, preload it
      if (selectedConsultation) {
        const consultation = sampleConsultations.find(c => c.id === selectedConsultation);
        if (consultation) {
          setTranscript(consultation.transcript);
        }
      } else {
        setTranscript([]);
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { deviceId: selectedDevice } 
      });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && socketRef.current) {
          const reader = new FileReader();
          reader.onloadend = () => {
            socketRef.current?.emit('audioData', { 
              audio: reader.result,
              doctorSpeakerIdentifier: selectedDoctor?.speaker_identifier
            });
          };
          reader.readAsDataURL(event.data);
        }
      };

      recorder.start(100); // Collect data every 100ms for lower latency
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      if (!selectedConsultation) {
        setTranscript([]);
      }
      setPartialSegment(null);
      setAnalysis(null);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to access microphone');
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && streamRef.current) {
      mediaRecorderRef.current.stop();
      streamRef.current.getTracks().forEach(track => track.stop());
      socketRef.current?.emit('stopRecording');
      setIsRecording(false);
      generateAnalysis(transcript);
    }
  }, [transcript, generateAnalysis]);


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-8xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Medical Transcription Assistant
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <RecordingControls
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          devices={devices}
          selectedDevice={selectedDevice}
          onDeviceSelect={setSelectedDevice}
          sampleConsultations={sampleConsultations}
          selectedConsultation={selectedConsultation}
          onConsultationSelect={setSelectedConsultation}
          onDoctorSelect={setSelectedDoctor}
        />

        <div className={`grid grid-cols-1 ${(analysis || isAnalyzing) ? 'lg:grid-cols-2' : ''} gap-6 lg:gap-8`}>
          <TranscriptionPanel 
            transcript={partialSegment ? [...transcript, partialSegment] : transcript}
          />
          {(analysis || isAnalyzing) && (
            <EnhancedMedicalEditor 
              analysis={analysis} 
              isLoading={isAnalyzing} 
              selectedDevice={selectedDevice}
              realTimeTranscript={partialSegment ? [...transcript, partialSegment] : transcript}
              isMainRecording={isRecording}
              devices={devices}
              partialSegment={partialSegment}
              selectedDoctor={selectedDoctor}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
