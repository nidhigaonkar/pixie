"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  ZoomIn,
  ZoomOut,
  History,
  Sparkles,
  Upload,
  Loader2,
  AlertCircle,
  ChevronDown,
  Plus,
  Mic,
  X,
  Code,
  Copy,
} from "lucide-react"
import { captureWebsiteScreenshot, validateUrl, normalizeUrl } from "@/lib/screenshot-service"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const [isProcessingSelection, setIsProcessingSelection] = useState(false)
  const [promptHistory, setPromptHistory] = useState<{timestamp: number; prompt: string}[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentView, setCurrentView] = useState<'design' | 'code'>('design')
  const [imageHistory, setImageHistory] = useState<string[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [isCopyingPrompt, setIsCopyingPrompt] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

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
              'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY as string,
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
      setZoom(prev => Math.min(200, Math.max(25, prev + delta * 25)))
    }
  }, [])

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
      if (isMovingBox && moveStart && selectionBox) {
        e.preventDefault()
        
        const deltaX = e.clientX - moveStart.x
        const deltaY = e.clientY - moveStart.y
        
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
        
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y
        
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
          setZoom(optimalZoom)
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
    // Only handle events if clicking on canvas background
    if (event.target === event.currentTarget) {
      if (event.button === 0) {
        // Left click - start dragging and deselect elements
        event.preventDefault()
        event.stopPropagation()
        
        const canvas = canvasRef.current
        if (canvas) {
          setIsDragging(true)
          setStartDragPosition({ x: event.clientX, y: event.clientY })
          setScrollPosition({
            x: canvas.scrollLeft,
            y: canvas.scrollTop
          })
          
          // Change cursor style
          canvas.style.cursor = 'grabbing'
        }
      } else if (event.button === 2 && (event.ctrlKey || event.metaKey)) {
        // Control + Right click - start selection
        event.preventDefault()
        event.stopPropagation()
        
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          const x = event.clientX - rect.left + canvas.scrollLeft
          const y = event.clientY - rect.top + canvas.scrollTop
          
          setIsSelecting(true)
          setSelectionStart({ x, y })
          setSelectionBox({ x, y, width: 0, height: 0 })
        }
      }
    }
  }, [])

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
        setZoom(optimalZoom)
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

  const handleGenerateCode = () => {
    setCurrentView('code')
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
      const formData = new FormData()
      formData.append('prompt', selectionPrompt.trim())
      formData.append('image', blob, 'selection.png')
      formData.append('aspect_ratio', `${selectedAspectRatio.ratio}:1`)
      formData.append('request_id', `pixie_${Date.now()}`)
      formData.append('numberOfImages', '1')

      // Make API call
      const response = await fetch('https://awake-lauraine-vinaykudari-b9455624.koyeb.app/v1/images/apply', {
        method: 'POST',
        headers: {
          'X-API-Key': 'AIzaSyCFUYBEcu7HQ2tPWVWJjeSBOjQ24qS56kE'
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
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
        prompt: selectionPrompt.trim()
      }, ...prev])

      // Show success message
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)

      // Clean up blob URL
      URL.revokeObjectURL(resultImageUrl)

      // Keep aspect ratio and box, just clear prompt
      setSelectionPrompt("")

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

  const handleCopyPrompt = async () => {
    if (!importedImage || currentHistoryIndex < 0) {
      setError('No image available to copy prompt for')
      setTimeout(() => setError(null), 5000)
      return
    }

    setIsCopyingPrompt(true)
    setError(null)

    try {
      // Make API call to get prompt data
      const formData = new FormData()
      formData.append('request_id', `pixie_copy_${Date.now()}`)
      formData.append('image_id', String(currentHistoryIndex + 1))

      
      const response = await fetch('https://awake-lauraine-vinaykudari-b9455624.koyeb.app/v1/images/prompt', {
        method: 'POST',
        headers: {
          'X-API-Key': 'AIzaSyCFUYBEcu7HQ2tPWVWJjeSBOjQ24qS56kE'
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const promptData = await response.json()
      
      // Format the data for clipboard
      let clipboardContent = ''
      
      if (promptData.instructions) {
        clipboardContent += `Instructions:\n${promptData.instructions}\n\n`
      }
      
      if (promptData.assets && promptData.assets.length > 0) {
        clipboardContent += 'Assets:\n'
        promptData.assets.forEach((asset: any, index: number) => {
          clipboardContent += `${index + 1}. ${asset.filename || `asset_${index + 1}`}\n`
          if (asset.data) {
            clipboardContent += `   Data: ${asset.data.substring(0, 100)}...\n`
          }
        })
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(clipboardContent)
      
      // Show success message
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)

    } catch (err) {
      console.error("Copy prompt error:", err)
      setError(err instanceof Error ? err.message : "Failed to copy prompt")
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null)
      }, 5000)
    } finally {
      setIsCopyingPrompt(false)
    }
  }


  return (
    <div className="h-screen flex flex-col bg-[#f8f9fa] text-foreground">
      {/* Top Navigation Bar */}
      <div className="h-20 border-b border-[#e2e8f0] flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-32 overflow-hidden">
              <img 
                src="/pixie logo.png" 
                alt="Pixie" 
                className="h-[120%] w-[120%] object-cover object-center transform -translate-x-[11.5%] -translate-y-[11.5%]" 
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          
          <Button variant="ghost" size="sm" className="h-8 px-3 bg-gray-100 hover:bg-gray-200 rounded-md">Share</Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className={`${leftSidebarOpen ? 'w-64' : 'w-8'} bg-white border-r border-[#e2e8f0] flex flex-col relative transition-all duration-300`}>
          {/* History Panel */}
          <div className={`p-4 min-w-[256px] ${leftSidebarOpen ? '' : 'invisible'}`}>
            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
              <History className="w-4 h-4 text-gray-600" />
              <span>History</span>
            </div>
            <div className="space-y-2">
              {imageHistory.length === 0 ? (
                <div className="text-sm text-gray-500">No transformations yet</div>
              ) : (
                imageHistory.map((_, index, array) => {
                  const historyIndex = index;
                  const isOriginal = historyIndex === 0;
                  const isCurrent = historyIndex === currentHistoryIndex;
                  // promptHistory is added with newest first, so we need to reverse the index
                  // index 1 (first transformation) maps to promptHistory[promptHistory.length - 1]
                  // index 2 (second transformation) maps to promptHistory[promptHistory.length - 2], etc.
                  const prompt = index > 0 ? promptHistory[promptHistory.length - index] : null;
                  
                  return (
                    <div 
                      key={index} 
                      className={`text-sm p-2 rounded transition-colors cursor-pointer hover:bg-gray-100 ${
                        isCurrent ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100' : 'bg-gray-50'
                      }`}
                      onClick={() => {
                        setCurrentHistoryIndex(historyIndex);
                        setImportedImage(imageHistory[historyIndex]);
                      }}
                    >
                      <div className="text-gray-900">
                        {isOriginal ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Original Image</span>
                            
                          </div>
                        ) : prompt ? (
                          prompt.prompt
                        ) : (
                          "Image Update"
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {prompt ? new Date(prompt.timestamp).toLocaleTimeString() : ""}
                      </div>
                    </div>
                  );
                }).reverse()
              )}
            </div>
          </div>
          
          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 hover:bg-gray-100 rounded-full z-10 flex items-center justify-center"
            onClick={() => setLeftSidebarOpen(prev => !prev)}
          >
            <ChevronDown className={`w-4 h-4 transform transition-transform ${leftSidebarOpen ? 'rotate-90' : '-rotate-90'} text-gray-600`} />
          </Button>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Header */}
          <div className="h-12 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setZoom(prev => Math.max(25, prev - 25))}
                  disabled={zoom <= 25}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <div className="text-sm text-gray-500 min-w-[60px] text-center">{zoom}%</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setZoom(prev => Math.min(200, prev + 25))}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Undo/Redo Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (currentHistoryIndex > 0) {
                      setCurrentHistoryIndex(prev => prev - 1)
                      setImportedImage(imageHistory[currentHistoryIndex - 1])
                    }
                  }}
                  disabled={currentHistoryIndex <= 0}
                  title="Undo"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 14L4 9L9 4" />
                    <path d="M4 9H15C18.866 9 22 12.134 22 16C22 19.866 18.866 23 15 23H8" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (currentHistoryIndex < imageHistory.length - 1) {
                      setCurrentHistoryIndex(prev => prev + 1)
                      setImportedImage(imageHistory[currentHistoryIndex + 1])
                    }
                  }}
                  disabled={currentHistoryIndex >= imageHistory.length - 1}
                  title="Redo"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 14L20 9L15 4" />
                    <path d="M20 9H9C5.134 9 2 12.134 2 16C2 19.866 5.134 23 9 23H16" />
                  </svg>
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* View Controls */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-8 ${currentView === 'design' ? 'bg-green-50 text-green-600 hover:bg-green-100 border-b-2 border-green-500' : 'text-green-600 hover:bg-gray-100'}`}
                  onClick={() => setCurrentView('design')}
                >
                  Design
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className={`h-8 px-3 ${currentView === 'code' ? 'bg-green-50 text-green-600 hover:bg-green-100 border-b-2 border-green-500' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                onClick={handleGenerateCode}
              >
                Generate Code
              </Button>
              <Button 
                variant="ghost" 
                className="text-sm px-3 h-8 bg-green-50 text-green-600 hover:bg-green-100"
                onClick={handleCopyPrompt}
                disabled={isCopyingPrompt || !importedImage || currentHistoryIndex < 0}
              >
                {isCopyingPrompt ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Prompt
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="absolute top-4 right-4 z-50">
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Canvas */}
          <div 
            ref={canvasRef} 
            className={`flex-1 overflow-auto bg-white relative select-none scroll-smooth`}
            onMouseDown={currentView === 'design' ? handleCanvasMouseDown : undefined}
            onMouseMove={currentView === 'design' ? handleCanvasMouseMove : undefined}
            onMouseUp={currentView === 'design' ? handleCanvasMouseUp : undefined}
            onMouseLeave={currentView === 'design' ? handleCanvasMouseLeave : undefined}
            onScroll={currentView === 'design' ? handleCanvasScroll : undefined}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              cursor: currentView === 'design' && isControlPressed ? 'crosshair' : 'default',
              backgroundImage: currentView === 'design' ? 'radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1px)' : 'none',
              backgroundSize: currentView === 'design' ? '20px 20px' : 'auto'
            }}>
            {/* Render content based on current view */}
            {currentView === 'design' ? (
              <>
            {importedImage ? (
              <div 
                className="relative inline-block" 
                style={{ 
                  transform: `scale(${zoom / 100})`, 
                  transformOrigin: "top left",
                  position: 'absolute',
                  left: imagePosition.x,
                  top: imagePosition.y,
                  cursor: isSelecting ? 'crosshair' : isControlPressed ? 'crosshair' : 'default'
                }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <img src={importedImage} alt="Imported website" className="max-w-none shadow-lg select-none" />
                {/* Selection Box */}
                {selectionBox && selectedAspectRatio && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500/20"
                    style={{
                      left: selectionBox.x,
                      top: selectionBox.y,
                      width: selectionBox.width,
                      height: selectionBox.height,
                      cursor: isResizing ? 'grabbing' : isMovingBox ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={(e) => {
                      // Handle left click for dragging, ignore if already resizing
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-600">
                  <Upload className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-lg mb-2 font-medium">Import a website to get started</p>
                  <p className="text-sm mb-6">Enter a URL below to screenshot and analyze</p>
                </div>
              </div>
            )}
              </>
            ) : (
              // Code tab content - blank screen
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <Code className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg mb-2 font-medium">Code View</p>
                  <p className="text-sm">Generated code will appear here</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Input Bar - Only show for design view */}
          {currentView === 'design' && (
          <div className="h-16 bg-white border-t border-gray-200 flex items-center justify-center gap-4 px-8">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Add the link to your website"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-64 bg-white border-gray-200 text-gray-900 placeholder-gray-500"
              />
              <Button 
                onClick={handleImportWebsite} 
                disabled={isImporting}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 hover:-translate-y-0.5 transition-transform"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Website
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleFileUpload} 
                disabled={isUploading}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 relative group hover:-translate-y-0.5 transition-transform"
                title="Upload image from your computer (JPEG, PNG, GIF, WebP up to 5MB)"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </>
                )}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Upload image from your computer<br />
                  Supports: JPEG, PNG, GIF, WebP (max 5MB)
                </div>
              </Button>
            </div>
          </div>
          )}

        </div>

        {/* Right Properties Panel */}
        <div className={`${rightSidebarOpen ? 'w-96' : 'w-8'} bg-white border-l border-[#e2e8f0] flex flex-col relative transition-all duration-300`}>
          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute -left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 hover:bg-gray-100 rounded-full z-10 flex items-center justify-center"
            onClick={() => setRightSidebarOpen(prev => !prev)}
          >
            <ChevronDown className={`w-4 h-4 transform transition-transform ${rightSidebarOpen ? '-rotate-90' : 'rotate-90'} text-gray-600`} />
          </Button>

          <div className={`min-w-[384px] ${rightSidebarOpen ? '' : 'invisible'}`}>
            <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Properties</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
                <Plus className="w-4 h-4 text-gray-600" />
              </Button>
            </div>

            <div className="flex-1 p-4">
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Aspect Ratios</div>
                <div className="space-y-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <Button
                      key={ratio.id}
                      variant={selectedAspectRatio?.id === ratio.id ? "default" : "outline"}
                      className="w-full justify-start text-left"
                      onClick={() => {
                        if (selectedAspectRatio?.id === ratio.id) {
                          // If the same ratio is clicked again, deselect it
                          setSelectionBox(null)
                          setSelectedAspectRatio(null)
                          // Also clear any resize/move states
                          setIsResizing(false)
                          setIsMovingBox(false)
                          setResizeHandle(null)
                          setMoveStart(null)
                          setResizeStart(null)
                        } else {
                          // Select the new ratio
                          setSelectedAspectRatio(ratio)
                          // Create initial selection box in the center of the image
                          if (importedImage && canvasRef.current) {
                            const canvas = canvasRef.current
                            const rect = canvas.getBoundingClientRect()
                            const centerX = rect.width / 2
                            const centerY = rect.height / 2
                            const initialWidth = 200 // Base width
                            const height = initialWidth / ratio.ratio
                            setSelectionBox({
                              x: centerX - initialWidth / 2,
                              y: centerY - height / 2,
                              width: initialWidth,
                              height: height
                            })
                          }
                        }
                      }}
                    >
                      {ratio.name}
                    </Button>
                  ))}
                </div>

                {/* Selection Prompt Input */}
                {selectedAspectRatio && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Describe the change</div>
                    <div className="flex gap-2 mb-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className={`shrink-0 transition-colors ${isRecording ? 'bg-red-100 border-red-500 text-red-500 hover:bg-red-200' : ''}`}
                        title={isRecording ? 'Stop recording' : 'Use voice input'}
                        onClick={handleVoiceInput}
                      >
                        <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
                      </Button>
                      <Input
                        placeholder="e.g. change the text from hello to hey there!"
                        value={selectionPrompt}
                        onChange={(e) => setSelectionPrompt(e.target.value)}
                        className="w-full"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && selectionPrompt.trim()) {
                            e.preventDefault()
                            handleSelectionSubmit()
                          }
                        }}
                      />
                    </div>
                    <Button
                      onClick={handleSelectionSubmit}
                      disabled={!selectionPrompt.trim() || isProcessingSelection || !selectionBox}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isProcessingSelection ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Apply Changes
                        </>
                      )}
                    </Button>
                    <div className="text-xs mt-2">
                      {showSuccess ? (
                        <div className="text-green-600 font-medium">Completed! 🍌</div>
                      ) : selectionBox ? (
                        <div className="text-gray-500">
                          Press <kbd className="bg-gray-200 px-1 py-0.5 rounded">Enter</kbd> to apply
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          Create a selection on the image to enable
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}