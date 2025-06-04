import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RealtimeClient, RealtimeMessage, RealtimeServerMessage } from '@speechmatics/real-time-client';

let url = "wss://preview2.rt.speechmatics.com/v2";  

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
  let client: RealtimeClient | null = null;
  let isConnected = false;
  let currentSpeaker = '';
  let currentText = '';
  const speakerTexts = new Map<string, string>();

  socket.on('audioData', async (data) => {
    try {
      if (!client) {
        const apiKey = process.env.SPEECHMATICS_API_KEY;
        if (!apiKey) {
          throw new Error('SPEECHMATICS_API_KEY not set');
        }

        if(url != ""){
          client = new RealtimeClient({url:url});
        }
        else{
          client = new RealtimeClient();
        }

        client.addEventListener('receiveMessage', (evt: MessageEvent<RealtimeServerMessage>) => {
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
            if (speaker === currentSpeaker || !currentSpeaker) {
              const segment = {
                speaker,
                text: (currentText + (currentText && !formattedText.match(/^[.,?!]/) ? ' ' : '') + formattedText).trim(),
                timestamp: new Date().toLocaleTimeString()
              };
              socket.emit('transcription', { segment, isPartial: true });
            }
          } else if (messageData.message === 'AddTranscript') {
            // If speaker changes, emit current segment and start new one
            if (speaker !== currentSpeaker && currentText) {
              console.log(`Speaker changed from ${currentSpeaker} to ${speaker}`);
              const segment = {
                speaker: currentSpeaker,
                text: currentText.trim(),
                timestamp: new Date().toLocaleTimeString()
              };
              socket.emit('transcription', { segment, isPartial: false });
              currentText = formattedText;
            } else {
              currentText = currentText ? currentText + (formattedText.match(/^[.,?!]/) ? '' : ' ') + formattedText : formattedText;
            }
            // Log if this is the first speaker detection
            if (!currentSpeaker && speaker) {
              console.log(`Initial speaker detected: ${speaker}`);
            }
            currentSpeaker = speaker;

            // Emit complete segment if it ends with punctuation
            if (/[.!?]$/.test(currentText)) {
              const segment = {
                speaker: currentSpeaker,
                text: currentText.trim(),
                timestamp: new Date().toLocaleTimeString()
              };
              socket.emit('transcription', { segment, isPartial: false });
              currentText = '';
              console.log(`Speaker ${currentSpeaker} segment completed due to punctuation`);
              currentSpeaker = '';
            }
          }
        });

        try {
          const jwt = await createSpeechmaticsJWT({
            type: 'rt',
            apiKey,
            ttl: 60, // 1 minute
          });

          await client.start(jwt, {
            transcription_config: {
              language: 'en',
              operating_point: 'enhanced',
              enable_partials: true,
              diarization: 'speaker',
              max_delay: 1.2
            }
          });
          
          isConnected = true;
          console.log('Speechmatics connection established');
        } catch (error) {
          console.error('Connection error:', error);
          socket.emit('error', { message: 'Connection error with speech service' });
          throw error;
        }
      }

      // Wait for connection before sending audio
      if (!isConnected) {
        console.log('Waiting for Speechmatics connection...');
        await new Promise<void>((resolve) => {
          const checkConnection = () => {
            if (isConnected) {
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
      }

      // Convert base64 audio to buffer and send to Speechmatics
      const audioBuffer = Buffer.from(data.audio.split(',')[1], 'base64');
      if (client && isConnected) {
        await client.sendAudio(audioBuffer);
      } else {
        throw new Error('Speech service not connected');
      }

    } catch (error) {
      console.error('Error processing audio:', error);
      socket.emit('error', { message: 'Error processing audio' });
    }
  });

  socket.on('stopRecording', async () => {
    if (client) {
      try {
        // Emit any remaining text before stopping
        if (currentText) {
          const segment = {
            speaker: currentSpeaker,
            text: currentText.trim()
              .replace(/\s*([.,?!])\s*/g, '$1')
              .replace(/([.,?!])(?=.)/g, '$1 ')
              .trim(),
            timestamp: new Date().toLocaleTimeString()
          };
          socket.emit('transcription', { segment, isPartial: false });
        }
        
        if (currentSpeaker) {
          console.log(`Speaker ${currentSpeaker} session ended due to stop recording`);
        }
        await client.stopRecognition();
        client = null;
        currentSpeaker = '';
        currentText = '';
        speakerTexts.clear();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (client) {
      if (currentText) {
        const segment = {
          speaker: currentSpeaker,
            text: currentText.trim()
            .replace(/\s*([.,?!])\s*/g, '$1')
            .replace(/([.,?!])(?=.)/g, '$1 ')
            .trim(),
          timestamp: new Date().toLocaleTimeString()
        };
        socket.emit('transcription', { segment, isPartial: false });
      }
      
      if (currentSpeaker) {
        console.log(`Speaker ${currentSpeaker} session ended due to disconnect`);
      }
      client.stopRecognition().catch(console.error);
      client = null;
      currentSpeaker = '';
      currentText = '';
      speakerTexts.clear();
    }
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
