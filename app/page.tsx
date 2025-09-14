"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Upload, Download, Sparkles, Mic, MicOff, Loader2, Settings, Eye, EyeOff, X, Copy, History, ChevronDown, ZoomOut, ZoomIn, Code, Plus } from "lucide-react"
import { captureWebsiteScreenshot, validateUrl, normalizeUrl } from "@/lib/screenshot-service"
import TopBar from "./components/TopBar"
import LeftSidebar from "./components/LeftSidebar"
import CanvasHeader from "./components/CanvasHeader"
import BottomBar from "./components/BottomBar"
import RightPanel from "./components/RightPanel"

// Helper to get the unified API base URL
// Prefer env var; otherwise default to the GCP Cloud Run URL
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
  { id: 'widescreen', name: '16:9 (Widescreen)', ratio: 16/9 }
]



export default function FigmaAIApp() {
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [showCodePopup, setShowCodePopup] = useState(false)
  const [codePopupData, setCodePopupData] = useState<{htmlPath: string; viewUrl?: string} | null>(null)
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
  const [promptHistory, setPromptHistory] = useState<{timestamp: number; prompt: string; requestId: string}[]>([])
  const [promptCache, setPromptCache] = useState<{[historyIndex: number]: {instructions: string; assets: any[]}}>({})
  const [showPromptPanel, setShowPromptPanel] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentView, setCurrentView] = useState<'design'>('design')
  const [imageHistory, setImageHistory] = useState<string[]>([])
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
  const [imageGenerationModel, setImageGenerationModel] = useState('gemini-2.5-flash-image-preview')
  const [codeGenerationModel, setCodeGenerationModel] = useState('gemini-2.5-pro')
  const [tempImageGenerationModel, setTempImageGenerationModel] = useState('gemini-2.5-flash-image-preview')
  const [tempCodeGenerationModel, setTempCodeGenerationModel] = useState('gemini-2.5-pro')
  const canvasRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Load API keys from localStorage on component mount
  useEffect(() => {
    const savedGeminiApiKey = localStorage.getItem('gemini_api_key')
    const savedElevenlabsApiKey = localStorage.getItem('elevenlabs_api_key')
    
    if (savedGeminiApiKey) {
      setGeminiApiKey(savedGeminiApiKey)
    }
    if (savedElevenlabsApiKey) {
      setElevenlabsApiKey(savedElevenlabsApiKey)
    }
    
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
    setGeminiApiKey(tempGeminiApiKey.trim())
    if (tempGeminiApiKey.trim()) {
      localStorage.setItem('gemini_api_key', tempGeminiApiKey.trim())
    } else {
      localStorage.removeItem('gemini_api_key')
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
        
        if (errorData.detail) {
          // Handle different error response formats
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => err.msg || err.message || String(err)).join(', ')
          } else if (typeof errorData.detail === 'object') {
            errorMessage = errorData.detail.msg || errorData.detail.message || JSON.stringify(errorData.detail)
          }
        } else if (errorData.message) {
          errorMessage = errorData.message
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
        
        // Calculate new dimensions based on aspect ratio
        let newWidth = selectionBox.width
        let newHeight = selectionBox.height
        let newX = selectionBox.x
        let newY = selectionBox.y
        
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

      // Enter to submit selection
      if (e.key === "Enter" && selectionBox && selectedAspectRatio && selectionPrompt.trim()) {
        e.preventDefault()
        handleSelectionSubmit()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectionBox, selectedAspectRatio, selectionPrompt])

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
        
        if (canvasRef.current) {
          const canvas = canvasRef.current
          const canvasWidth = canvas.clientWidth - 64 // Account for padding
          const canvasHeight = canvas.clientHeight - 64
          
          const scaleX = canvasWidth / img.width
          const scaleY = canvasHeight / img.height
          const optimalScale = Math.min(scaleX, scaleY, 1) // Don't zoom in, only zoom out
          
          const optimalZoom = Math.max(25, Math.min(100, optimalScale * 100)) // Keep within zoom bounds
          setZoom(Math.round(optimalZoom))
        }
        
        setImportedImage(newImage)
        setImportMetadata(result.metadata)
        // Add to history
        setImageHistory(prev => [...prev.slice(0, currentHistoryIndex + 1), newImage])
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
      
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const canvasWidth = canvas.clientWidth - 64 // Account for padding
        const canvasHeight = canvas.clientHeight - 64
        
        const scaleX = canvasWidth / img.width
        const scaleY = canvasHeight / img.height
        const optimalScale = Math.min(scaleX, scaleY, 1) // Don't zoom in, only zoom out
        
        const optimalZoom = Math.max(25, Math.min(100, optimalScale * 100)) // Keep within zoom bounds
        setZoom(Math.round(optimalZoom))
      }
      
      // Add to history
      setImageHistory(prev => [...prev.slice(0, currentHistoryIndex + 1), imageDataUrl])
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

    setIsGeneratingCode(true)
    setError(null)

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
          'X-API-Key': geminiApiKey || 'AIzaSyA8QsHg05havRjPCsxozM_dM5qBd6yhY8M'
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
      
      // Show popup with HTML path
      console.log('🔍 Checking result.html_path:', result.html_path)
      if (result.html_path) {
        console.log('✅ Setting popup data and showing popup')
        setCodePopupData({
          htmlPath: result.html_path,
          viewUrl: result.view_url
        })
        setShowCodePopup(true)
        console.log('✅ Popup state set to true')
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

  const handleSelectionSubmit = async () => {
    if (!selectionBox || !selectedAspectRatio || !importedImage || !selectionPrompt.trim()) {
      return
    }

    setIsProcessingSelection(true)
    setError(null)

    try {
      // Create a canvas to extract the selected area
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not create canvas context')
      }

      // Load the image
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = importedImage
      })

      // Set canvas dimensions to match selection
      canvas.width = selectionBox.width
      canvas.height = selectionBox.height

      // Draw the selected portion of the image
      ctx.drawImage(
        img,
        selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height,
        0, 0, selectionBox.width, selectionBox.height
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
      formData.append('prompt', selectionPrompt.trim())
      formData.append('image', blob, 'selection.png')
      formData.append('aspect_ratio', `${selectedAspectRatio.ratio}:1`)
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
        prompt: selectionPrompt.trim(),
        aspectRatio: `${selectedAspectRatio.ratio}:1`,
        imageSize: blob.size
      })

      // Make API call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': geminiApiKey || 'AIzaSyA8QsHg05havRjPCsxozM_dM5qBd6yhY8M'
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

      // Update the original image by replacing the selected area with the result
      const originalImg = new Image()
      await new Promise((resolve, reject) => {
        originalImg.onload = resolve
        originalImg.onerror = reject
        originalImg.src = importedImage
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
        selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height
      )

      // Convert final canvas to data URL and update the image
      const finalImageUrl = finalCanvas.toDataURL()
      // Add to history
      setImageHistory(prev => [...prev.slice(0, currentHistoryIndex + 1), finalImageUrl])
      setCurrentHistoryIndex(prev => prev + 1)
      setImportedImage(finalImageUrl)

      // Add to history
      setPromptHistory(prev => [{
        timestamp: Date.now(),
        prompt: selectionPrompt.trim(),
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
    if (!importedImage) {
      setError('No image to export')
      setTimeout(() => setError(null), 5000)
      return
    }

    const link = document.createElement('a')
    link.href = importedImage
    link.download = `pixie-export-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleViewPrompt = async () => {
    // If the panel is already open, just close it and return.
    if (showPromptPanel) {
      setShowPromptPanel(false)
      return
    }

    if (!importedImage || currentHistoryIndex <= 0) {
      setError('No image available to view prompt for')
      setTimeout(() => setError(null), 5000)
      return
    }

    // If we have cached data, show the panel.
    if (promptCache[currentHistoryIndex]) {
      setShowPromptPanel(true)
      return
    }

    setIsLoadingPrompt(true)
    setError(null)

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
          'X-API-Key': geminiApiKey || 'AIzaSyA8QsHg05havRjPCsxozM_dM5qBd6yhY8M'
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
        copySuccess={copySuccess}
        setCopySuccess={setCopySuccess}
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
            isGeneratingCode={isGeneratingCode}
            importedImage={importedImage}
            handleGenerateCode={handleGenerateCode}
            isLoadingPrompt={isLoadingPrompt}
            handleViewPrompt={handleViewPrompt}
            hasPrompt={!!promptCache[currentHistoryIndex]}
            handleExportImage={handleExportImage}
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
            className="flex-1 overflow-auto bg-[#f1f5f9]"
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

{/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Configure API Keys</h2>
              <p className="text-gray-600 mb-4">
                Configure your API keys for AI features. Gemini is required, ElevenLabs is optional for voice input.
              </p>
              
              {/* Warning when no API key is set */}
              {!tempGeminiApiKey.trim() && (
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

      {/* Code Generation Success Popup */}
      {(() => {
        console.log('🔍 Popup render check - showCodePopup:', showCodePopup, 'codePopupData:', codePopupData)
        return showCodePopup && codePopupData
      })() && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Code Generated Successfully! 🎉</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCodePopup(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 mb-4">Your HTML code has been generated and is ready to view!</p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    const urlToOpen = codePopupData.viewUrl || codePopupData.htmlPath
                    window.open(urlToOpen, '_blank')
                    setShowCodePopup(false)
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Code className="w-4 h-4 mr-2" />
                  View Generated HTML
                </Button>
                
                <div className="text-xs text-gray-500 break-all bg-gray-50 p-2 rounded">
                  {codePopupData.htmlPath}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
