"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Upload, Download, Sparkles, Mic, MicOff, Loader2, Settings, Eye, EyeOff, X, Copy, History, ChevronDown, ZoomOut, ZoomIn, Code, Plus } from "lucide-react"
import { captureWebsiteScreenshot, validateUrl, normalizeUrl } from "@/lib/screenshot-service"
import { VoiceConversationService, type VoiceConversationState, type ConversationMessage } from "@/lib/voice-conversation-service"
import TopBar from "./components/TopBar"
import LeftSidebar from "./components/LeftSidebar"
import CanvasHeader from "./components/CanvasHeader"
import BottomBar from "./components/BottomBar"
import RightPanel from "./components/RightPanel"

const getApiBaseUrl = () => {
  return process.env.NEXT_PUBLIC_NEXUS_API_URL || 'https://nexus-173203641979.us-central1.run.app'
}

interface AspectRatio {
  id: string
  name: string
  ratio: number // width/height
}

const ASPECT_RATIOS: AspectRatio[] = [
  { id: 'square', name: '1:1 (Square)', ratio: 1 },
  { id: 'portrait', name: '3:4 (Portrait full screen)', ratio: 3/4 },
  { id: 'fullscreen', name: '4:3 (Fullscreen)', ratio: 4/3 },
  { id: 'mobile', name: '9:16 (Portrait, common for mobile)', ratio: 9/16 },
  { id: 'widescreen', name: '16:9 (Widescreen)', ratio: 16/9 },
  { id: 'freestyle', name: 'Free Style', ratio: 1 }
]



