import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RealtimeClient, RealtimeMessage, RealtimeServerMessage } from '@speechmatics/real-time-client';

let url = "wss://preview.rt.speechmatics.com/v2";  

interface TranscriptResult {
  alternatives: Array<{ 
    content: string;
    speaker?: string;
    language?: string;
    confidence?: number;
  }>;
}

interface TranscriptMessage extends RealtimeMessage {
  message: 'AddTranscript' | 'AddPartialTranscript';
  results: TranscriptResult[];
}


import { createSpeechmaticsJWT } from '@speechmatics/auth';

dotenv.config();

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Store multiple clients for different sessions
  const clients = new Map<string, {
    client: RealtimeClient | null;
    isConnected: boolean;
    isConnecting: boolean;
    currentSpeaker: string;
    currentText: string;
    speakerTexts: Map<string, string>;
  }>();
  
  const getSession = (sessionId: string = 'default') => {
    if (!clients.has(sessionId)) {
      clients.set(sessionId, {
        client: null,
        isConnected: false,
        isConnecting: false,
        currentSpeaker: '',
        currentText: '',
        speakerTexts: new Map<string, string>()
      });
    }
    return clients.get(sessionId)!;
  };

  const cleanupClient = (sessionId: string = 'default') => {
    const session = clients.get(sessionId);
    if (session?.client) {
      try {
        // Don't wait for stopRecognition as it causes timeouts
        session.client.stopRecognition().catch(() => {
          // Ignore timeout errors
        });
      } catch (error) {
        // Ignore cleanup errors
      }
      session.client = null;
      session.isConnected = false;
      session.isConnecting = false;
      session.currentSpeaker = '';
      session.currentText = '';
      session.speakerTexts.clear();
    }
  };

  socket.on('audioData', async (data) => {
    try {
      const sessionId = data.sessionId || 'default';
      const doctorSpeakerIdentifier = data.doctorSpeakerIdentifier;
      const session = getSession(sessionId);
      
      if (!session.client && !session.isConnecting) {
        session.isConnecting = true;
        const apiKey = process.env.SPEECHMATICS_API_KEY;
        if (!apiKey) {
          throw new Error('SPEECHMATICS_API_KEY not set');
        }

        if(url != ""){
          session.client = new RealtimeClient({url:url});
        }
        else{
          session.client = new RealtimeClient();
        }

        // Add connection event listeners
        session.client.addEventListener('receiveMessage', (evt: MessageEvent<RealtimeServerMessage>) => {
          // Mark as connected when we receive the first message
          if (!session.isConnected && evt.data.message === 'RecognitionStarted') {
            session.isConnected = true;
            session.isConnecting = false;
            console.log(`Speechmatics connection fully established for session: ${sessionId}`);
            return;
          }

          if (evt.data.message !== 'AddTranscript' && evt.data.message !== 'AddPartialTranscript') {
            return;
          }

          const messageData = evt.data as TranscriptMessage;
          const text = messageData.results
            .map(r => r.alternatives[0].content)
            .join(' ')
            .trim();

          if (!text) return;

          const speaker = messageData.results[0]?.alternatives[0]?.speaker || 'S1';
          const formattedText = text
            .replace(/\s*([.,?!])\s*/g, '$1')
            .replace(/([.,?!])(?=.)/g, '$1 ')
            .trim();

          if (messageData.message === 'AddPartialTranscript') {
            // Only update UI with partial if same speaker
            if (speaker === session.currentSpeaker || !session.currentSpeaker) {
              const segment = {
                speaker,
                text: (session.currentText + (session.currentText && !formattedText.match(/^[.,?!]/) ? ' ' : '') + formattedText).trim(),
                timestamp: new Date().toLocaleTimeString()
              };
              socket.emit('transcription', { segment, isPartial: true, sessionId });
            }
          } else if (messageData.message === 'AddTranscript') {
            // If speaker changes, emit current segment and start new one
            if (speaker !== session.currentSpeaker && session.currentText) {
              console.log(`[${sessionId}] Speaker changed from ${session.currentSpeaker} to ${speaker}`);
              const segment = {
                speaker: session.currentSpeaker,
                text: session.currentText.trim(),
                timestamp: new Date().toLocaleTimeString()
              };
              socket.emit('transcription', { segment, isPartial: false, sessionId });
              session.currentText = formattedText;
            } else {
              session.currentText = session.currentText ? session.currentText + (formattedText.match(/^[.,?!]/) ? '' : ' ') + formattedText : formattedText;
            }
            // Log if this is the first speaker detection
            if (!session.currentSpeaker && speaker) {
              console.log(`[${sessionId}] Initial speaker detected: ${speaker}`);
            }
            session.currentSpeaker = speaker;

            // Emit complete segment if it ends with punctuation
            if (/[.!?]$/.test(session.currentText)) {
              const segment = {
                speaker: session.currentSpeaker,
                text: session.currentText.trim(),
                timestamp: new Date().toLocaleTimeString()
              };
              socket.emit('transcription', { segment, isPartial: false, sessionId });
              session.currentText = '';
              console.log(`[${sessionId}] Speaker ${session.currentSpeaker} segment completed due to punctuation`);
              session.currentSpeaker = '';
            }
          }
        });


        try {
          const jwt = await createSpeechmaticsJWT({
            type: 'rt',
            apiKey,
            ttl: 60, // 1 minute
          });

          // Build transcription config with optional doctor speaker identifier
          const transcriptionConfig: any = {
            language: 'en',
            operating_point: 'enhanced',
            enable_partials: true,
            diarization: 'speaker',
            max_delay: 1.5,
            conversation_config: {
              end_of_utterance_silence_trigger: 0.5
            }
          };

          // Add doctor speaker identifier if provided
          if (doctorSpeakerIdentifier) {
            transcriptionConfig.speaker_diarization_config = {
              speakers: {
                "Doctor": [doctorSpeakerIdentifier]
              }
            };
            console.log(`[${sessionId}] Using doctor speaker identifier: ${doctorSpeakerIdentifier}`);
          }

          await session.client.start(jwt, { transcription_config: transcriptionConfig });
          
          console.log(`Speechmatics connection initiated for session: ${sessionId}`);
        } catch (error) {
          console.error(`Connection error for session ${sessionId}:`, error);
          cleanupClient(sessionId);
          socket.emit('error', { message: 'Connection error with speech service', sessionId });
          return;
        }
      }

      // Wait for connection before sending audio
      if (!session.isConnected) {
        console.log(`Waiting for Speechmatics connection for session: ${sessionId}...`);
        const maxWaitTime = 10000; // 10 seconds
        const startTime = Date.now();
        
        await new Promise<void>((resolve, reject) => {
          const checkConnection = () => {
            if (session.isConnected) {
              resolve();
            } else if (Date.now() - startTime > maxWaitTime) {
              reject(new Error('Connection timeout'));
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
      }

      // Convert base64 audio to buffer and send to Speechmatics
      const audioBuffer = Buffer.from(data.audio.split(',')[1], 'base64');
      if (session.client && session.isConnected) {
        await session.client.sendAudio(audioBuffer);
      } else {
        throw new Error('Speech service not connected');
      }

    } catch (error) {
      console.error(`Error processing audio for session ${data.sessionId || 'default'}:`, error);
      cleanupClient(data.sessionId || 'default');
      socket.emit('error', { message: 'Error processing audio', sessionId: data.sessionId || 'default' });
    }
  });

  socket.on('stopRecording', async (data) => {
    const sessionId = data?.sessionId || 'default';
    const session = clients.get(sessionId);
    
    if (session?.client) {
      try {
        // Emit any remaining text before stopping
        if (session.currentText) {
          const segment = {
            speaker: session.currentSpeaker,
            text: session.currentText.trim()
              .replace(/\s*([.,?!])\s*/g, '$1')
              .replace(/([.,?!])(?=.)/g, '$1 ')
              .trim(),
            timestamp: new Date().toLocaleTimeString()
          };
          socket.emit('transcription', { segment, isPartial: false, sessionId });
        }
        
        if (session.currentSpeaker) {
          console.log(`[${sessionId}] Speaker ${session.currentSpeaker} session ended due to stop recording`);
        }
        
        // Clean up without waiting for EndOfTranscript
        cleanupClient(sessionId);
      } catch (error) {
        console.error(`Error stopping recognition for session ${sessionId}:`, error);
        cleanupClient(sessionId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    
    // Clean up all sessions for this socket
    for (const [sessionId, session] of clients.entries()) {
      if (session.client) {
        if (session.currentText) {
          const segment = {
            speaker: session.currentSpeaker,
              text: session.currentText.trim()
              .replace(/\s*([.,?!])\s*/g, '$1')
              .replace(/([.,?!])(?=.)/g, '$1 ')
              .trim(),
            timestamp: new Date().toLocaleTimeString()
          };
          socket.emit('transcription', { segment, isPartial: false, sessionId });
        }
        
        if (session.currentSpeaker) {
          console.log(`[${sessionId}] Speaker ${session.currentSpeaker} session ended due to disconnect`);
        }
        
        // Clean up without waiting
        cleanupClient(sessionId);
      }
    }
    
    clients.clear();
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
