# Medical Transcription Assistant

A real-time medical transcription and AI-powered SOAP note generation demo application. This has been vibe coded to demo what can be possible and it's not recommended to use in production. This is to demonstrate the low-latency real-time transcription from Speechmatics. This system transcribes doctor-patient consultations in real-time and automatically generates structured medical notes following the SOAP (Subjective, Objective, Assessment, Plan) format. Then demonstrates using real-time transcription for dictation. It includes some basic commands.

Disclaimer: No warranty provided for any code or functionality.

## Features

### 🎤 Real-time Transcription
- Live audio transcription using Speechmatics API
- Speaker diarization to distinguish between doctor and patient
- Support for multiple audio input devices
- WebSocket-based real-time communication

### 🤖 AI-Powered Medical Notes
- Automatic SOAP note generation using OpenAI GPT-4o-mini
- Intelligent extraction of medical information
- ICD-10/11 code identification
- Key medical terms highlighting

### ✏️ Advanced Medical Editor
- Rich text editing with medical-specific formatting
- Voice dictation directly into note sections
- Voice commands for navigation and formatting
- Listen only to the "Doctor" for dictation

### 🎯 Voice Commands
- **Navigation**: "Go to subjective", "Switch to plan"
- **Formatting**: "New paragraph", "New line", "Numbered list"

### 📋 Sample Consultations
- Pre-loaded sample medical consultations for testing

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Tiptap** for rich text editing
- **Socket.io** for real-time communication

### Backend
- **Node.js** with Express
- **Socket.io** for WebSocket connections
- **Speechmatics** Real-time API for transcription
- **OpenAI GPT-4o-mini** for medical note generation

## Prerequisites

- Node.js 18+ and npm
- Speechmatics API key
- OpenAI API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medical-transcription
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   SPEECHMATICS_API_KEY=your_speechmatics_api_key_here
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   PORT=3001
   ```

## Usage

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the frontend development server**
   ```bash
   # In a new terminal, from the root directory
   npm run dev
   ```

3. **Access the application**
   - Open your browser to `http://localhost:5173`
   - Allow microphone access when prompted

## Configuration

### API Keys Setup

#### Speechmatics API
1. Sign up at [Speechmatics](https://www.speechmatics.com/)
2. Create a new API key
3. Add it to your `.env` file as `SPEECHMATICS_API_KEY`

#### OpenAI API
1. Sign up at [OpenAI](https://platform.openai.com/)
2. Create a new API key
3. Add it to your `.env` file as `VITE_OPENAI_API_KEY`

### Audio Setup
- Ensure your microphone is working and permissions are granted
- Select the appropriate audio input device from the dropdown
- Test with sample consultations before live use

## Project Structure

```
medical-transcription/
├── src/
│   ├── components/          # React components
│   │   ├── EnhancedMedicalEditor.tsx
│   │   ├── TranscriptionPanel.tsx
│   │   ├── RecordingControls.tsx
│   │   └── ...
│   ├── data/               # Sample data and configurations
│   └── assets/             # Static assets
├── server/                 # Backend Node.js server
│   └── server.ts          # Main server file
├── public/                # Public static files
└── package.json           # Frontend dependencies
```

## Key Components

### EnhancedMedicalEditor
- Rich text editor with medical-specific features
- Voice command processing
- Real-time transcription integration
- SOAP note structure management

### TranscriptionPanel
- Real-time display of transcribed speech
- Speaker identification and formatting
- Timestamp tracking

### RecordingControls
- Audio device selection
- Recording state management
- Sample consultation loader

## Voice Commands Reference

| Command | Action |
|---------|--------|
| "Go to subjective" | Navigate to Subjective section |
| "Go to objective" | Navigate to Objective section |
| "Go to assessment" | Navigate to Assessment section |
| "Go to plan" | Navigate to Plan section |
| "Add medication" | Insert medication template |
| "Add vital signs" | Insert vital signs template |
| "Add diagnosis" | Insert diagnosis template |
| "New paragraph" | Add paragraph break |
| "New line" | Add line break |
| "Bullet point" | Toggle bullet list |
| "Numbered list" | Toggle numbered list |

## Security Considerations

- API keys are stored in environment variables (not committed to version control)
- OpenAI API calls include `dangerouslyAllowBrowser: true` - consider server-side proxy for production
- Audio data is processed in real-time and not permanently stored
- WebSocket connections are CORS-protected

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
# Build frontend
npm run build

# Build backend
cd server
npm run build
```

### Linting
```bash
npm run lint
```

## Deployment

### Environment Variables for Production
- Set `NODE_ENV=production`
- Configure proper CORS origins
- Use HTTPS for secure audio capture
- Consider rate limiting for API endpoints

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Troubleshooting

### Common Issues

**Audio not working**
- Check browser permissions for microphone access
- Ensure audio device is selected and working
- Try refreshing the page

**Transcription not appearing**
- Verify Speechmatics API key is correct
- Check network connectivity
- Look for error messages in browser console

**AI analysis failing**
- Verify OpenAI API key is correct and has sufficient credits
- Check for rate limiting issues
- Ensure transcript has sufficient content

**WebSocket connection issues**
- Verify backend server is running on port 3001
- Check firewall settings
- Ensure CORS configuration is correct

---

**⚠️ Important**: This application is for demonstration purposes. Always verify AI-generated medical content and comply with relevant healthcare regulations and privacy laws in your jurisdiction.