export default function FigmaAIApp() {
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [generatedCodeUrl, setGeneratedCodeUrl] = useState<string | null>(null)
  const [importedImage, setImportedImage] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [error, setError] = useState<string | null>(null)
  const [importMetadata, setImportMetadata] = useState<any>(null)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [startDragPosition, setStartDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [scrollPosition, setScrollPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [imagePosition] = useState<{ x: number; y: number }>({ x: 32, y: 32 })
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isMovingBox, setIsMovingBox] = useState(false)
  const [moveStart, setMoveStart] = useState<{ x: number; y: number } | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number } | null>(null)
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | null>(null)
  const [selectionPrompt, setSelectionPrompt] = useState("")
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [isProcessingSelection, setIsProcessingSelection] = useState(false)
  const [isApplyingLiveModeChanges, setIsApplyingLiveModeChanges] = useState(false)
  const [promptHistory, setPromptHistory] = useState<{timestamp: number; prompt: string; requestId: string}[]>([])
  const [promptCache, setPromptCache] = useState<{[historyIndex: number]: {instructions: string; assets: any[]}}>({})
  const [showPromptPanel, setShowPromptPanel] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [codeCopySuccess, setCodeCopySuccess] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentView, setCurrentView] = useState<'design'>('design')
  const [imageHistory, setImageHistory] = useState<{image: string; description: string; prompt?: string; reference?: string; timestamp: number; generatedCodeUrl?: string}[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [showPromptPopup, setShowPromptPopup] = useState(false)
  const [promptPopupData, setPromptPopupData] = useState<{instructions: string; assets: any[]} | null>(null)
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const imageWrapperRef = useRef<HTMLDivElement>(null)
  const [geminiApiKey, setGeminiApiKey] = useState<string>('')
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState<string>('')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [tempGeminiApiKey, setTempGeminiApiKey] = useState<string>('')
  const [tempElevenlabsApiKey, setTempElevenlabsApiKey] = useState<string>('')
  const [isValidatingGemini, setIsValidatingGemini] = useState(false)
  const [geminiValidationResult, setGeminiValidationResult] = useState<{valid: boolean; message: string} | null>(null)
  const [showModelSettingsModal, setShowModelSettingsModal] = useState(false)
  const [showUsageGuideModal, setShowUsageGuideModal] = useState(false)
  const [imageGenerationModel, setImageGenerationModel] = useState('gemini-2.5-flash-image-preview')
  const [codeGenerationModel, setCodeGenerationModel] = useState('gemini-2.5-flash-lite')
  const [tempImageGenerationModel, setTempImageGenerationModel] = useState('gemini-2.5-flash-image-preview')
  const [tempCodeGenerationModel, setTempCodeGenerationModel] = useState('gemini-2.5-flash-lite')
  const [isFreeTier, setIsFreeTier] = useState(false)
  const [dailyRequestCount, setDailyRequestCount] = useState(0)
  const [showDailyLimitReached, setShowDailyLimitReached] = useState(false)
  const FREE_TIER_DAILY_LIMIT = 5
  const canvasRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Live Mode Voice Conversation State
  const [voiceConversationState, setVoiceConversationState] = useState<VoiceConversationState>({
    isActive: false,
    isListening: false,
    isThinking: false,
    isSpeaking: false,
    conversationHistory: [],
    currentPrompt: '',
    needsClarification: false
  })
  const voiceServiceRef = useRef<VoiceConversationService | null>(null)
  const currentImageRef = useRef<string | null>(null)
  const currentHistoryIndexRef = useRef<number>(-1)
  const currentSelectionBoxRef = useRef<{x: number; y: number; width: number; height: number} | null>(null)
  const voiceResponseIndexRef = useRef<number>(0)

  // Voice response cycling - more conversational and designer-like
  const getNextVoiceResponse = (): string => {
    const responses = [
      "Perfect! Let me work on that design change for you.",
      "Great idea! I'll implement that right away.",
      "Absolutely! That'll look much better. Working on it now.",
      "Nice! I can see exactly what you're going for. Applying those changes.",
      "Love that direction! Let me make those updates.",
      "Excellent choice! I'll get that styled for you.",
      "That's going to look fantastic! Making those changes now.",
      "Smart thinking! Let me apply that design improvement."
    ]
    
    const response = responses[voiceResponseIndexRef.current]
    voiceResponseIndexRef.current = (voiceResponseIndexRef.current + 1) % responses.length
    return response
  }

  // Completion responses - varied and designer-like
  const getCompletionResponse = (): string => {
    const responses = [
      "Perfect! I've applied those changes. How does that look? What would you like to refine next?",
      "Done! The design is updated. What other improvements can we make?",
      "All set! Those changes are live. What's the next element you'd like to work on?",
      "Beautiful! I've made those updates. Shall we polish anything else?",
      "Excellent! The changes are applied. What other design tweaks do you have in mind?",
      "There we go! Looking good. What would you like to adjust next?",
      "Perfect execution! The design is updated. Any other elements catching your eye?",
      "Fantastic! Those changes are in. What's the next area we should focus on?",
      "All done! I love how that turned out. What else can we enhance?",
      "Brilliant! The updates are complete. Ready for the next design iteration?"
    ]
    
    const response = responses[Math.floor(Math.random() * responses.length)]
    return response
  }

  // Error responses - more supportive and designer-like
  const getErrorResponse = (): string => {
    const responses = [
      "Hmm, I'm having trouble with that change. Could you describe it a bit differently? Maybe be more specific about the element?",
      "I didn't quite catch that design direction. Could you rephrase what you'd like me to adjust?",
      "Let me try that again. Could you be more specific about which element you want to modify?",
      "I'm not sure I understood that correctly. Can you describe the change in a different way?",
      "That's a tricky one! Could you break it down for me? Which part should I focus on first?",
      "I want to get this right for you. Could you clarify which element needs the update?"
    ]
    
    const response = responses[Math.floor(Math.random() * responses.length)]
    return response
  }

  // Encrypted storage utilities
  const encryptData = (data: string): string => {
    const key = 'pixie_daily_counter_' + new Date().toDateString()
    return btoa(JSON.stringify({ data, key, timestamp: Date.now() }))
  }

  const decryptData = (encrypted: string): string | null => {
    try {
      const decoded = JSON.parse(atob(encrypted))
      const expectedKey = 'pixie_daily_counter_' + new Date().toDateString()
      if (decoded.key === expectedKey) {
        return decoded.data
      }
      return null
    } catch {
      return null
    }
  }

  const getDailyRequestCount = (): number => {
    const encrypted = localStorage.getItem('pixie_daily_requests')
    if (!encrypted) return 0
    const decrypted = decryptData(encrypted)
    return decrypted ? parseInt(decrypted) : 0
  }

  const incrementDailyRequestCount = () => {
    const current = getDailyRequestCount()
    const newCount = current + 1
    const encrypted = encryptData(newCount.toString())
    localStorage.setItem('pixie_daily_requests', encrypted)
    setDailyRequestCount(newCount)
    
    if (newCount >= FREE_TIER_DAILY_LIMIT && isFreeTier) {
      setShowDailyLimitReached(true)
    }
  }

  const handleTryPixie = () => {
    setIsFreeTier(true)
    setGeminiApiKey('FREE_TIER')
    localStorage.setItem('gemini_api_key', 'FREE_TIER')
    localStorage.setItem('is_free_tier', 'true')
    setShowApiKeyModal(false)
  }

  // Load API keys from localStorage on component mount
  useEffect(() => {
    const savedGeminiApiKey = localStorage.getItem('gemini_api_key')
    const savedElevenlabsApiKey = localStorage.getItem('elevenlabs_api_key')
    const savedIsFreeTier = localStorage.getItem('is_free_tier') === 'true'
    
    if (savedGeminiApiKey) {
      setGeminiApiKey(savedGeminiApiKey)
      // Only set as free tier if the API key is specifically 'FREE_TIER'
      setIsFreeTier(savedGeminiApiKey === 'FREE_TIER')
    }
    if (savedElevenlabsApiKey) {
      setElevenlabsApiKey(savedElevenlabsApiKey)
    }
    
    // Load daily request count
    setDailyRequestCount(getDailyRequestCount())
    
    // Show API key modal if no Gemini key is saved (required)
    if (!savedGeminiApiKey) {
      setShowApiKeyModal(true)
    }

    const savedImageModel = localStorage.getItem('imageGenerationModel')
    const savedCodeModel = localStorage.getItem('codeGenerationModel')
    if (savedImageModel) {
      setImageGenerationModel(savedImageModel)
      setTempImageGenerationModel(savedImageModel)
    }
    if (savedCodeModel) {
      setCodeGenerationModel(savedCodeModel)
      setTempCodeGenerationModel(savedCodeModel)
    }
  }, [])

  // Save API keys to localStorage
  const saveApiKeys = () => {
    // Allow clearing Gemini API key (set to empty string)
    const trimmedApiKey = tempGeminiApiKey.trim()
    setGeminiApiKey(trimmedApiKey)
    
    if (trimmedApiKey) {
      localStorage.setItem('gemini_api_key', trimmedApiKey)
      // Set free tier status based on whether the API key is 'FREE_TIER'
      const isFree = trimmedApiKey === 'FREE_TIER'
      setIsFreeTier(isFree)
      localStorage.setItem('is_free_tier', isFree.toString())
    } else {
      localStorage.removeItem('gemini_api_key')
      localStorage.removeItem('is_free_tier')
      setIsFreeTier(false)
    }
    
    // ElevenLabs is optional
    setElevenlabsApiKey(tempElevenlabsApiKey.trim())
    if (tempElevenlabsApiKey.trim()) {
      localStorage.setItem('elevenlabs_api_key', tempElevenlabsApiKey.trim())
    } else {
      localStorage.removeItem('elevenlabs_api_key')
    }
    
    setShowApiKeyModal(false)
    setTempGeminiApiKey('')
    setTempElevenlabsApiKey('')
    setGeminiValidationResult(null)
  }

  const saveModelSettings = () => {
    setImageGenerationModel(tempImageGenerationModel)
    setCodeGenerationModel(tempCodeGenerationModel)
    localStorage.setItem('imageGenerationModel', tempImageGenerationModel)
    localStorage.setItem('codeGenerationModel', tempCodeGenerationModel)
    setShowModelSettingsModal(false)
  }

  // Validate Gemini API key
  const validateGeminiApiKey = async () => {
    if (!tempGeminiApiKey.trim()) {
      setGeminiValidationResult({valid: false, message: 'Please enter a Gemini API key'})
      return
    }
    
    setIsValidatingGemini(true)
    setGeminiValidationResult(null)
    
    try {
      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/v1/chat/gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': tempGeminiApiKey.trim()
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: 'Test'
            },
            {
              role: 'user',
              content: 'test'
            }
          ],
          max_tokens: 10,
          stream: false
        })
      })
      
      if (response.ok) {
        setGeminiValidationResult({valid: true, message: 'API key is valid!'})
      } else {
        const errorData = await response.json().catch(() => ({detail: 'Invalid API key'}))
        let errorMessage = 'Invalid API key'
        
        // Parse error response and provide user-friendly messages
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            // Check for common error patterns and provide friendly messages
            if (errorData.detail.includes('API key not valid') || errorData.detail.includes('INVALID_ARGUMENT')) {
              errorMessage = 'Invalid API key. Please check your Gemini API key.'
            } else if (errorData.detail.includes('quota') || errorData.detail.includes('RESOURCE_EXHAUSTED')) {
              errorMessage = 'API quota exceeded. Please check your billing or try again later.'
            } else if (errorData.detail.includes('PERMISSION_DENIED')) {
              errorMessage = 'Permission denied. Please check your API key permissions.'
            } else {
              errorMessage = errorData.detail
            }
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => err.msg || err.message || String(err)).join(', ')
          } else if (typeof errorData.detail === 'object') {
            // Handle nested error objects with friendly messages
            const rawError = errorData.detail.msg || errorData.detail.message || JSON.stringify(errorData.detail)
            if (rawError.includes('API key not valid') || rawError.includes('INVALID_ARGUMENT')) {
              errorMessage = 'Invalid API key. Please check your Gemini API key.'
            } else if (rawError.includes('quota') || rawError.includes('RESOURCE_EXHAUSTED')) {
              errorMessage = 'API quota exceeded. Please check your billing or try again later.'
            } else {
              errorMessage = 'Invalid API key. Please check your Gemini API key.'
            }
          }
        } else if (errorData.message) {
          if (errorData.message.includes('API key not valid') || errorData.message.includes('INVALID_ARGUMENT')) {
            errorMessage = 'Invalid API key. Please check your Gemini API key.'
          } else if (errorData.message.includes('quota') || errorData.message.includes('RESOURCE_EXHAUSTED')) {
            errorMessage = 'API quota exceeded. Please check your billing or try again later.'
          } else {
            errorMessage = errorData.message
          }
        }
        
        setGeminiValidationResult({valid: false, message: errorMessage})
      }
    } catch (error) {
      setGeminiValidationResult({valid: false, message: 'Failed to validate API key. Check your connection.'})
    } finally {
      setIsValidatingGemini(false)
    }
  }
  
  // Handle API key modal submit
  const handleApiKeySubmit = () => {
    // Allow saving even with empty API key (will use fallback)
    saveApiKeys()
  }

  const handleVoiceInput = async () => {
    if (isRecording) {
      setIsRecording(false)
      mediaRecorderRef.current?.stop()
      // Stop and cleanup the media stream
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
          chunksRef.current = []

          // Create form data with the audio file
          const formData = new FormData()
          formData.append('file', audioBlob, 'recording.webm')
          formData.append('model_id', 'scribe_v1')
          formData.append('language_code', 'eng')

          const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
              'xi-api-key': elevenlabsApiKey || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY as string,
              // Don't set Content-Type header, let the browser set it with the boundary
            },
            body: formData
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'No error details available' }))
            console.error('ElevenLabs API error details:', errorData)
            let errorMessage = 'Failed to convert speech to text'
            if (errorData.detail) {
              errorMessage += `: ${JSON.stringify(errorData.detail)}`
            }
            throw new Error(errorMessage)
          }

          const data = await response.json()
          if (!data || !data.text) {
            console.error('Unexpected API response:', data)
            throw new Error('Invalid response from speech-to-text service')
          }
          setSelectionPrompt(data.text)
        } catch (error) {
          console.error('Speech to text error:', error)
          setError('Failed to convert speech to text. Please try again.')
          setTimeout(() => setError(null), 5000)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Microphone access error:', error)
      setError('Failed to access microphone. Please check your permissions.')
      setTimeout(() => setError(null), 5000)
    }
  }

  // Initialize voice service when API key changes
  useEffect(() => {
    if (elevenlabsApiKey && elevenlabsApiKey.trim()) {
      voiceServiceRef.current = new VoiceConversationService(elevenlabsApiKey)
    } else {
      voiceServiceRef.current = null
    }
  }, [elevenlabsApiKey])

  // Live Mode Voice Conversation Functions
  const startLiveMode = async () => {
    console.log('Starting Live Mode')
    
    // Basic checks
    if (!elevenlabsApiKey?.trim()) {
      setError('ElevenLabs API key is required for Live Mode')
      return
    }

    if (!importedImage) {
      setError('Please import an image before starting Live Mode')
      return
    }

    if (!selectedAspectRatio) {
      setError('Please select an aspect ratio before starting Live Mode')
      return
    }

    if (!selectionBox) {
      setError('Please make a selection on the image before starting Live Mode')
      return
    }

    if (voiceConversationState.isActive) {
      console.log('Live mode already active')
      return
    }

    try {
      // Clear any existing prompt
      setSelectionPrompt('')

      // Initialize voice service
      if (!voiceServiceRef.current) {
        voiceServiceRef.current = new VoiceConversationService(elevenlabsApiKey)
      }

      // Set state to active
      setVoiceConversationState({
        isActive: true,
        isSpeaking: false,
        isListening: true,
        isThinking: false,
        conversationHistory: [],
        currentPrompt: '',
        needsClarification: false
      })

      console.log('Live mode activated, starting speech recognition')
      
      // Start listening immediately (no welcome message to simplify)
      await listenForUserResponse()

    } catch (error) {
      console.error('Error starting live mode:', error)
      setError(`Failed to start Live Mode: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Reset state
      setVoiceConversationState({
        isActive: false,
        isSpeaking: false,
        isListening: false,
        isThinking: false,
        conversationHistory: [],
        currentPrompt: '',
        needsClarification: false
      })
    }
  }

  const stopLiveMode = () => {
    voiceServiceRef.current?.cleanup()
    setVoiceConversationState({
      isActive: false,
      isListening: false,
      isThinking: false,
      isSpeaking: false,
      conversationHistory: [],
      currentPrompt: '',
      needsClarification: false
    })
  }

  const speakToUser = async (text: string) => {
    if (!voiceServiceRef.current) return

    try {
      setVoiceConversationState(prev => ({ ...prev, isSpeaking: true }))
      
      const audioBlob = await voiceServiceRef.current.textToSpeech(text)
      await voiceServiceRef.current.playAudio(audioBlob)
      
      setVoiceConversationState(prev => ({ 
        ...prev, 
        isSpeaking: false,
        conversationHistory: [
          ...prev.conversationHistory,
          { role: 'assistant', content: text, timestamp: new Date() }
        ]
      }))

    } catch (error) {
      console.error('Failed to speak to user:', error)
      setVoiceConversationState(prev => ({ ...prev, isSpeaking: false }))
      setError('Failed to generate voice response')
      setTimeout(() => setError(null), 5000)
    }
  }

  const listenForUserResponse = async () => {
    if (!voiceServiceRef.current) {
      console.error('Voice service not initialized')
      return
    }

    try {
      // Update state to show we're listening
      setVoiceConversationState(prev => ({
        ...prev,
        isListening: true,
        isSpeaking: false,
        isThinking: false
      }))

      console.log('Starting speech recognition with callbacks')
      
      // Use live speech recognition with real-time transcript updates
      voiceServiceRef.current.startLiveSpeechRecognition(
        // Speech end callback - called when user finishes speaking
        (transcript) => {
          console.log('Speech ended callback received:', transcript)
          if (transcript.trim()) {
            processUserSpeechInput(transcript)
          }
        },
        // Real-time transcript update callback - called while user is speaking
        (transcript, isFinal) => {
          console.log('Transcript update:', { transcript, isFinal })
          
          if (transcript.trim()) {
            // Show the transcript is being recognized
            setVoiceConversationState(prev => ({
              ...prev,
              currentPrompt: transcript,
              isListening: true
            }))
          }
        }
      )

    } catch (error) {
      console.error('Failed to start listening:', error)
      setError('Failed to start listening. Please check your microphone and browser compatibility.')
      setTimeout(() => setError(null), 5000)
      setVoiceConversationState(prev => ({ ...prev, isListening: false }))
    }
  }

  const processUserSpeechInput = async (userText: string) => {
    if (!voiceServiceRef.current) return

    try {
      // Update state to show we're processing
      setVoiceConversationState(prev => ({
        ...prev,
        isListening: false,
        isThinking: true,
        conversationHistory: [
          ...prev.conversationHistory,
          { role: 'user', content: userText, timestamp: new Date() }
        ]
      }))

      // Analyze user input
      const analysis = voiceServiceRef.current.analyzeUserInput(userText)
      
      if (analysis.needsClarification && analysis.clarificationQuestion) {
        // Ask for clarification (should be rare)
        setVoiceConversationState(prev => ({ 
          ...prev, 
          isThinking: false,
          needsClarification: true 
        }))
        
        await speakToUser(analysis.clarificationQuestion)
        
        // Continue listening for clarification
        setVoiceConversationState(prev => ({ 
          ...prev, 
          needsClarification: false,
          isListening: true 
        }))
        
        // Start listening again
        await listenForUserResponse()
        
      } else {
        // Input is clear, apply changes immediately
        console.log('Setting selection prompt to:', userText)
        setSelectionPrompt(userText)

        setVoiceConversationState(prev => ({
          ...prev,
          isThinking: false,
          currentPrompt: userText
        }))
        
        // Start applying changes immediately
        setIsApplyingLiveModeChanges(true)
        
        // Keep listening while changes are being applied
        setVoiceConversationState(prev => ({
          ...prev,
          isListening: true,
          isThinking: false
        }))

        // Run voice confirmation and change application concurrently
        const voicePromise = speakToUser(getNextVoiceResponse())
        const changesPromise = handleSelectionSubmitWithPrompt(userText)
        
        // Handle changes completion
        changesPromise.then(() => {
          // Clear the current prompt only after successful transformation
          setVoiceConversationState(prev => ({
            ...prev,
            currentPrompt: ''
          }))
          setIsApplyingLiveModeChanges(false)
          
          // After changes are applied, give feedback and prompt for next request
          if (voiceServiceRef.current && voiceConversationState.isActive) {
            speakToUser(getCompletionResponse()).then(() => {
              // Now start listening for the next request
              listenForUserResponse()
            })
          }
        }).catch((error) => {
          console.error('Failed to apply changes:', error)
          // Clear the current prompt even on error to avoid confusion
          setVoiceConversationState(prev => ({
            ...prev,
            currentPrompt: ''
          }))
          setIsApplyingLiveModeChanges(false)
          
          if (voiceServiceRef.current && voiceConversationState.isActive) {
            speakToUser(getErrorResponse()).then(() => {
              // Start listening again after error
              listenForUserResponse()
            })
          }
        })

        // Continue current speech recognition (don't start a new one yet)
        // The new listening session will start after the changes are applied
      }

    } catch (error) {
      console.error('Failed to process user voice input:', error)
      
      setVoiceConversationState(prev => ({ 
        ...prev, 
        isListening: false, 
        isThinking: false 
      }))
      
      await speakToUser("I'm sorry, I didn't catch that. Could you please repeat your request?")
      
      // Start listening again
      await listenForUserResponse()
    }
  }

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY * -0.01
      setZoom(prev => Math.round(Math.min(200, Math.max(25, prev + delta * 25))))
    }
  }, [])

  useEffect(() => {
    // Track natural size when image changes
    if (!importedImage) {
      setImageNaturalSize(null)
      return
    }
    const img = new Image()
    img.onload = () => {
      setImageNaturalSize({ width: img.width, height: img.height })
    }
    img.src = importedImage
  }, [importedImage])

  // No longer needed since we position the selection box in the viewport center

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false })
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleWheel])

  // Global mouse events for smooth dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const scale = Math.max(0.01, zoom / 100)
      if (isDragging && startDragPosition && canvasRef.current) {
        e.preventDefault()
        
        const deltaX = e.clientX - startDragPosition.x
        const deltaY = e.clientY - startDragPosition.y
        
        canvasRef.current.scrollLeft = scrollPosition.x - deltaX
        canvasRef.current.scrollTop = scrollPosition.y - deltaY
      }
    }

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setStartDragPosition(null)
        
        const canvas = canvasRef.current
        if (canvas) {
          canvas.style.cursor = 'grab'
        }
      }
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, startDragPosition, scrollPosition])

  // Global mouse events for selection box manipulation
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const scale = Math.max(0.01, zoom / 100)
      if (isMovingBox && moveStart && selectionBox) {
        e.preventDefault()
        
        const deltaX = (e.clientX - moveStart.x) / scale
        const deltaY = (e.clientY - moveStart.y) / scale
        
        setSelectionBox(prev => {
          if (!prev) return prev
          return {
            ...prev,
            x: prev.x + deltaX,
            y: prev.y + deltaY
          }
        })
        
        setMoveStart({ x: e.clientX, y: e.clientY })
      } else if (isResizing && resizeStart && selectionBox && selectedAspectRatio) {
        e.preventDefault()
        
        const deltaX = (e.clientX - resizeStart.x) / scale
        const deltaY = (e.clientY - resizeStart.y) / scale
        
        // Calculate new dimensions - flexible for freestyle, constrained for others
        let newWidth = selectionBox.width
        let newHeight = selectionBox.height
        let newX = selectionBox.x
        let newY = selectionBox.y
        
        if (selectedAspectRatio.id === 'freestyle') {
          // Free style: allow independent width and height changes
          switch (resizeHandle) {
            case 'top-left':
              newWidth = selectionBox.width - deltaX
              newHeight = selectionBox.height - deltaY
              newX = selectionBox.x + deltaX
              newY = selectionBox.y + deltaY
              break
            case 'top-right':
              newWidth = selectionBox.width + deltaX
              newHeight = selectionBox.height - deltaY
              newY = selectionBox.y + deltaY
              break
            case 'bottom-left':
              newWidth = selectionBox.width - deltaX
              newHeight = selectionBox.height + deltaY
              newX = selectionBox.x + deltaX
              break
            case 'bottom-right':
              newWidth = selectionBox.width + deltaX
              newHeight = selectionBox.height + deltaY
              break
          }
        } else {
          // Fixed aspect ratio: maintain ratio during resize
          switch (resizeHandle) {
            case 'top-left':
              newWidth = selectionBox.width - deltaX
              newHeight = newWidth / selectedAspectRatio.ratio
              newX = selectionBox.x + deltaX
              newY = selectionBox.y + (selectionBox.height - newHeight)
              break
            case 'top-right':
              newWidth = selectionBox.width + deltaX
              newHeight = newWidth / selectedAspectRatio.ratio
              newY = selectionBox.y + (selectionBox.height - newHeight)
              break
            case 'bottom-left':
              newWidth = selectionBox.width - deltaX
              newHeight = newWidth / selectedAspectRatio.ratio
              newX = selectionBox.x + deltaX
              break
            case 'bottom-right':
              newWidth = selectionBox.width + deltaX
              newHeight = newWidth / selectedAspectRatio.ratio
              break
          }
        }
        
        // Ensure minimum size
        if (newWidth >= 50 && newHeight >= 50) {
          setSelectionBox({
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
          })
        }
        
        setResizeStart({ x: e.clientX, y: e.clientY })
      }
    }

    const handleGlobalMouseUp = () => {
      if (isResizing) {
        setIsResizing(false)
        setResizeHandle(null)
        setResizeStart(null)
      }
      if (isMovingBox) {
        setIsMovingBox(false)
        setMoveStart(null)
      }
    }

    if (isMovingBox || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isMovingBox, moveStart, isResizing, resizeStart, resizeHandle, selectionBox, selectedAspectRatio])
  
  // Note: comprehensive canvas mouse handlers are defined below (drag/select/pan)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      // Ctrl/Cmd + Plus to zoom in
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault()
        setZoom(prev => Math.min(200, prev + 25))
      }

      // Ctrl/Cmd + Minus to zoom out
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault()
        setZoom(prev => Math.max(25, prev - 25))
      }

      // Ctrl/Cmd + 0 to reset zoom
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault()
        setZoom(100)
      }

      // Ctrl/Cmd + Z to undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        if (currentHistoryIndex > 0) {
          setCurrentHistoryIndex(prev => prev - 1)
          const prevIndex = currentHistoryIndex - 1
          if (imageHistory[prevIndex]) {
            setImportedImage(imageHistory[prevIndex].image)
            setGeneratedCodeUrl(imageHistory[prevIndex].generatedCodeUrl || null)
          }
        }
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z to redo
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault()
        if (currentHistoryIndex < imageHistory.length - 1) {
          setCurrentHistoryIndex(prev => prev + 1)
          const nextIndex = currentHistoryIndex + 1
          if (imageHistory[nextIndex]) {
            setImportedImage(imageHistory[nextIndex].image)
            setGeneratedCodeUrl(imageHistory[nextIndex].generatedCodeUrl || null)
          }
        }
      }

      // Enter to submit selection
      if (e.key === "Enter" && selectionBox && selectedAspectRatio && selectionPrompt.trim()) {
        e.preventDefault()
        handleSelectionSubmit()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectionBox, selectedAspectRatio, selectionPrompt, currentHistoryIndex, imageHistory])

  const handleImportWebsite = async () => {
    if (!websiteUrl) return

    setError(null)
    const normalizedUrl = normalizeUrl(websiteUrl)

    if (!validateUrl(normalizedUrl)) {
      setError("Please enter a valid URL (e.g., https://example.com)")
      return
    }

    setIsImporting(true)

    try {
      const result = await captureWebsiteScreenshot(normalizedUrl)

      if (result.success) {
        const newImage = result.screenshot
        
        // Calculate optimal zoom to fit image in canvas
        const img = new Image()
        await new Promise((resolve) => {
          img.onload = resolve
          img.src = newImage
        })
        
        // Set zoom to 75% for imported websites
        setZoom(75)
        
        setImportedImage(newImage)
        setImportMetadata(result.metadata)
        // Add to history
        setImageHistory(prev => [...prev.slice(0, currentHistoryIndex + 1), {
          image: newImage,
          description: "Website imported",
          timestamp: Date.now()
        }])
        setCurrentHistoryIndex(prev => prev + 1)
        // Image position is fixed at 32, 32
        setError(null)
      } else {
        setError("Failed to capture website screenshot")
      }
    } catch (err) {
      console.error("Import error:", err)
      setError(err instanceof Error ? err.message : "Failed to import website")
    } finally {
      setIsImporting(false)
    }
  }


  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isControlPressed, setIsControlPressed] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the target is an input field or textarea
      const target = e.target as HTMLElement
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'
      
      if (e.code === 'Space' && !e.repeat && !isInputField) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
      if ((e.ctrlKey || e.metaKey) && !e.repeat) {
        setIsControlPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Check if the target is an input field or textarea
      const target = e.target as HTMLElement
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'
      
      if (e.code === 'Space' && !isInputField) {
        e.preventDefault()
        setIsSpacePressed(false)
      }
      if (!e.ctrlKey && !e.metaKey) {
        setIsControlPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Keep ref in sync with importedImage state
  useEffect(() => {
    currentImageRef.current = importedImage
    console.log('🔄 Updated currentImageRef:', {
      hasImage: !!importedImage,
      imageLength: importedImage?.length,
      imagePrefix: importedImage?.substring(0, 50)
    })
  }, [importedImage])

  // Track imageHistory changes and sync refs
  useEffect(() => {
    currentHistoryIndexRef.current = currentHistoryIndex
    console.log('📚 ImageHistory changed:', {
      length: imageHistory.length,
      currentIndex: currentHistoryIndex,
      entries: imageHistory.map((h, i) => ({ 
        index: i, 
        prompt: h.prompt || h.description,
        timestamp: h.timestamp 
      }))
    })
  }, [imageHistory, currentHistoryIndex])

  // Keep selection box ref in sync
  useEffect(() => {
    currentSelectionBoxRef.current = selectionBox
    console.log('📦 Updated currentSelectionBoxRef:', {
      hasSelection: !!selectionBox,
      position: selectionBox ? { x: selectionBox.x, y: selectionBox.y, width: selectionBox.width, height: selectionBox.height } : null
    })
  }, [selectionBox])

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    const canvas = canvasRef.current
    const leftClick = event.button === 0
    const backgroundClick = event.target === event.currentTarget
    
    // Pan the canvas if Space is held (anywhere) or clicking background
    if (leftClick && (isSpacePressed || backgroundClick) && canvas) {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(true)
      setStartDragPosition({ x: event.clientX, y: event.clientY })
      setScrollPosition({ x: canvas.scrollLeft, y: canvas.scrollTop })
      canvas.style.cursor = 'grabbing'
      return
    }

    // Ctrl/Meta + Right click to start a free selection
    if (event.button === 2 && (event.ctrlKey || event.metaKey) && canvas) {
      event.preventDefault()
      event.stopPropagation()
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left + canvas.scrollLeft
      const y = event.clientY - rect.top + canvas.scrollTop
      setIsSelecting(true)
      setSelectionStart({ x, y })
      setSelectionBox({ x, y, width: 0, height: 0 })
    }
  }, [isSpacePressed])

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging && startDragPosition && canvasRef.current) {
      event.preventDefault()
      event.stopPropagation()
      
      const deltaX = event.clientX - startDragPosition.x
      const deltaY = event.clientY - startDragPosition.y
      
      canvasRef.current.scrollLeft = scrollPosition.x - deltaX
      canvasRef.current.scrollTop = scrollPosition.y - deltaY
    } else if (isSelecting && selectionStart && canvasRef.current) {
      event.preventDefault()
      event.stopPropagation()
      
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const currentX = event.clientX - rect.left + canvas.scrollLeft
      const currentY = event.clientY - rect.top + canvas.scrollTop
      
      const width = currentX - selectionStart.x
      const height = currentY - selectionStart.y
      
      setSelectionBox({
        x: width > 0 ? selectionStart.x : currentX,
        y: height > 0 ? selectionStart.y : currentY,
        width: Math.abs(width),
        height: Math.abs(height)
      })
    }
  }, [isDragging, startDragPosition, scrollPosition, isSelecting, selectionStart])

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent) => {
    if (isDragging) {
      event.preventDefault()
      event.stopPropagation()
      
      const canvas = canvasRef.current
      if (canvas) {
        setIsDragging(false)
        setStartDragPosition(null)
        
        // Reset cursor style
        canvas.style.cursor = 'default'
      }
    } else if (isSelecting) {
      event.preventDefault()
      event.stopPropagation()
      
      setIsSelecting(false)
      setSelectionStart(null)
      // Keep the selection box visible for now
    }
  }, [isDragging, isSelecting])

  // Handle mouse leaving the canvas
  const handleCanvasMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setStartDragPosition(null)
      
      const canvas = canvasRef.current
      if (canvas) {
        canvas.style.cursor = 'default'
      }
    }
    if (isSelecting) {
      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionBox(null)
    }
  }, [isDragging, isSelecting])

  // Update scroll position when scrolling normally
  const handleCanvasScroll = useCallback(() => {
    if (!isDragging && canvasRef.current) {
      setScrollPosition({
        x: canvasRef.current.scrollLeft,
        y: canvasRef.current.scrollTop
      })
    }
  }, [isDragging])


  const handleFileUpload = async () => {
    try {
      // Create a file input element
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      
      // Create a promise to handle the file selection
      const fileSelected = new Promise((resolve, reject) => {
        input.onchange = async (e) => {
          try {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) {
              reject(new Error('No file selected'))
              return
            }

            // Start loading state after file is selected
            setIsUploading(true)

            // Validate file type
            const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if (!validImageTypes.includes(file.type)) {
              reject(new Error('Please select a valid image file (JPEG, PNG, GIF, or WebP)'))
              return
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024 // 5MB in bytes
            if (file.size > maxSize) {
              reject(new Error('Image file size must be less than 5MB'))
              return
            }

            resolve(file)
          } catch (error) {
            reject(error)
          }
        }
        
        // Handle cancel
        input.oncancel = () => {
          reject(new Error('File selection cancelled'))
        }
      })
      
      // Trigger the file input click
      input.click()
      
      // Wait for file selection
      const file = await fileSelected
      
      // Read the file as data URL
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve(e.target?.result as string)
        }
        reader.onerror = () => {
          reject(new Error('Failed to read the image file'))
        }
        reader.readAsDataURL(file as Blob)
      })
      
      // Calculate optimal zoom to fit image in canvas
      const img = new Image()
      await new Promise((resolve) => {
        img.onload = resolve
        img.src = imageDataUrl
      })
      
      // Wait for canvas to be ready and calculate optimal zoom
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay to ensure canvas is rendered
      
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const canvasWidth = canvas.clientWidth - 64 // Account for padding
        const canvasHeight = canvas.clientHeight - 64
        
        // Only calculate zoom if canvas has dimensions
        if (canvasWidth > 0 && canvasHeight > 0) {
          const scaleX = canvasWidth / img.width
          const scaleY = canvasHeight / img.height
          const optimalScale = Math.min(scaleX, scaleY, 1) // Don't zoom in, only zoom out
          
          const optimalZoom = Math.max(25, Math.min(100, optimalScale * 100)) // Keep within zoom bounds
          setZoom(Math.round(optimalZoom))
        }
      }
      
      // Add to history
      setImageHistory(prev => [...prev.slice(0, currentHistoryIndex + 1), {
        image: imageDataUrl,
        description: "Image uploaded",
        timestamp: Date.now()
      }])
      setCurrentHistoryIndex(prev => prev + 1)
      setImportedImage(imageDataUrl)
      // Image position is fixed at 32, 32
      setError(null)
      setIsUploading(false)
      
    } catch (err: unknown) {
      setIsUploading(false)
      if (err instanceof Error) {
        // Don't show error for cancelled uploads
        if (err.message !== 'File selection cancelled') {
          console.error("Upload error:", err)
          setError(err.message)
          
          // Clear error after 5 seconds
          setTimeout(() => {
            setError(null)
          }, 5000)
        }
      } else {
        setError("An unexpected error occurred while uploading the image")
        setTimeout(() => {
          setError(null)
        }, 5000)
      }
    }
  }

  const handleAITransform = async () => {
    if (!aiPrompt) return
    setIsGenerating(true)
    // TODO: Implement AI transformation
    setTimeout(() => {
      setIsGenerating(false)
      setAiPrompt("")
    }, 3000)
  }

  const handleGenerateCode = async () => {
    if (!importedImage) {
      setError('Please import an image first')
      setTimeout(() => setError(null), 5000)
      return
    }

    // Check daily limit for free tier
    if (isFreeTier && dailyRequestCount >= FREE_TIER_DAILY_LIMIT) {
      setShowDailyLimitReached(true)
      return
    }

    setIsGeneratingCode(true)
    setError(null)

    // Increment request count for free tier
    if (isFreeTier) {
      incrementDailyRequestCount()
    }

    try {
      // Convert base64 image to blob
      const base64Response = await fetch(importedImage)
      const blob = await base64Response.blob()
      
      // Prepare form data
      const requestId = `pixie_code_${Date.now()}`
      const formData = new FormData()
      formData.append('request_id', requestId)
      formData.append('image', blob, 'image.png')
      formData.append('model', codeGenerationModel)

      const apiBaseUrl = getApiBaseUrl()
      const endpoint = `${apiBaseUrl}/v1/images/to-html`
      
      console.log('🔄 Making image-to-HTML API call:', {
        endpoint: endpoint,
        requestId: requestId,
        imageSize: blob.size
      })

      // Make API call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': isFreeTier ? 'FREE_TIER' : (geminiApiKey || 'AIzaSyA8QsHg05havRjPCsxozM_dM5qBd6yhY8M')
        },
        body: formData
      })

      console.log('📥 API Response status:', response.status, response.statusText)

      if (!response.ok) {
        console.error('❌ API request failed:', {
          status: response.status,
          statusText: response.statusText,
          requestId: requestId
        })
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ API Response data:', result)
      
      // Store the generated URL
      console.log('🔍 Checking result.html_path:', result.html_path)
      if (result.html_path) {
        console.log('✅ Setting generated URL')
        const baseUrl = getApiBaseUrl()
        const fullUrl = result.view_url || `${baseUrl}${result.html_path}`
        setGeneratedCodeUrl(fullUrl)
        
        // Also store in the current history entry
        if (currentHistoryIndex >= 0 && imageHistory[currentHistoryIndex]) {
          setImageHistory(prev => {
            const newHistory = [...prev]
            newHistory[currentHistoryIndex] = {
              ...newHistory[currentHistoryIndex],
              generatedCodeUrl: fullUrl
            }
            return newHistory
          })
        }
        
        console.log('✅ Generated URL stored:', fullUrl)
      } else {
        console.log('❌ No html_path in result:', result)
        throw new Error('No HTML path returned from API')
      }

    } catch (err) {
      console.error('Generate code error:', err)
      setError(err instanceof Error ? err.message : "Failed to generate code")
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null)
      }, 5000)
    } finally {
      setIsGeneratingCode(false)
    }
  }

  const handleCopyCodeLink = async () => {
    if (!generatedCodeUrl) return
    
    try {
      await navigator.clipboard.writeText(generatedCodeUrl)
      setCodeCopySuccess('Link copied!')
      setTimeout(() => setCodeCopySuccess(null), 2000)
    } catch {
      setCodeCopySuccess('Copy failed')
      setTimeout(() => setCodeCopySuccess(null), 2000)
    }
  }

  const handleSelectionSubmitWithPrompt = async (promptText: string) => {
    return await handleSelectionSubmitInternal(promptText)
  }

  const handleSelectionSubmit = async () => {
    return await handleSelectionSubmitInternal(selectionPrompt)
  }

  const handleSelectionSubmitInternal = async (promptText: string) => {
    // Prevent overlapping transformations
    if (isProcessingSelection) {
      console.log('⚠️ Transformation already in progress, skipping')
      return
    }

    console.log('🚀 Starting transformation:', {
      prompt: promptText.trim(),
      timestamp: Date.now(),
      currentHistoryIndex: currentHistoryIndex,
      historyLength: imageHistory.length,
      isLiveMode: voiceConversationState.isActive,
      importedImageLength: importedImage?.length
    })
    
    // Get the current selection box - use ref to ensure we have the latest position
    let currentSelectionBox = currentSelectionBoxRef.current || selectionBox
    const hasImageForTransform = imageHistory.length > 0 || importedImage
    
    // Create default selection if missing (for voice mode)
    if (!currentSelectionBox && selectedAspectRatio && hasImageForTransform && promptText.trim()) {
      const defaultWidth = 400
      const defaultHeight = selectedAspectRatio.id === 'freestyle' ? 300 : defaultWidth / selectedAspectRatio.ratio

      currentSelectionBox = {
        x: imagePosition.x + 50,
        y: imagePosition.y + 50,
        width: defaultWidth,
        height: defaultHeight
      }

      setSelectionBox(currentSelectionBox)
      currentSelectionBoxRef.current = currentSelectionBox
    }

    console.log('📦 Using selection box for transformation:', {
      hasSelection: !!currentSelectionBox,
      position: currentSelectionBox ? { x: currentSelectionBox.x, y: currentSelectionBox.y, width: currentSelectionBox.width, height: currentSelectionBox.height } : null,
      source: currentSelectionBoxRef.current ? 'ref' : 'state'
    })

    if (!currentSelectionBox || !selectedAspectRatio || !promptText.trim() || !hasImageForTransform) {
      console.log('Missing requirements for selection submit:', {
        selectionBox: !!currentSelectionBox,
        selectedAspectRatio: !!selectedAspectRatio,
        selectionPrompt: !!promptText.trim(),
        hasImageForTransform: !!hasImageForTransform
      })
      return
    }

    // Check daily limit for free tier
    if (isFreeTier && dailyRequestCount >= FREE_TIER_DAILY_LIMIT) {
      setShowDailyLimitReached(true)
      return
    }

    setIsProcessingSelection(true)
    setError(null)

    // Increment request count for free tier
    if (isFreeTier) {
      incrementDailyRequestCount()
    }

    try {
      // Create a canvas to extract the selected area
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not create canvas context')
      }

      // Get the latest image - use ref to ensure we have the most current value
      // This is crucial for rapid transformations in voice mode
      const currentImageForTransformation = currentImageRef.current || 
        importedImage || 
        (currentHistoryIndex >= 0 && imageHistory[currentHistoryIndex]?.image) ||
        null
      
      if (!currentImageForTransformation) {
        throw new Error('No image available for transformation')
      }

      console.log('🖼️ Using base image for transformation:', {
        imageLength: currentImageForTransformation?.length,
        imagePrefix: currentImageForTransformation?.substring(0, 50),
        source: currentImageRef.current ? 'currentImageRef' : (importedImage ? 'importedImage' : 'history'),
        currentHistoryIndex,
        totalHistory: imageHistory.length,
        refImageLength: currentImageRef.current?.length,
        refImagePrefix: currentImageRef.current?.substring(0, 50),
        importedImageLength: importedImage?.length,
        importedImagePrefix: importedImage?.substring(0, 50),
        historyImages: imageHistory.map((h, i) => ({ 
          index: i, 
          prompt: h.prompt || h.description,
          hasImage: !!h.image,
          imagePrefix: h.image?.substring(0, 30)
        }))
      })

      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = currentImageForTransformation
      })

      // Set canvas dimensions to match selection
      canvas.width = currentSelectionBox.width
      canvas.height = currentSelectionBox.height

      // Draw the selected portion of the image
      ctx.drawImage(
        img,
        currentSelectionBox.x, currentSelectionBox.y, currentSelectionBox.width, currentSelectionBox.height,
        0, 0, currentSelectionBox.width, currentSelectionBox.height
      )

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
        }, 'image/png')
      })

      // Prepare form data
      const requestId = `pixie_${Date.now()}`
      const formData = new FormData()
      formData.append('prompt', promptText.trim())
      formData.append('image', blob, 'selection.png')
      // Calculate dynamic aspect ratio based on actual selection box dimensions
      const dynamicAspectRatio = selectedAspectRatio.id === 'freestyle'
        ? currentSelectionBox.width / currentSelectionBox.height
        : selectedAspectRatio.ratio
      formData.append('aspect_ratio', `${dynamicAspectRatio}:1`)
      formData.append('model', imageGenerationModel)
      formData.append('request_id', requestId)
      formData.append('numberOfImages', '1')

      // Add reference image if it exists
      if (referenceImage) {
        const referenceImageResponse = await fetch(referenceImage)
        const referenceImageBlob = await referenceImageResponse.blob()
        formData.append('reference_image', referenceImageBlob, 'reference.png')
      }

      const apiBaseUrl = getApiBaseUrl()
      const endpoint = `${apiBaseUrl}/v1/images/apply`
      
      console.log('🔄 Making apply transformation API call:', {
        endpoint: endpoint,
        requestId: requestId,
        prompt: promptText.trim(),
        aspectRatio: `${dynamicAspectRatio}:1`,
        imageSize: blob.size
      })

      // Make API call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': isFreeTier ? 'FREE_TIER' : (geminiApiKey || 'AIzaSyA8QsHg05havRjPCsxozM_dM5qBd6yhY8M')
        },
        body: formData
      })

      console.log('📥 Apply API Response status:', response.status, response.statusText)

      if (!response.ok) {
        console.error('❌ Apply API request failed:', {
          status: response.status,
          statusText: response.statusText,
          requestId: requestId
        })
        
        // Try to get detailed error message from response
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)
          }
        } catch (e) {
          // If we can't parse the error response, use the default message
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.blob()
      const resultImageUrl = URL.createObjectURL(result)

      // Update the current image by replacing the selected area with the result
      const originalImg = new Image()
      await new Promise((resolve, reject) => {
        originalImg.onload = resolve
        originalImg.onerror = reject
        originalImg.src = currentImageForTransformation
      })

      const resultImg = new Image()
      await new Promise((resolve, reject) => {
        resultImg.onload = resolve
        resultImg.onerror = reject
        resultImg.src = resultImageUrl
      })

      // Create a new canvas with the original image dimensions
      const finalCanvas = document.createElement('canvas')
      const finalCtx = finalCanvas.getContext('2d')
      if (!finalCtx) {
        throw new Error('Could not create final canvas context')
      }

      finalCanvas.width = originalImg.width
      finalCanvas.height = originalImg.height

      // Draw the original image
      finalCtx.drawImage(originalImg, 0, 0)

      // Draw the modified selection over it
      finalCtx.drawImage(
        resultImg,
        currentSelectionBox.x, currentSelectionBox.y, currentSelectionBox.width, currentSelectionBox.height
      )

      // Convert final canvas to data URL and update the image
      const finalImageUrl = finalCanvas.toDataURL()
      // Add to image history with debug logging for voice conversation troubleshooting
      console.log('🎯 Adding to history:', {
        promptText: promptText.trim(),
        currentHistoryIndex,
        historyLength: imageHistory.length,
        isVoiceActive: voiceConversationState.isActive
      })
      
      // Copy EXACT normal mode pattern for history creation
      const newHistoryEntry = {
        image: finalImageUrl,
        description: promptText.trim() || "Image transformation",
        prompt: promptText.trim(),
        reference: referenceImage || undefined,
        timestamp: Date.now()
      }
      
      console.log('📝 Before history update:', {
        currentHistoryLength: imageHistory.length,
        currentIndex: currentHistoryIndex,
        currentIndexRef: currentHistoryIndexRef.current,
        newEntryPrompt: newHistoryEntry.prompt
      })
      
      // Use ref to get the most current history index
      const currentIndex = currentHistoryIndexRef.current
      
      setImageHistory(prev => {
        const newHistory = [...prev.slice(0, currentIndex + 1), newHistoryEntry]
        console.log('📝 History update:', {
          previousLength: prev.length,
          newLength: newHistory.length,
          slicedAt: currentIndex + 1,
          usedIndex: currentIndex,
          previousEntries: prev.map((h, i) => ({ index: i, prompt: h.prompt || h.description })),
          newEntry: { prompt: newHistoryEntry.prompt, description: newHistoryEntry.description }
        })
        return newHistory
      })
      
      // Update both state and ref for history index
      const newIndex = currentIndex + 1
      setCurrentHistoryIndex(newIndex)
      currentHistoryIndexRef.current = newIndex
      console.log('📝 Index update:', { previous: currentIndex, new: newIndex })
      setImportedImage(finalImageUrl)
      // Reset generated code URL since we have a new version
      setGeneratedCodeUrl(null)
      console.log('✅ Updated importedImage with final result:', {
        finalImageLength: finalImageUrl.length,
        finalImagePrefix: finalImageUrl.substring(0, 50)
      })

      // Add to history
      setPromptHistory(prev => [{
        timestamp: Date.now(),
        prompt: promptText.trim(),
        requestId: requestId
      }, ...prev])

      // Show success message
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)

      // Clean up blob URL
      URL.revokeObjectURL(resultImageUrl)

      // Keep aspect ratio and box, just clear prompt and reference image
      setSelectionPrompt("")
      setReferenceImage(null)

    } catch (err) {
      console.error("Selection processing error:", err)
      setError(err instanceof Error ? err.message : "Failed to process selection")
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null)
      }, 5000)
    } finally {
      setIsProcessingSelection(false)
    }
  }

  const handleExportImage = () => {
    if (!importedImage) return
    
    const link = document.createElement('a')
    link.download = 'pixie-export.png'
    link.href = importedImage
    link.click()
  }

  const handleClearCanvas = () => {
    setImportedImage(null)
    setImageHistory([])
    setCurrentHistoryIndex(-1)
    setSelectionBox(null)
    setSelectionPrompt('')
    setGeneratedCodeUrl(null)
    setImportMetadata(null)
    setZoom(100)
    setError(null)
  }

  const handleViewPrompt = async () => {
    // If the panel is already open, just close it and return.
    if (showPromptPanel) {
      setShowPromptPanel(false)
      return
    }

    if (!importedImage || currentHistoryIndex <= 0) {
      setError('No image available to view prompt for')
      return
    }

    // Check if we already have cached prompt data for this history index
    if (promptCache[currentHistoryIndex]) {
      setShowPromptPanel(true)
      return
    }

    // Check daily limit for free tier
    if (isFreeTier && dailyRequestCount >= FREE_TIER_DAILY_LIMIT) {
      setShowDailyLimitReached(true)
      return
    }

    setIsLoadingPrompt(true)
    setError(null)

    // Increment request count for free tier
    if (isFreeTier) {
      incrementDailyRequestCount()
    }

    // Get the prompt and request ID for the current transformation
    const currentTransformation = currentHistoryIndex > 0 ? 
      promptHistory[promptHistory.length - currentHistoryIndex] : null
    const currentPrompt = currentTransformation?.prompt || ''
    const originalRequestId = currentTransformation?.requestId || ''
    
    // Use the original request ID from when the transformation was applied
    const requestId = originalRequestId || `pixie_copy_${Date.now()}`

    try {
      // Convert base64 image to blob
      const base64Response = await fetch(importedImage)
      const blob = await base64Response.blob()
      const formData = new FormData()
      formData.append('request_id', requestId)
      formData.append('image', blob, 'image.png')
      if (currentPrompt) {
        formData.append('prompt', currentPrompt)
        formData.append('model', imageGenerationModel)
      }
      
      const apiBaseUrl = getApiBaseUrl()
      const endpoint = `${apiBaseUrl}/v1/images/prompt`
      
      console.log('🔄 Making copy prompt API call:', {
        endpoint: endpoint,
        requestId: requestId,
        originalRequestId: originalRequestId,
        isOriginalRequestId: !!originalRequestId,
        prompt: currentPrompt,
        imageSize: blob.size,
        currentHistoryIndex: currentHistoryIndex
      })
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': isFreeTier ? 'FREE_TIER' : (geminiApiKey || 'AIzaSyA8QsHg05havRjPCsxozM_dM5qBd6yhY8M')
        },
        body: formData
      })

      console.log('📥 API Response status:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        const promptData = {
          instructions: data.instructions || 'No instructions available',
          assets: data.assets || []
        }
        
        // Cache the result
        setPromptCache(prev => ({
          ...prev,
          [currentHistoryIndex]: promptData
        }))
        
        setShowPromptPanel(true)
      } else {
        console.error('❌ API request failed:', {
          status: response.status,
          statusText: response.statusText,
          requestId: requestId
        })
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
    } catch (err) {
      console.error('❌ View prompt error:', {
        error: err,
        requestId: requestId,
        originalRequestId: originalRequestId,
        currentHistoryIndex: currentHistoryIndex,
        hasImage: !!importedImage,
        promptHistoryLength: promptHistory.length
      })
      setError(err instanceof Error ? err.message : "Failed to load prompt")
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null)
      }, 5000)
    } finally {
      setIsLoadingPrompt(false)
    }
  }


  return (
    <div className="h-screen flex flex-col bg-[#f8f9fa] text-foreground">
      {/* Top Navigation Bar */}
      <TopBar
        geminiApiKey={geminiApiKey}
        elevenlabsApiKey={elevenlabsApiKey}
        setTempGeminiApiKey={setTempGeminiApiKey}
        setTempElevenlabsApiKey={setTempElevenlabsApiKey}
        setShowApiKeyModal={setShowApiKeyModal}
        setShowModelSettingsModal={setShowModelSettingsModal}
        showUsageGuideModal={showUsageGuideModal}
        setShowUsageGuideModal={setShowUsageGuideModal}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          leftSidebarOpen={leftSidebarOpen}
          setLeftSidebarOpen={setLeftSidebarOpen}
          imageHistory={imageHistory}
          currentHistoryIndex={currentHistoryIndex}
          setCurrentHistoryIndex={setCurrentHistoryIndex}
          setImportedImage={(img) => setImportedImage(img)}
          setGeneratedCodeUrl={setGeneratedCodeUrl}
          promptHistory={promptHistory}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Canvas Header */}
          <CanvasHeader
            zoom={zoom}
            setZoom={setZoom}
            currentHistoryIndex={currentHistoryIndex}
            imageHistory={imageHistory}
            setCurrentHistoryIndex={setCurrentHistoryIndex}
            setImportedImage={(img) => setImportedImage(img)}
            setGeneratedCodeUrl={setGeneratedCodeUrl}
            isGeneratingCode={isGeneratingCode}
            importedImage={importedImage}
            handleGenerateCode={handleGenerateCode}
            generatedCodeUrl={generatedCodeUrl}
            handleCopyCodeLink={handleCopyCodeLink}
            codeCopySuccess={codeCopySuccess}
            isLoadingPrompt={isLoadingPrompt}
            handleViewPrompt={handleViewPrompt}
            hasPrompt={!!promptCache[currentHistoryIndex]}
            handleExportImage={handleExportImage}
            handleClearCanvas={handleClearCanvas}
          />

          {/* Prompt Panel (dropdown) */}
          {showPromptPanel && promptCache[currentHistoryIndex] && (
            <div className="absolute top-[50px] right-[270px] z-20 w-[450px] bg-white border border-gray-200 rounded-md shadow-lg">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Developer Instructions</h3>
                <div className="flex items-center gap-2">
                  {copySuccess && (
                    <span className="text-xs text-green-600 font-medium">{copySuccess}</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const promptText = promptCache[currentHistoryIndex]?.instructions || 'No instructions available'
                        await navigator.clipboard.writeText(promptText)
                        setCopySuccess('Copied!')
                        setTimeout(() => setCopySuccess(null), 2000)
                      } catch {
                        setCopySuccess('Copy failed')
                        setTimeout(() => setCopySuccess(null), 2000)
                      }
                    }}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPromptPanel(false)}
                    className="h-7 w-7"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-200">
                  {promptCache[currentHistoryIndex]?.instructions || 'No instructions available'}
                </div>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 overflow-auto bg-[#f1f5f9] relative"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0',
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
            onScroll={handleCanvasScroll}
          >
            {importedImage ? (
              <div className="p-8">
                <div
                  ref={imageWrapperRef}
                  className="relative shadow-sm border rounded select-none"
                  style={{
                    width: imageNaturalSize?.width || undefined,
                    height: imageNaturalSize?.height || undefined,
                    transform: `scale(${Math.max(0.01, zoom / 100)})`,
                    transformOrigin: 'top left',
                    marginTop: '32px'
                  }}
                >
                  <img
                    src={importedImage}
                    alt="Imported"
                    draggable={false}
                    className="block pointer-events-none"
                    style={{ width: imageNaturalSize?.width, height: imageNaturalSize?.height }}
                  />

                  {selectionBox && selectedAspectRatio && (
                    <div
                      className="absolute border-2 border-blue-500/80 bg-blue-500/10"
                      style={{
                        left: selectionBox.x,
                        top: selectionBox.y,
                        width: selectionBox.width,
                        height: selectionBox.height,
                      }}
                      onMouseDown={(e) => {
                        if (e.button === 0 && !isResizing) {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsMovingBox(true)
                          setMoveStart({ x: e.clientX, y: e.clientY })
                        }
                      }}
                    >
                      {/* Small loading indicator near selection box */}
                      {isApplyingLiveModeChanges && voiceConversationState.isActive && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg border border-gray-200 p-2 flex items-center justify-center z-50">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        </div>
                      )}
                      {/* Resize Handles */}
                      <div
                        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize -left-1.5 -top-1.5"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setIsResizing(true)
                          setResizeHandle('top-left')
                          setResizeStart({ x: e.clientX, y: e.clientY })
                        }}
                      />
                      <div
                        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize -right-1.5 -top-1.5"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setIsResizing(true)
                          setResizeHandle('top-right')
                          setResizeStart({ x: e.clientX, y: e.clientY })
                        }}
                      />
                      <div
                        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize -left-1.5 -bottom-1.5"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setIsResizing(true)
                          setResizeHandle('bottom-left')
                          setResizeStart({ x: e.clientX, y: e.clientY })
                        }}
                      />
                      <div
                        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-se-resize -right-1.5 -bottom-1.5"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setIsResizing(true)
                          setResizeHandle('bottom-right')
                          setResizeStart({ x: e.clientX, y: e.clientY })
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-600">
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-lg mb-2 font-medium">Import a website to get started</p>
                  <p className="text-sm">Enter a URL below to screenshot and analyze</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Input Bar */}
          <BottomBar
            websiteUrl={websiteUrl}
            setWebsiteUrl={setWebsiteUrl}
            handleImportWebsite={handleImportWebsite}
            isImporting={isImporting}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
          />
        </div>

        {/* Right Properties Panel */}
        <RightPanel
          rightSidebarOpen={rightSidebarOpen}
          setRightSidebarOpen={setRightSidebarOpen}
          zoom={zoom}
          aspectRatios={ASPECT_RATIOS}
          selectedAspectRatio={selectedAspectRatio}
          setSelectedAspectRatio={setSelectedAspectRatio}
          importedImage={importedImage}
          canvasRef={canvasRef}
          setSelectionBox={setSelectionBox}
          isRecording={isRecording}
          elevenlabsApiKey={elevenlabsApiKey}
          handleVoiceInput={handleVoiceInput}
          selectionPrompt={selectionPrompt}
          setSelectionPrompt={setSelectionPrompt}
          isProcessingSelection={isProcessingSelection}
          handleSelectionSubmit={handleSelectionSubmit}
          imageNaturalSize={imageNaturalSize}
          referenceImage={referenceImage}
          setReferenceImage={setReferenceImage}
          error={error}
          setError={setError}
          voiceConversationState={voiceConversationState}
          onStartLiveMode={startLiveMode}
          onStopLiveMode={stopLiveMode}
          isApplyingLiveModeChanges={isApplyingLiveModeChanges}
        />
      </div>


      {/* Success Display */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert className="bg-green-50 border-green-200 shadow-lg">
            <Sparkles className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <strong className="font-medium">Success:</strong> Image transformation completed!
                </div>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
                  aria-label="Dismiss success message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Daily Limit Reached Modal */}
      {showDailyLimitReached && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Daily Limit Reached</h3>
                <p className="text-sm text-gray-500 mb-6">
                  You've used all {FREE_TIER_DAILY_LIMIT} free requests for today. Come back tomorrow for more, or contact us for unlimited access!
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => window.open('mailto:pixie@workmail.com?subject=Love%20Pixie%20-%20Want%20More%20Access', '_blank')}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    💌 Love the product? Chat more pixie@workmail.com
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDailyLimitReached(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

{/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Configure API Keys</h2>
              <p className="text-gray-600 mb-4">
                Configure your API keys for AI features. Gemini is required, ElevenLabs is optional for voice input.
              </p>
              
              {/* Try Pixie Button */}
              <div className="mb-6">
                <Button
                  onClick={handleTryPixie}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  ✨ Try Pixie (Free Tier)
                </Button>
                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-orange-800">
                      <strong>Free Tier Limit:</strong> Only {FREE_TIER_DAILY_LIMIT} requests per day. Perfect for trying out Pixie's features!
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 text-center text-gray-500 text-sm">
                — OR —
              </div>

              {/* Warning when no API key is set */}
              {!tempGeminiApiKey.trim() && !isFreeTier && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <strong>No API key set:</strong> The app will use the server's fallback API key. 
                      If the free tier limit is exceeded, requests may fail. Consider adding your own API key for reliable access.
                    </div>
                  </div>
                </div>
              )}
              
              {/* Gemini API Key */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gemini API Key (Required)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter your Gemini API key..."
                    value={tempGeminiApiKey}
                    onChange={(e) => setTempGeminiApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={validateGeminiApiKey}
                    disabled={isValidatingGemini || !tempGeminiApiKey.trim()}
                    className="px-3"
                  >
                    {isValidatingGemini ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Validate'
                    )}
                  </Button>
                </div>
                {geminiValidationResult && (
                  <div className={`mt-2 text-sm ${geminiValidationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {geminiValidationResult.message}
                  </div>
                )}
              </div>

              {/* ElevenLabs API Key */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ElevenLabs API Key (Optional - for voice input)
                </label>
                <Input
                  type="password"
                  placeholder="Enter your ElevenLabs API key (optional)..."
                  value={tempElevenlabsApiKey}
                  onChange={(e) => setTempElevenlabsApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to disable voice input feature
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowApiKeyModal(false)
                    setTempGeminiApiKey('')
                    setTempElevenlabsApiKey('')
                    setGeminiValidationResult(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApiKeySubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save API Keys
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Settings Modal */}
      {showModelSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Model Settings</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Image Generation Model</label>
                <Input
                  type="text"
                  value={tempImageGenerationModel}
                  onChange={(e) => setTempImageGenerationModel(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Code Generation Model</label>
                <Input
                  type="text"
                  value={tempCodeGenerationModel}
                  onChange={(e) => setTempCodeGenerationModel(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowModelSettingsModal(false)}>Cancel</Button>
                <Button onClick={saveModelSettings} className="bg-blue-600 hover:bg-blue-700 text-white">Save Settings</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Guide Modal */}
      {showUsageGuideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">📹 Usage Guide</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUsageGuideModal(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Video Content */}
            <div className="p-6">
              <div className="aspect-video w-full">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/L-UfqH5WQ-k"
                  title="Pixie Usage Guide"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="rounded-lg"
                ></iframe>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>This video will guide you through all the features of Pixie and show you how to get the most out of the tool.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
