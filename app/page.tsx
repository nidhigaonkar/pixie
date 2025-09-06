"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  ZoomIn,
  ZoomOut,
  Layers,
  History,
  Download,
  Sparkles,
  Upload,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  Camera,
  Lightbulb,
  Sun,
  Box,
  User,
  Image as ImageIcon,
  FolderOpen,
  Plus,
} from "lucide-react"
import { captureWebsiteScreenshot, validateUrl, normalizeUrl } from "@/lib/screenshot-service"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UIElement {
  id: string
  position: { x: number; y: number; width: number; height: number }
  type: "button" | "text" | "image" | "container" | "form"
  selector?: string
  text?: string
  originalImage?: string
  currentImage?: string
  selected: boolean
  visible: boolean
}

export default function FigmaAIApp() {
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [importedImage, setImportedImage] = useState<string | null>(null)
  const [elements, setElements] = useState<UIElement[]>([])
  const [zoom, setZoom] = useState(100)
  const [error, setError] = useState<string | null>(null)
  const [importMetadata, setImportMetadata] = useState<any>(null)
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)
  const [showElementBounds, setShowElementBounds] = useState(true)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to deselect all
      if (e.key === "Escape") {
        setElements((prev) => prev.map((el) => ({ ...el, selected: false })))
      }

      // Delete to remove selected elements
      if (e.key === "Delete" || e.key === "Backspace") {
        setElements((prev) => prev.filter((el) => !el.selected))
      }

      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault()
        setElements((prev) => prev.map((el) => ({ ...el, selected: true })))
      }

      // Ctrl/Cmd + D to duplicate selected elements
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault()
        const selectedElements = elements.filter((el) => el.selected)
        if (selectedElements.length > 0) {
          const duplicates = selectedElements.map((el) => ({
            ...el,
            id: `${el.id}-copy-${Date.now()}`,
            position: {
              ...el.position,
              x: el.position.x + 20,
              y: el.position.y + 20,
            },
            selected: true,
          }))
          setElements((prev) => [...prev.map((el) => ({ ...el, selected: false })), ...duplicates])
        }
      }

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
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [elements])

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
        setImportedImage(result.screenshot)
        setImportMetadata(result.metadata)

        const uiElements: UIElement[] = result.elements.map((element) => ({
          id: element.id,
          position: element.position,
          type: element.type,
          selector: element.selector,
          text: element.text,
          selected: false,
          visible: true,
        }))

        setElements(uiElements)
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

  const handleElementClick = useCallback((elementId: string, event: React.MouseEvent) => {
    const isMultiSelect = event.ctrlKey || event.metaKey

    setElements((prev) =>
      prev.map((el) => {
        if (el.id === elementId) {
          return { ...el, selected: isMultiSelect ? !el.selected : true }
        } else if (!isMultiSelect) {
          return { ...el, selected: false }
        }
        return el
      }),
    )
  }, [])

  const handleElementMouseEnter = useCallback((elementId: string) => {
    setHoveredElement(elementId)
  }, [])

  const handleElementMouseLeave = useCallback(() => {
    setHoveredElement(null)
  }, [])

  const toggleElementVisibility = useCallback((elementId: string) => {
    setElements((prev) => prev.map((el) => (el.id === elementId ? { ...el, visible: !el.visible } : el)))
  }, [])

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Only deselect if clicking on the canvas itself, not on elements
    if (event.target === event.currentTarget) {
      setElements((prev) => prev.map((el) => ({ ...el, selected: false })))
    }
  }, [])

  const handleAITransform = async () => {
    if (!aiPrompt) return
    setIsGenerating(true)
    // TODO: Implement AI transformation
    setTimeout(() => {
      setIsGenerating(false)
      setAiPrompt("")
    }, 3000)
  }

  const selectedElements = elements.filter((el) => el.selected)
  const selectedElement = selectedElements[0] // For single selection display

  return (
    <div className="h-screen flex flex-col bg-[#f8f9fa] text-foreground">
      {/* Top Navigation Bar */}
      <div className="h-12 border-b border-[#e2e8f0] flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm"></div>
            </div>
            <Button variant="ghost" className="text-2xl font-semibold p-0 h-auto hover:bg-transparent text-green-800">
              Pixie
            </Button>
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
            <div className="text-sm text-gray-500">No transformations yet</div>
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
            <div className="text-sm font-medium text-gray-700">Canvas</div>
            <div className="flex items-center gap-4">
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
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-sm px-3 h-8 bg-blue-50 text-blue-600 hover:bg-blue-100">Export</Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 bg-blue-50 text-blue-600 hover:bg-blue-100 border-b-2 border-blue-500">Design</Button>
                <Button variant="ghost" size="sm" className="h-8 text-gray-600 hover:bg-gray-100">Animation</Button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div ref={canvasRef} className="flex-1 overflow-auto bg-white relative" onClick={handleCanvasClick} style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            {importedImage ? (
              <div className="relative inline-block m-8" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}>
                <img src={importedImage} alt="Imported website" className="max-w-none shadow-lg" />
                {/* Element Overlays */}
                {showElementBounds &&
                  elements.map(
                    (element) =>
                      element.visible && (
                        <div
                          key={element.id}
                          className={`absolute cursor-pointer transition-all ${
                            element.selected
                              ? "selection-border"
                              : hoveredElement === element.id
                                ? "element-hover border-2 border-accent/70"
                                : "hover:element-hover"
                          }`}
                          style={{
                            left: element.position.x,
                            top: element.position.y,
                            width: element.position.width,
                            height: element.position.height,
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleElementClick(element.id, e)
                          }}
                          onMouseEnter={() => handleElementMouseEnter(element.id)}
                          onMouseLeave={handleElementMouseLeave}
                          title={`${element.type}: ${element.text || element.id}`}
                        >
                          {(element.selected || hoveredElement === element.id) && (
                            <div className="absolute -top-6 left-0 bg-accent text-accent-foreground text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                              {element.type}{" "}
                              {element.text && `• ${element.text.slice(0, 20)}${element.text.length > 20 ? "..." : ""}`}
                            </div>
                          )}
                        </div>
                      ),
                  )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-600">
                  <Upload className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-lg mb-2 font-medium">Import a website to get started</p>
                  <p className="text-sm mb-6">Enter a URL below to screenshot and analyze</p>
                  <div className="text-sm space-y-1">
                    <div>• Click elements to select them</div>
                    <div>• Hold Ctrl/Cmd for multi-select</div>
                    <div>• Press Esc to deselect all</div>
                    <div>• Press Delete to remove selected</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Input Bar */}
          <div className="h-16 bg-white border-t border-gray-200 flex items-center justify-center gap-6 px-8">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Enter website URL (e.g., https://example.com)"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-64 bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                onKeyDown={(e) => e.key === "Enter" && handleImportWebsite()}
              />
              <Button 
                onClick={handleImportWebsite} 
                disabled={isImporting || !websiteUrl}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4"
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
              <Input
                placeholder={
                  selectedElements.length > 0
                    ? `Upload from computer.`
                    : "Upload from computer"
                }
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={selectedElements.length === 0}
                className="w-64 bg-white border-gray-200 text-gray-900 placeholder-gray-500"
              />
              <Button
                onClick={handleAITransform}
                disabled={isGenerating || !aiPrompt || selectedElements.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Import Image
                  </>
                )}
              </Button>
            </div>
          </div>

        </div>

        {/* Right Properties Panel */}
        <div className={`${rightSidebarOpen ? 'w-80' : 'w-8'} bg-white border-l border-[#e2e8f0] flex flex-col relative transition-all duration-300`}>
          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-0 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 hover:bg-gray-100 rounded-full z-10 flex items-center justify-center"
            onClick={() => setRightSidebarOpen(prev => !prev)}
          >
            <ChevronDown className={`w-4 h-4 transform transition-transform ${rightSidebarOpen ? '-rotate-90' : 'rotate-90'} text-gray-600`} />
          </Button>

          <div className={`min-w-[320px] ${rightSidebarOpen ? '' : 'invisible'}`}>
            <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Properties</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
                <Plus className="w-4 h-4 text-gray-600" />
              </Button>
            </div>

            <div className="flex-1 p-4">
              <div className="text-center text-gray-500">
                <p className="mb-4">Select an element to view properties</p>
                <div className="text-sm space-y-2 text-left">
                  <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Click</kbd> to select</div>
                  <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+Click</kbd> multi-select</div>
                  <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Esc</kbd> deselect all</div>
                  <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Del</kbd> remove selected</div>
                  <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+A</kbd> select all</div>
                  <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+D</kbd> duplicate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}