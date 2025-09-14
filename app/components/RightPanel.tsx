"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown, Mic, Image as ImageIcon, X, AlertCircle } from "lucide-react"
import type React from "react"
import { useRef, useCallback } from "react"

type AspectRatio = { id: string; name: string; ratio: number }

type SelectionBox = { x: number; y: number; width: number; height: number } | null

type Props = {
  rightSidebarOpen: boolean
  setRightSidebarOpen: (v: (prev: boolean) => boolean) => void
  zoom: number
  aspectRatios: AspectRatio[]
  selectedAspectRatio: AspectRatio | null
  setSelectedAspectRatio: (v: AspectRatio | null) => void
  importedImage: string | null
  canvasRef: React.RefObject<HTMLDivElement>
  setSelectionBox: (v: SelectionBox) => void
  isRecording: boolean
  elevenlabsApiKey: string
  handleVoiceInput: () => Promise<void>
  selectionPrompt: string
  setSelectionPrompt: (v: string) => void
  isProcessingSelection: boolean
  handleSelectionSubmit: () => Promise<void>
  imageNaturalSize: { width: number; height: number } | null
  referenceImage: string | null
  setReferenceImage: (v: string | null) => void
  error: string | null
  setError: (v: string | null) => void
}

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file as Data URL'))
      }
    }
    reader.onerror = () => {
      reject(new Error('Error reading file'))
    }
    reader.readAsDataURL(file)
  })
}

export default function RightPanel({
  rightSidebarOpen,
  setRightSidebarOpen,
  zoom,
  aspectRatios,
  selectedAspectRatio,
  setSelectedAspectRatio,
  importedImage,
  canvasRef,
  setSelectionBox,
  isRecording,
  elevenlabsApiKey,
  handleVoiceInput,
  selectionPrompt,
  setSelectionPrompt,
  isProcessingSelection,
  handleSelectionSubmit,
  imageNaturalSize,
  referenceImage,
  setReferenceImage,
  error,
  setError,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const dataUrl = await readFileAsDataURL(file)
        setReferenceImage(dataUrl)
      } catch (error) {
        console.error('Error processing file:', error)
        // Optionally, show an error to the user
      }
    }
  }

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
      const items = event.clipboardData.items
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            event.preventDefault()
            try {
              const dataUrl = await readFileAsDataURL(file)
              setReferenceImage(dataUrl)
            } catch (error) {
              console.error('Error processing pasted image:', error)
            }
            break
          }
        }
      }
    },
    [setReferenceImage]
  )
  return (
    <div className={`${rightSidebarOpen ? 'w-96' : 'w-8'} shrink-0 bg-white border-l border-[#e2e8f0] flex flex-col relative transition-all duration-300`}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute -left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 hover:bg-gray-100 rounded-full z-10 flex items-center justify-center"
        onClick={() => setRightSidebarOpen((prev) => !prev)}
      >
        <ChevronDown className={`w-4 h-4 transform transition-transform ${rightSidebarOpen ? '-rotate-90' : 'rotate-90'} text-gray-600`} />
      </Button>

      <div className={`min-w-[384px] ${rightSidebarOpen ? '' : 'invisible'}`}>
        <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Properties</h3>
        </div>

        <div className="flex-1 p-4">
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Zoom: {Math.round(zoom)}%</div>
            <div className="space-y-2">
              {aspectRatios.map((ratio) => (
                <Button
                  key={ratio.id}
                  variant={selectedAspectRatio?.id === ratio.id ? "default" : "outline"}
                  className="w-full justify-start text-left"
                  onClick={() => {
                    if (selectedAspectRatio?.id === ratio.id) {
                      setSelectionBox(null)
                      setSelectedAspectRatio(null)
                    } else {
                      setSelectedAspectRatio(ratio)
                      if (importedImage) {
                        // Create a large, visible selection box in the center of the canvas viewport
                        const canvas = canvasRef.current
                        if (canvas) {
                          // Get canvas viewport dimensions
                          const canvasRect = canvas.getBoundingClientRect()
                          const scale = Math.max(0.01, zoom / 100)
                          
                          // Calculate center of visible area in image coordinates
                          const visibleCenterX = (canvas.scrollLeft + canvasRect.width / 2) / scale
                          const visibleCenterY = (canvas.scrollTop + canvasRect.height / 2) / scale
                          
                          // Create a large, visible selection box (300px width)
                          const initialWidth = 300
                          const height = initialWidth / ratio.ratio
                          const x = visibleCenterX - initialWidth / 2
                          const y = visibleCenterY - height / 2
                          
                          setSelectionBox({ x, y, width: initialWidth, height })
                        } else {
                          // Fallback if canvas ref not available
                          const initialWidth = 300
                          const height = initialWidth / ratio.ratio
                          setSelectionBox({ x: 100, y: 100, width: initialWidth, height })
                        }
                      }
                    }
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{ratio.name}</span>
                    {ratio.id === 'freestyle' && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full font-medium">
                        BETA
                      </span>
                    )}
                  </div>
                </Button>
              ))}
            </div>

            {importedImage && (
              <div className="border-t border-gray-200 pt-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-sm font-medium text-gray-700">Describe the change</label>
                      <div className="relative group">
                        <Button
                          variant="outline"
                          size="icon"
                          className={`h-6 w-6 transition-colors ${
                            !elevenlabsApiKey || elevenlabsApiKey.trim() === ''
                              ? 'opacity-50 cursor-not-allowed'
                              : isRecording
                                ? 'bg-red-100 border-red-500 text-red-500 hover:bg-red-200'
                                : 'hover:bg-gray-100'
                          }`}
                          onClick={elevenlabsApiKey && elevenlabsApiKey.trim() ? handleVoiceInput : undefined}
                          disabled={!elevenlabsApiKey || elevenlabsApiKey.trim() === ''}
                        >
                          <Mic className={`w-3 h-3 ${isRecording ? 'animate-pulse' : ''}`} />
                        </Button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                          {!elevenlabsApiKey || elevenlabsApiKey.trim() === ''
                            ? 'Add an ElevenLabs API key to enable voice input'
                            : isRecording
                              ? 'Recording... click to stop'
                              : 'Use your microphone to describe the changes'}
                        </div>
                      </div>
                    </div>
                    <textarea
                      value={selectionPrompt}
                      onChange={(e) => setSelectionPrompt(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="Make the button blue, add a headline..."
                      className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Reference Image (optional)</label>
                    <div 
                      className="w-full h-32 border-2 border-dashed rounded-md flex items-center justify-center text-sm text-gray-500 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors relative"
                      onClick={handleImageUploadClick}
                      onPaste={handlePaste}
                      tabIndex={0} // Make it focusable for paste
                    >
                      {referenceImage ? (
                        <>
                          <img src={referenceImage} alt="Reference" className="max-h-full max-w-full object-contain rounded" />
                          <Button 
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              setReferenceImage(null)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p>Click to upload or paste image</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                  <Button
                    onClick={handleSelectionSubmit}
                    disabled={isProcessingSelection || !selectionPrompt.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessingSelection ? 'Processing...' : 'Apply Changes'}
                  </Button>
                </div>
                
                {/* Error Display - positioned below Apply Changes button */}
                {error && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-red-800 line-clamp-2 break-words">
                          <strong className="font-medium">Error:</strong> {error}
                        </div>
                      </div>
                      <button
                        onClick={() => setError(null)}
                        className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
                        aria-label="Dismiss error"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                
                {!selectedAspectRatio && (
                  <div className="text-xs text-gray-500 mt-3">Tip: choose an aspect ratio above to create a selection box on the canvas.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
