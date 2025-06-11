import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { io, Socket } from 'socket.io-client';
import TranscriptionOverlay from './TranscriptionOverlay';

// Debounce utility function
const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

interface MedicalAnalysis {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icdCodes: string[];
  keyTerms: string[];
}

interface SpeechSegment {
  speaker: string;
  text: string;
  timestamp?: string;
}

interface EnhancedMedicalEditorProps {
  analysis: MedicalAnalysis | null;
  isLoading: boolean;
  onVoiceCommand?: (command: string, section?: string) => void;
  selectedDevice?: string;
  realTimeTranscript?: SpeechSegment[];
  isMainRecording?: boolean;
  devices?: MediaDeviceInfo[];
  partialSegment?: SpeechSegment | null;
  doctorSpeakerId?: string;
  selectedDoctor?: { id: string; name: string; speaker_identifier: string } | null;
}

interface EditorState {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icdCodes: string[];
  keyTerms: string[];
}

interface HistoryState {
  state: EditorState;
  timestamp: number;
}

// Recording Timer Component
const RecordingTimer: React.FC = () => {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTime(0);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className="text-sm font-mono text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
      {formatTime(time)}
    </span>
  );
};

// Tiptap Editor Component
const TiptapEditor: React.FC<{
  content: string;
  onChange: (content: string) => void;
  onFocus: () => void;
  placeholder: string;
  editorRef?: React.MutableRefObject<Editor | null>;
}> = ({ content, onChange, onFocus, placeholder, editorRef }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[100px] p-3',
      },
    },
  });

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Don't sync content if the editor is currently focused
      if (editor.isFocused) {
        return;
      }
      
      // Preserve the current selection/cursor position
      const { from, to } = editor.state.selection;
      const wasFocused = editor.isFocused;
      
      editor.commands.setContent(content);
      
      // Restore focus and cursor position if editor was previously focused
      if (wasFocused) {
        // Use setTimeout to ensure the content is set before restoring focus
        setTimeout(() => {
          try {
            editor.commands.focus();
            // Try to restore cursor position if it's still valid
            if (from <= editor.state.doc.content.size && to <= editor.state.doc.content.size) {
              editor.commands.setTextSelection({ from, to });
            }
          } catch (e) {
            // If setting selection fails, just focus at the end
            editor.commands.focus('end');
          }
        }, 0);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="min-h-[100px] p-3 bg-gray-50 rounded">Loading editor...</div>;
  }

  return (
    <div className="border border-gray-300 rounded-md bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-sm rounded ${
            editor.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-sm rounded ${
            editor.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 text-sm rounded ${
            editor.isActive('bulletList') ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 text-sm rounded ${
            editor.isActive('orderedList') ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          1. List
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`px-2 py-1 text-sm rounded ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          ←
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`px-2 py-1 text-sm rounded ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          ↔
        </button>
      </div>
      
      {/* Editor Content */}
      <div className="relative">
        <EditorContent editor={editor} />
        {!content && (
          <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
};

const EnhancedMedicalEditor: React.FC<EnhancedMedicalEditorProps> = ({ 
  analysis, 
  isLoading, 
  onVoiceCommand,
  selectedDevice = '',
  realTimeTranscript = [],
  isMainRecording = false,
  devices = [],
  partialSegment = null,
  doctorSpeakerId = 'S1',
  selectedDoctor = null
}) => {
  // Use the selected doctor's speaker identifier if available, otherwise fall back to doctorSpeakerId
  const effectiveDoctorSpeakerId = selectedDoctor?.speaker_identifier || doctorSpeakerId;
  const [editorState, setEditorState] = useState<EditorState>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    icdCodes: [],
    keyTerms: []
  });

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeSection, setActiveSection] = useState<string>('subjective');
  const [isVoiceInputEnabled, setIsVoiceInputEnabled] = useState<boolean>(false);
  const [voiceMode, setVoiceMode] = useState<'dictation' | 'command'>('dictation');
  const [commandFeedback, setCommandFeedback] = useState<string>('');
  
  // Independent recording state for medical notes
  const [isNotesRecording, setIsNotesRecording] = useState<boolean>(false);
  const [notesTranscript, setNotesTranscript] = useState<SpeechSegment[]>([]);
  const [notesPartialSegment, setNotesPartialSegment] = useState<SpeechSegment | null>(null);
  const [notesFinalSegment, setNotesFinalSegment] = useState<SpeechSegment | null>(null);
  const [isTranscribingPaused, setIsTranscribingPaused] = useState<boolean>(false);
  const [listenToAllSpeakers, setListenToAllSpeakers] = useState<boolean>(false);
  
  // Track processed segments to prevent duplicates
  const [processedSegmentIds, setProcessedSegmentIds] = useState<Set<string>>(new Set());
  const lastProcessedTextRef = useRef<string>('');
  const lastInsertedTextRef = useRef<string>('');
  const lastCommandExecutedRef = useRef<string>('');
  const commandExecutionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // WebSocket and MediaRecorder refs for independent recording
  const notesSocketRef = useRef<Socket | null>(null);
  const notesMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const notesStreamRef = useRef<MediaStream | null>(null);

  // Editor refs for Tiptap
  const subjectiveRef = useRef<Editor | null>(null);
  const objectiveRef = useRef<Editor | null>(null);
  const assessmentRef = useRef<Editor | null>(null);
  const planRef = useRef<Editor | null>(null);
  
  // Focus management
  const focusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastIntendedFocusRef = useRef<string>('subjective');
  const preventContentSyncRef = useRef<boolean>(false);

  // Initialize WebSocket connection for independent notes recording
  useEffect(() => {
    notesSocketRef.current = io('http://localhost:3001');

    notesSocketRef.current.on('transcription', (data) => {
      // Only process if this is our notes recording session
      if (data.sessionId === 'medical-notes' && isNotesRecording) {
        if (data.isPartial) {
          setNotesPartialSegment(data.segment);
        } else {
          // Show final segment in overlay before clearing
          setNotesFinalSegment(data.segment);
          setNotesPartialSegment(null);
          
          // Clear final segment after showing it
          setTimeout(() => {
            setNotesFinalSegment(null);
          }, 3000);
          
          const text = data.segment.text.toLowerCase().trim();
          if (isVoiceCommand(text)) {
            handleVoiceCommand(text);
          }
          
          setNotesTranscript(prev => [...prev, data.segment]);
        }
      }
    });

    notesSocketRef.current.on('error', (data) => {
      if (data.sessionId === 'medical-notes') {
        console.error('Notes recording error:', data.message);
        stopNotesRecording();
      }
    });

    return () => {
      notesSocketRef.current?.disconnect();
    };
  }, [isNotesRecording]);

  // Convert markdown formatting to HTML for Tiptap
  const convertMarkdownToHtml = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold** to <strong>
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // *italic* to <em>
      .replace(/\n/g, '<br>') // newlines to <br>
      .replace(/• /g, '<li>') // bullet points to list items
      .replace(/<li>/g, '</li><li>') // proper list formatting
      .replace(/^<\/li>/, '') // remove first closing tag
      .replace(/<li>$/, '</li>'); // ensure last item is closed
  };

  // Granular history management with sentence-level tracking
  const addToHistory = useCallback((state: EditorState) => {
    const newHistoryItem: HistoryState = {
      state: JSON.parse(JSON.stringify(state)),
      timestamp: Date.now()
    };
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newHistoryItem);
      // Keep only last 100 states for more granular undo
      const trimmedHistory = newHistory.slice(-100);
      
      // Update history index to point to the new item
      const newIndex = trimmedHistory.length - 1;
      setHistoryIndex(newIndex);
      
      return trimmedHistory;
    });
  }, [historyIndex]);

  // Debounced history for continuous typing (500ms delay)
  const addToHistoryDebounced = useCallback(
    debounce((state: EditorState) => {
      addToHistory(state);
    }, 500),
    [addToHistory]
  );

  // Track if we're in the middle of a history operation
  const isHistoryOperationRef = useRef(false);

  // Initialize editor state when analysis is loaded
  useEffect(() => {
    if (analysis) {
      const newState: EditorState = {
        subjective: convertMarkdownToHtml(analysis.subjective),
        objective: convertMarkdownToHtml(analysis.objective),
        assessment: convertMarkdownToHtml(analysis.assessment),
        plan: convertMarkdownToHtml(analysis.plan),
        icdCodes: [...analysis.icdCodes],
        keyTerms: [...analysis.keyTerms]
      };
      setEditorState(newState);
      addToHistory(newState);
    }
  }, [analysis, addToHistory]);

  const updateSection = useCallback((
    section: keyof EditorState, 
    value: string | string[], 
    isVoiceInput = false
  ) => {
    setEditorState(prev => {
      const newState = { ...prev, [section]: value };
      
      // Don't add to history if we're in the middle of a history operation
      if (!isHistoryOperationRef.current) {
        if (isVoiceInput) {
          // Use debounced history for voice input to prevent too many entries
          addToHistoryDebounced(newState);
        } else {
          // Use debounced history for manual typing as well to capture sentence-level changes
          addToHistoryDebounced(newState);
        }
      }
      
      return newState;
    });
  }, [addToHistoryDebounced]);

  const focusSection = useCallback((section: string) => {
    setActiveSection(section);
    const refs = {
      subjective: subjectiveRef,
      objective: objectiveRef,
      assessment: assessmentRef,
      plan: planRef
    };
    
    const ref = refs[section as keyof typeof refs];
    if (ref?.current) {
      ref.current.commands.focus();
    }
  }, []);

  const insertText = useCallback((text: string, section?: string) => {
    const targetSection = section || activeSection;
    const refs = {
      subjective: subjectiveRef,
      objective: objectiveRef,
      assessment: assessmentRef,
      plan: planRef
    };
    
    const ref = refs[targetSection as keyof typeof refs];
    if (ref?.current) {
      // Only focus if we're targeting a different section
      if (section && section !== activeSection) {
        setActiveSection(section);
        ref.current.commands.focus();
      } else if (!ref.current.isFocused) {
        ref.current.commands.focus();
      }
      
      ref.current.commands.insertContent(text);
      
      // Track the last inserted text for formatting commands
      if (!text.includes('<br>') && !text.includes('<li>') && text.trim().length > 0) {
        lastInsertedTextRef.current = text.trim();
      }
    }
  }, [activeSection]);

  const undo = useCallback(() => {
    if (historyIndex > 0 && history.length > 0) {
      const prevState = history[historyIndex - 1];
      // Add safety check to ensure prevState exists and has a state property
      if (prevState && prevState.state) {
        const currentActiveSection = activeSection; // Preserve current active section
        
        // Set flag to prevent adding to history during this operation
        isHistoryOperationRef.current = true;
        
        // Force update the editor content by temporarily blurring all editors
        const refs = {
          subjective: subjectiveRef,
          objective: objectiveRef,
          assessment: assessmentRef,
          plan: planRef
        };
        
        // Blur all editors to allow content sync
        Object.values(refs).forEach(ref => {
          if (ref.current) {
            ref.current.commands.blur();
          }
        });
        
        setEditorState(prevState.state);
        setHistoryIndex(prev => prev - 1);
        
        // Clear the flag after the operation
        setTimeout(() => {
          isHistoryOperationRef.current = false;
          focusSection(currentActiveSection);
        }, 50);
      }
    }
  }, [history, historyIndex, activeSection, focusSection]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && history.length > 0) {
      const nextState = history[historyIndex + 1];
      // Add safety check to ensure nextState exists and has a state property
      if (nextState && nextState.state) {
        const currentActiveSection = activeSection; // Preserve current active section
        
        // Set flag to prevent adding to history during this operation
        isHistoryOperationRef.current = true;
        
        // Force update the editor content by temporarily blurring all editors
        const refs = {
          subjective: subjectiveRef,
          objective: objectiveRef,
          assessment: assessmentRef,
          plan: planRef
        };
        
        // Blur all editors to allow content sync
        Object.values(refs).forEach(ref => {
          if (ref.current) {
            ref.current.commands.blur();
          }
        });
        
        setEditorState(nextState.state);
        setHistoryIndex(prev => prev + 1);
        
        // Clear the flag after the operation
        setTimeout(() => {
          isHistoryOperationRef.current = false;
          focusSection(currentActiveSection);
        }, 50);
      }
    }
  }, [history, historyIndex, activeSection, focusSection]);

  // Enhanced voice command handler with feedback
  const handleVoiceCommand = useCallback((command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    
    // Prevent duplicate command execution within 500ms
    const commandKey = lowerCommand + ':' + activeSection;
    if (lastCommandExecutedRef.current === commandKey) {
      return; // Skip duplicate command
    }
    
    // Clear any existing timeout
    if (commandExecutionTimeoutRef.current) {
      clearTimeout(commandExecutionTimeoutRef.current);
    }
    
    // Set the command as executed
    lastCommandExecutedRef.current = commandKey;
    
    // Clear the command execution tracking after 500ms
    commandExecutionTimeoutRef.current = setTimeout(() => {
      lastCommandExecutedRef.current = '';
    }, 500);
    
    let commandExecuted = false;
    let feedbackMessage = '';
    
    // Navigation commands
    if (lowerCommand.includes('go to') || lowerCommand.includes('skip to') || lowerCommand.includes('switch to')) {
      if (lowerCommand.includes('subjective')) {
        focusSection('subjective');
        feedbackMessage = 'Switched to Subjective section';
        commandExecuted = true;
      } else if (lowerCommand.includes('objective')) {
        focusSection('objective');
        feedbackMessage = 'Switched to Objective section';
        commandExecuted = true;
      } else if (lowerCommand.includes('assessment')) {
        focusSection('assessment');
        feedbackMessage = 'Switched to Assessment section';
        commandExecuted = true;
      } else if (lowerCommand.includes('plan')) {
        focusSection('plan');
        feedbackMessage = 'Switched to Plan section';
        commandExecuted = true;
      }
    }
    
    // Template insertion commands
    else if (lowerCommand.includes('add medication') || lowerCommand.includes('insert medication')) {
      const medicationTemplate = '<br>• Medication: [name] [dose] [frequency] [duration]<br>';
      insertText(medicationTemplate, 'plan');
      focusSection('plan');
      feedbackMessage = 'Added medication template to Plan';
      commandExecuted = true;
    }
    
    else if (lowerCommand.includes('add diagnosis') || lowerCommand.includes('insert diagnosis')) {
      const diagnosisTemplate = '<br>• Diagnosis: [condition]<br>';
      insertText(diagnosisTemplate, 'assessment');
      focusSection('assessment');
      feedbackMessage = 'Added diagnosis template to Assessment';
      commandExecuted = true;
    }
    
    else if (lowerCommand.includes('add vital signs') || lowerCommand.includes('insert vitals')) {
      const vitalsTemplate = '<br>• BP: [value] mmHg<br>• HR: [value] bpm<br>• Temp: [value]°F<br>• RR: [value]/min<br>• O2 Sat: [value]%<br>';
      insertText(vitalsTemplate, 'objective');
      focusSection('objective');
      feedbackMessage = 'Added vital signs template to Objective';
      commandExecuted = true;
    }
    
    // Punctuation and symbol commands
    else if (lowerCommand.includes('backslash')) {
      const refs = {
        subjective: subjectiveRef,
        objective: objectiveRef,
        assessment: assessmentRef,
        plan: planRef
      };
      const ref = refs[activeSection as keyof typeof refs];
      if (ref?.current) {
        ref.current.commands.focus();
        ref.current.commands.insertContent('\\');
        feedbackMessage = 'Added backslash';
        commandExecuted = true;
      }
    }
    
    else if (lowerCommand.includes('forward slash')) {
      const refs = {
        subjective: subjectiveRef,
        objective: objectiveRef,
        assessment: assessmentRef,
        plan: planRef
      };
      const ref = refs[activeSection as keyof typeof refs];
      if (ref?.current) {
        ref.current.commands.focus();
        ref.current.commands.insertContent('/');
        feedbackMessage = 'Added forward slash';
        commandExecuted = true;
      }
    }
    
    // Formatting commands
    else if (lowerCommand.includes('new paragraph')) {
      // Find which editor is currently focused
      const refs = {
        subjective: subjectiveRef,
        objective: objectiveRef,
        assessment: assessmentRef,
        plan: planRef
      };
      
      let focusedEditor = null;
      let focusedSection = '';
      
      // Check which editor is currently focused
      for (const [section, ref] of Object.entries(refs)) {
        if (ref.current && ref.current.isFocused) {
          focusedEditor = ref.current;
          focusedSection = section;
          break;
        }
      }
      
      // If no editor is focused, use the active section
      if (!focusedEditor) {
        const fallbackRef = refs[activeSection as keyof typeof refs];
        if (fallbackRef?.current) {
          focusedEditor = fallbackRef.current;
          focusedSection = activeSection;
        }
      }
      
      if (focusedEditor) {
        focusedEditor.commands.insertContent('<br><br>');
        // Ensure the section state matches the focused editor
        if (focusedSection !== activeSection) {
          setActiveSection(focusedSection);
        }
      }
      
      feedbackMessage = 'Added new paragraph';
      commandExecuted = true;
    }
    
    else if (lowerCommand.includes('new line')) {
      // Find which editor is currently focused
      const refs = {
        subjective: subjectiveRef,
        objective: objectiveRef,
        assessment: assessmentRef,
        plan: planRef
      };
      
      let focusedEditor = null;
      let focusedSection = '';
      
      // Check which editor is currently focused
      for (const [section, ref] of Object.entries(refs)) {
        if (ref.current && ref.current.isFocused) {
          focusedEditor = ref.current;
          focusedSection = section;
          break;
        }
      }
      
      // If no editor is focused, use the active section
      if (!focusedEditor) {
        const fallbackRef = refs[activeSection as keyof typeof refs];
        if (fallbackRef?.current) {
          focusedEditor = fallbackRef.current;
          focusedSection = activeSection;
        }
      }
      
      if (focusedEditor) {
        focusedEditor.commands.insertContent('<br>');
        // Ensure the section state matches the focused editor
        if (focusedSection !== activeSection) {
          setActiveSection(focusedSection);
        }
      }
      
      feedbackMessage = 'Added new line';
      commandExecuted = true;
    }
    
    else if (lowerCommand.includes('bullet point')) {
      const refs = {
        subjective: subjectiveRef,
        objective: objectiveRef,
        assessment: assessmentRef,
        plan: planRef
      };
      const ref = refs[activeSection as keyof typeof refs];
      if (ref?.current) {
        ref.current.commands.focus();
        ref.current.commands.toggleBulletList();
        feedbackMessage = 'Applied bullet list formatting';
        commandExecuted = true;
      }
    }
    
    else if (lowerCommand.includes('numbered list')) {
      const refs = {
        subjective: subjectiveRef,
        objective: objectiveRef,
        assessment: assessmentRef,
        plan: planRef
      };
      const ref = refs[activeSection as keyof typeof refs];
      if (ref?.current) {
        ref.current.commands.focus();
        ref.current.commands.toggleOrderedList();
        feedbackMessage = 'Applied numbered list formatting';
        commandExecuted = true;
      }
    }
    
    // History commands
    else if (lowerCommand.includes('undo')) {
      undo();
      feedbackMessage = 'Undid last action';
      commandExecuted = true;
    } 
    
    else if (lowerCommand.includes('redo')) {
      redo();
      feedbackMessage = 'Redid last action';
      commandExecuted = true;
    }
    
    // Mode switching commands
    else if (lowerCommand.includes('dictation mode') || lowerCommand.includes('start dictating')) {
      setVoiceMode('dictation');
      feedbackMessage = 'Switched to Dictation Mode';
      commandExecuted = true;
    }
    
    else if (lowerCommand.includes('command mode')) {
      setVoiceMode('command');
      feedbackMessage = 'Switched to Command Mode';
      commandExecuted = true;
    }
    
    // Show feedback
    if (commandExecuted) {
      setCommandFeedback(feedbackMessage);
      setTimeout(() => setCommandFeedback(''), 3000);
    }
    
    if (onVoiceCommand) {
      onVoiceCommand(command, activeSection);
    }
  }, [focusSection, insertText, undo, redo, activeSection, onVoiceCommand]);

  // Enhanced voice command detection
  const isVoiceCommand = useCallback((text: string): boolean => {
    const commands = [
      'skip to',
      'go to',
      'switch to',
      'add medication',
      'insert medication',
      'add diagnosis',
      'insert diagnosis',
      'add vital signs',
      'insert vitals',
      'new paragraph',
      'new line',
      'backslash',
      'forward slash',
      'bullet point',
      'numbered list',
      'undo',
      'redo',
      'dictation mode',
      'start dictating',
      'command mode'
    ];
    
    return commands.some(command => text.toLowerCase().includes(command.toLowerCase()));
  }, []);

  // Process real-time transcript for streaming to active section (Doctor only or all speakers based on toggle)
  useEffect(() => {
    if (realTimeTranscript && realTimeTranscript.length > 0 && isMainRecording && isVoiceInputEnabled) {
      const latestSegment = realTimeTranscript[realTimeTranscript.length - 1];
      
      // Only process if this is from the doctor (unless listening to all speakers)
      // Handle both old format (S1, Doctor) and new format (Patient-1, Doctor)
      const isDoctorSpeaker = latestSegment.speaker === effectiveDoctorSpeakerId || 
                             latestSegment.speaker === "Doctor" ||
                             (effectiveDoctorSpeakerId?.startsWith('S') && latestSegment.speaker === effectiveDoctorSpeakerId.replace(/^S(\d+)$/, 'Patient-$1'));
      
      if (!listenToAllSpeakers && !isDoctorSpeaker) {
        return;
      }
      
      const text = latestSegment.text.toLowerCase().trim();
      
      if (voiceMode === 'command') {
        // Command Mode: Only process commands, don't dictate text
        if (isVoiceCommand(text)) {
          handleVoiceCommand(text);
        } else {
          // Show feedback that regular speech was ignored in command mode
          setCommandFeedback('Command not recognized. Try: "go to subjective", "add medication", etc.');
          setTimeout(() => setCommandFeedback(''), 2000);
        }
      } else {
        // Dictation Mode: Check for commands first, then dictate
        if (isVoiceCommand(text)) {
          handleVoiceCommand(text);
        } else {
          // Stream text to the active section in real-time
          insertText(' ' + latestSegment.text);
          // Update the section state to trigger history
          updateSection(activeSection as keyof EditorState, editorState[activeSection as keyof EditorState], true);
        }
      }
    }
  }, [realTimeTranscript, isMainRecording, isVoiceInputEnabled, voiceMode, isVoiceCommand, handleVoiceCommand, insertText, effectiveDoctorSpeakerId, listenToAllSpeakers]);

  // Process independent notes recording transcript with duplicate detection (Doctor only or all speakers based on toggle)
  useEffect(() => {
    if (notesTranscript.length > 0 && isNotesRecording) {
      const latestSegment = notesTranscript[notesTranscript.length - 1];
      
      // Only process if this is from the doctor (unless listening to all speakers)
      // Handle both old format (S1, Doctor) and new format (Patient-1, Doctor)
      const isDoctorSpeaker = latestSegment.speaker === "Doctor" ||
                             latestSegment.speaker === effectiveDoctorSpeakerId ||
                             (effectiveDoctorSpeakerId?.startsWith('S') && latestSegment.speaker === effectiveDoctorSpeakerId.replace(/^S(\d+)$/, 'Patient-$1'));
      
      if (!listenToAllSpeakers && !isDoctorSpeaker) {
        return;
      }
      
      const segmentId = `${latestSegment.speaker}-${latestSegment.timestamp}-${latestSegment.text}`;
      
      // Skip if we've already processed this segment
      if (processedSegmentIds.has(segmentId)) {
        return;
      }
      
      setProcessedSegmentIds(prev => new Set([...prev, segmentId]));
      
      const text = latestSegment.text.toLowerCase().trim();
      
      // Check if this text is significantly different from the last processed text
      if (lastProcessedTextRef.current && 
          latestSegment.text.length > 0 && 
          lastProcessedTextRef.current.includes(latestSegment.text.substring(0, Math.min(20, latestSegment.text.length)))) {
        return;
      }
      
      lastProcessedTextRef.current = latestSegment.text;
      
      if (voiceMode === 'command') {
        // Command Mode: Only process commands, don't dictate text
        if (isVoiceCommand(text)) {
          handleVoiceCommand(text);
        } else {
          // Show feedback that regular speech was ignored in command mode
          setCommandFeedback('Command not recognized. Try: "go to subjective", "add medication", etc.');
          setTimeout(() => setCommandFeedback(''), 2000);
        }
      } else {
        // Dictation Mode: Check for commands first, then dictate
        if (isVoiceCommand(text)) {
          handleVoiceCommand(text);
        } else {
          // Clean the text and insert it
          const cleanText = latestSegment.text.trim();
          if (cleanText.length > 0) {
            insertText(' ' + cleanText);
          }
        }
      }
    }
  }, [notesTranscript, isNotesRecording, voiceMode, isVoiceCommand, handleVoiceCommand, insertText, processedSegmentIds, effectiveDoctorSpeakerId, listenToAllSpeakers]);

  // Process partial segments from independent recording
  useEffect(() => {
    if (notesPartialSegment && isNotesRecording && voiceMode === 'dictation') {
      const text = notesPartialSegment.text.toLowerCase().trim();
      if (!isVoiceCommand(text)) {
        // Show partial text as user speaks (optional - can be removed if too distracting)
        // insertText(' ' + notesPartialSegment.text);
      }
    }
  }, [notesPartialSegment, isNotesRecording, voiceMode, isVoiceCommand]);

  // Start independent notes recording
  const startNotesRecording = async () => {
    try {
      // Preserve current editor focus
      const currentActiveSection = activeSection;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { deviceId: selectedDevice } 
      });
      notesStreamRef.current = stream;
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && notesSocketRef.current) {
          const reader = new FileReader();
          reader.onloadend = () => {
            notesSocketRef.current?.emit('audioData', { 
              audio: reader.result,
              sessionId: 'medical-notes',
              doctorSpeakerIdentifier: effectiveDoctorSpeakerId
            });
          };
          reader.readAsDataURL(event.data);
        }
      };

      recorder.start(1000); // Collect data every second
      notesMediaRecorderRef.current = recorder;
      setIsNotesRecording(true);
      setNotesTranscript([]);
      setNotesPartialSegment(null);
      
      // Restore focus to the previously active editor
      setTimeout(() => {
        focusSection(currentActiveSection);
      }, 100);
      
      setCommandFeedback('Notes recording started');
      setTimeout(() => setCommandFeedback(''), 2000);
    } catch (error) {
      console.error('Error starting notes recording:', error);
      setCommandFeedback('Failed to start recording');
      setTimeout(() => setCommandFeedback(''), 3000);
    }
  };

  // Stop independent notes recording
  const stopNotesRecording = useCallback(() => {
    if (notesMediaRecorderRef.current && notesStreamRef.current) {
      notesMediaRecorderRef.current.stop();
      notesStreamRef.current.getTracks().forEach(track => track.stop());
      notesSocketRef.current?.emit('stopRecording', { sessionId: 'medical-notes' });
      setIsNotesRecording(false);
      
      setCommandFeedback('Notes recording stopped');
      setTimeout(() => setCommandFeedback(''), 2000);
    }
  }, []);

  // Expose voice command handler to parent
  useEffect(() => {
    (window as any).handleVoiceCommand = handleVoiceCommand;
    return () => {
      delete (window as any).handleVoiceCommand;
    };
  }, [handleVoiceCommand]);

  const exportToFile = () => {
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');
    
    const content = `MEDICAL CONSULTATION NOTES
${new Date().toLocaleString()}

SUBJECTIVE:
${stripHtml(editorState.subjective)}

OBJECTIVE:
${stripHtml(editorState.objective)}

ASSESSMENT:
${stripHtml(editorState.assessment)}

PLAN:
${stripHtml(editorState.plan)}

ICD-11 CODES:
${editorState.icdCodes.join('\n')}

KEY MEDICAL TERMS:
${editorState.keyTerms.join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-notes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Generating Medical Analysis
            </h3>
            <p className="text-gray-600 text-sm">
              AI is analyzing the consultation and creating structured medical notes...
            </p>
          </div>

          <div className="w-full max-w-md space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700">Processing transcript</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <span className="text-sm text-gray-700">Extracting medical information</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
              <span className="text-sm text-gray-700">Structuring SOAP notes</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
              <span className="text-sm text-gray-700">Identifying ICD codes</span>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500 text-center">
            This usually takes 10-30 seconds
          </div>
        </div>
      </div>
    );
  }

  if (!analysis && !editorState.subjective) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">Medical Notes</h2>
          
          {/* Enhanced Notes Recording Controls */}
          <div className="flex items-center space-x-3 border-l border-gray-300 pl-4">
            {/* Speaker Filter Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setListenToAllSpeakers(!listenToAllSpeakers)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  listenToAllSpeakers
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title={listenToAllSpeakers ? 'Listening to all speakers' : 'Listening to Doctor only'}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1v-1a1 1 0 001-1v-3a1 1 0 000-2H9z" clipRule="evenodd"/>
                </svg>
                {listenToAllSpeakers ? 'All Speakers' : 'Doctor Only'}
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Microphone Button with Audio Visualization */}
              <div className="relative">
                {!isNotesRecording ? (
                  <button
                    onClick={startNotesRecording}
                    className="group relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-3 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
                    title="Start dictation for medical notes"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2z"/>
                      <path d="M5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0 7 7 0 0 1-6 6.93V20h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A7 7 0 0 1 5 11z"/>
                    </svg>
                    <div className="absolute inset-0 bg-green-400 rounded-full opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </button>
                ) : (
                  <div className="relative">
                    <button
                      onClick={stopNotesRecording}
                      className="group relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-3 rounded-full transition-all duration-200 shadow-lg animate-pulse"
                      title="Stop dictation"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
                      </svg>
                    </button>
                    
                    
                  </div>
                )}
              </div>

              {/* Recording Status and Timer */}
              {isNotesRecording && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-red-600">REC</span>
                    </div>
                    <RecordingTimer />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Voice → {activeSection}
                  </div>
                </div>
              )}

              
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {isMainRecording && (
            <div className="bg-green-500 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 animate-pulse">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
              </svg>
              Live Streaming
            </div>
          )}
          {isMainRecording && (
            <button
              onClick={() => setIsVoiceInputEnabled(!isVoiceInputEnabled)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                isVoiceInputEnabled
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={isVoiceInputEnabled ? 'Disable voice input' : 'Enable voice input for editing'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 616 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
              </svg>
              {isVoiceInputEnabled ? 'Voice ON' : 'Voice OFF'}
            </button>
          )}
          <button
            onClick={exportToFile}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Export Notes
          </button>
        </div>
      </div>

      {/* Voice Status and Controls */}
      <div className="mb-4 space-y-3">
        {/* Voice Mode Toggle */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Information:</span>
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setVoiceMode('dictation')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  voiceMode === 'dictation'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-blue-500'
                }`}
              >
                📝 Dictation
              </button>
              <button
                onClick={() => setVoiceMode('command')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  voiceMode === 'command'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-600 hover:text-purple-500'
                }`}
              >
                ⚡ Commands
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Active Section: <span className="font-medium capitalize text-blue-600">{activeSection}</span>
          </div>
        </div>

        {/* Command Feedback */}
        {commandFeedback && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded-md text-sm flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            {commandFeedback}
          </div>
        )}

        {/* Voice Instructions */}
        <div className={`text-sm p-3 rounded-lg ${
          voiceMode === 'dictation' 
            ? 'bg-blue-50 text-blue-700' 
            : 'bg-purple-50 text-purple-700'
        }`}>
          {voiceMode === 'dictation' ? (
            <div>
              <strong>📝 Dictation Mode:</strong> Everything you say will be typed into the active section.
              <br />
              <span className="text-xs">Click a section below to make it active, then start recording.</span>
            </div>
          ) : (
            <div>
              <strong>⚡ Command Mode:</strong> Use voice commands to navigate and perform actions.
              <br />
              <span className="text-xs">Commands: "go to subjective", "add medication", "new paragraph", "new line", "backslash", "forward slash", "bullet point", "numbered list", "undo", "redo"</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Subjective Section */}
        <div className={`bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg ${activeSection === 'subjective' ? 'ring-2 ring-blue-300' : ''}`}>
          <h3 className="font-bold text-blue-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Subjective
            <span className="ml-2 text-xs text-blue-600">(Voice: "skip to subjective")</span>
          </h3>
          <TiptapEditor
            content={editorState.subjective}
            onChange={(value) => updateSection('subjective', value)}
            onFocus={() => {
              if (activeSection !== 'subjective') {
                setActiveSection('subjective');
              }
            }}
            placeholder="Enter subjective findings..."
            editorRef={subjectiveRef}
          />
        </div>

        {/* Objective Section */}
        <div className={`bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg ${activeSection === 'objective' ? 'ring-2 ring-green-300' : ''}`}>
          <h3 className="font-bold text-green-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
            </svg>
            Objective
            <span className="ml-2 text-xs text-green-600">(Voice: "skip to objective")</span>
          </h3>
          <TiptapEditor
            content={editorState.objective}
            onChange={(value) => updateSection('objective', value)}
            onFocus={() => {
              if (activeSection !== 'objective') {
                setActiveSection('objective');
              }
            }}
            placeholder="Enter objective findings..."
            editorRef={objectiveRef}
          />
        </div>

        {/* Assessment Section */}
        <div className={`bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg ${activeSection === 'assessment' ? 'ring-2 ring-orange-300' : ''}`}>
          <h3 className="font-bold text-orange-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Assessment
            <span className="ml-2 text-xs text-orange-600">(Voice: "skip to assessment")</span>
          </h3>
          <TiptapEditor
            content={editorState.assessment}
            onChange={(value) => updateSection('assessment', value)}
            onFocus={() => {
              if (activeSection !== 'assessment') {
                setActiveSection('assessment');
              }
            }}
            placeholder="Enter assessment and diagnosis..."
            editorRef={assessmentRef}
          />
        </div>

        {/* Plan Section */}
        <div className={`bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg ${activeSection === 'plan' ? 'ring-2 ring-purple-300' : ''}`}>
          <h3 className="font-bold text-purple-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
            </svg>
            Plan
            <span className="ml-2 text-xs text-purple-600">(Voice: "skip to plan")</span>
          </h3>
          <TiptapEditor
            content={editorState.plan}
            onChange={(value) => updateSection('plan', value)}
            onFocus={() => {
              if (activeSection !== 'plan') {
                setActiveSection('plan');
              }
            }}
            placeholder="Enter treatment plan..."
            editorRef={planRef}
          />
        </div>

        {/* ICD-11 Codes Section */}
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <h3 className="font-bold text-red-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
            </svg>
            ICD-11 Codes
          </h3>
          <div className="grid gap-2">
            {editorState.icdCodes.map((code, index) => (
              <div key={index} className="bg-white border border-red-200 rounded-md p-3 text-sm">
                <span className="font-mono text-red-700 font-semibold">{code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Medical Terms Section */}
        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg">
          <h3 className="font-bold text-indigo-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.94l1-4H9.03z" clipRule="evenodd"/>
            </svg>
            Key Medical Terms
          </h3>
          <div className="flex flex-wrap gap-2">
            {editorState.keyTerms.map((term, index) => (
              <span key={index} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium border border-indigo-200">
                {term}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Transcription Overlay */}
      <TranscriptionOverlay
        partialSegment={
          // Show all speakers in overlay, but only doctor's words go to editor
          partialSegment || 
          notesPartialSegment || 
          (realTimeTranscript && realTimeTranscript.length > 0 && isVoiceInputEnabled
            ? realTimeTranscript[realTimeTranscript.length - 1]
            : null)
        }
        isVisible={
          (isMainRecording && isVoiceInputEnabled) ||
          isNotesRecording
        }
        activeSection={activeSection}
        position="bottom"
      />
    </div>
  );
};

export default EnhancedMedicalEditor;
