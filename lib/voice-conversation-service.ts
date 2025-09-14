export interface VoiceConversationState {
  isActive: boolean
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  conversationHistory: ConversationMessage[]
  currentPrompt: string
  needsClarification: boolean
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export class VoiceConversationService {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private currentAudio: HTMLAudioElement | null = null
  private elevenlabsApiKey: string
  public recordingTimeoutId: NodeJS.Timeout | null = null
  private speechRecognition: any = null
  private silenceTimeoutId: NodeJS.Timeout | null = null
  private lastSpeechTime: number = 0
  private speechEndCallback: ((transcript: string) => void) | null = null
  
  constructor(elevenlabsApiKey: string) {
    this.elevenlabsApiKey = elevenlabsApiKey
  }

  // Convert text to speech using ElevenLabs
  async textToSpeech(text: string, voiceId: string = 'pNInz6obpgDQGcFmaJgB'): Promise<Blob> {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.elevenlabsApiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Text-to-speech failed: ${errorText}`)
    }

    return await response.blob()
  }

  // Play audio from blob
  async playAudio(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop any currently playing audio
      if (this.currentAudio) {
        this.currentAudio.pause()
        this.currentAudio = null
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      this.currentAudio = new Audio(audioUrl)

      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        this.currentAudio = null
        resolve()
      }

      this.currentAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        this.currentAudio = null
        reject(new Error('Failed to play audio'))
      }

      this.currentAudio.play()
    })
  }

  // Start live speech recognition with silence detection
  startLiveSpeechRecognition(
    onSpeechEnd: (transcript: string) => void,
    onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void
  ): void {
    try {
      // Check if browser supports speech recognition
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      
      if (!SpeechRecognition) {
        console.error('Speech Recognition API not found')
        throw new Error('Speech recognition not supported in this browser')
      }

      // Create new recognition instance
      this.speechRecognition = new SpeechRecognition()
      this.speechEndCallback = onSpeechEnd

      // Configure speech recognition
      this.speechRecognition.continuous = true // Keep listening
      this.speechRecognition.interimResults = true // Get real-time results
      this.speechRecognition.lang = 'en-US'

      let currentTranscript = ''
      let silenceTimer: NodeJS.Timeout | null = null

      // Function to handle silence
      const handleSilence = () => {
        // Check if service was cleaned up
        if (!this.speechRecognition || this.speechRecognition.stopped || !this.speechEndCallback) {
          return
        }

        if (currentTranscript.trim()) {
          console.log('Silence detected, processing:', currentTranscript)
          if (this.speechEndCallback) {
            this.speechEndCallback(currentTranscript.trim())
          }
          currentTranscript = '' // Reset for next utterance
        }
      }

      // Handle speech results
      this.speechRecognition.onresult = (event: any) => {
        // Check if service was cleaned up
        if (!this.speechRecognition || this.speechRecognition.stopped) {
          return
        }

        // Clear silence timer on any speech
        if (silenceTimer) {
          clearTimeout(silenceTimer)
          silenceTimer = null
        }

        // Get the latest transcript
        let transcript = ''
        let isFinal = false

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript = event.results[i][0].transcript
          isFinal = event.results[i].isFinal

          if (isFinal) {
            currentTranscript += transcript + ' '
          }
        }

        // Update the live transcript
        if (onTranscriptUpdate) {
          const fullTranscript = (currentTranscript + transcript).trim()
          onTranscriptUpdate(fullTranscript, isFinal)
        }

        // Set silence timer
        silenceTimer = setTimeout(handleSilence, 2000) // 2 seconds of silence
      }

      // Handle errors
      this.speechRecognition.onerror = (event: any) => {
        // Check if service was cleaned up
        if (!this.speechRecognition || this.speechRecognition.stopped) {
          return
        }

        console.error('Speech recognition error:', event.error)
        if (event.error === 'no-speech') {
          handleSilence() // Process any existing transcript
        }
      }

      // Automatically restart recognition if it ends
      this.speechRecognition.onend = () => {
        // Check if service was cleaned up
        if (!this.speechRecognition || this.speechRecognition.stopped) {
          return
        }

        try {
          // Small delay to avoid "already started" error
          setTimeout(() => {
            if (this.speechRecognition && !this.speechRecognition.stopped) {
              this.speechRecognition.start()
            }
          }, 100)
        } catch (error) {
          console.error('Failed to restart recognition:', error)
        }
      }

      // Start recognition
      console.log('Starting speech recognition')
      this.speechRecognition.start()
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      throw error
    }
  }

  // Stop live speech recognition
  stopLiveSpeechRecognition(): void {
    if (this.speechRecognition) {
      this.speechRecognition.stopped = true
      this.speechRecognition.stop()
      this.speechRecognition = null
    }
    
    if (this.silenceTimeoutId) {
      clearTimeout(this.silenceTimeoutId)
      this.silenceTimeoutId = null
    }
    
    this.speechEndCallback = null
  }

  // Analyze user input to determine if clarification is needed
  analyzeUserInput(userInput: string): { needsClarification: boolean, clarificationQuestion?: string } {
    const input = userInput.toLowerCase().trim()
    
    // Only ask for clarification in extremely vague cases
    const extremelyVaguePatterns = [
      /^(change|fix|update|modify|make|do|help)$/,
      /^(it|this|that)$/,
      /^(something|anything|nothing)$/,
      /^(yes|no|ok|okay|sure|fine)$/,
      /^(um|uh|er|ah)$/
    ]

    // Check if input is extremely vague (single word commands with no context)
    if (extremelyVaguePatterns.some(pattern => pattern.test(input))) {
      return {
        needsClarification: true,
        clarificationQuestion: "I'd like to help! Could you tell me what specific changes you'd like to make? For example, 'change the button to blue' or 'add a welcome message'."
      }
    }

    // Check if input is too short (less than 2 meaningful words)
    const meaningfulWords = input.split(' ').filter(word => 
      word.length > 2 && !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'can', 'you', 'please'].includes(word)
    )

    if (meaningfulWords.length < 1) {
      return {
        needsClarification: true,
        clarificationQuestion: "I didn't quite catch that. Could you tell me what changes you'd like to make to the design?"
      }
    }

    // Most inputs should be processed directly - let the AI figure it out
    return { needsClarification: false }
  }

  // Stop any currently playing audio
  stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
  }

  // Cleanup resources
  cleanup(): void {
    this.stopCurrentAudio()
    this.stopLiveSpeechRecognition()
    
    if (this.recordingTimeoutId) {
      clearTimeout(this.recordingTimeoutId)
      this.recordingTimeoutId = null
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }

    if (this.mediaRecorder?.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
  }
}