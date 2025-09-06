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
  const canvasRef = useRef<HTMLDivElement>(null)

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
    <div className="h-screen flex bg-background text-foreground">
      {/* Left Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Figma AI</h2>
        </div>

        {/* Layers Panel */}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span className="text-sm font-medium">Layers</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowElementBounds(!showElementBounds)}
              className="h-6 w-6 p-0"
            >
              {showElementBounds ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </Button>
          </div>
          <div className="space-y-1">
            {elements.map((element) => (
              <div
                key={element.id}
                className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-colors ${
                  element.selected
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : hoveredElement === element.id
                      ? "bg-sidebar-primary/50 text-sidebar-foreground"
                      : "hover:bg-sidebar-primary text-sidebar-foreground"
                }`}
                onClick={() => handleElementClick(element.id, { ctrlKey: false, metaKey: false } as React.MouseEvent)}
                onMouseEnter={() => handleElementMouseEnter(element.id)}
                onMouseLeave={handleElementMouseLeave}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleElementVisibility(element.id)
                  }}
                  className="h-4 w-4 p-0 opacity-60 hover:opacity-100"
                >
                  {element.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{element.type}</div>
                  <div className="text-xs text-muted-foreground truncate">{element.text || element.id}</div>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* History Panel */}
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4" />
            <span className="text-sm font-medium">History</span>
          </div>
          <div className="text-xs text-muted-foreground">No transformations yet</div>

          {importMetadata && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">IMPORT INFO</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>URL: {new URL(importMetadata.url).hostname}</div>
                  <div>Elements: {elements.length}</div>
                  <div>Selected: {selectedElements.length}</div>
                  <div>
                    Size: {importMetadata.dimensions.width}×{importMetadata.dimensions.height}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Header */}
        <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Canvas</span>
            {importMetadata && (
              <span className="text-xs text-muted-foreground">
                • {elements.length} elements detected
                {selectedElements.length > 0 && ` • ${selectedElements.length} selected`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(25, zoom - 25))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div ref={canvasRef} className="flex-1 overflow-auto canvas-grid relative" onClick={handleCanvasClick}>
          {importedImage ? (
            <div
              className="relative inline-block m-8"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
            >
              <img src={importedImage || "/placeholder.svg"} alt="Imported website" className="max-w-none shadow-lg" />
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
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">Import a website to get started</p>
                <p className="text-sm text-muted-foreground mt-2">Enter a URL below to screenshot and analyze</p>
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <div>• Click elements to select them</div>
                  <div>• Hold Ctrl/Cmd for multi-select</div>
                  <div>• Press Esc to deselect all</div>
                  <div>• Press Delete to remove selected</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Prompt Bar */}
        <div className="bg-card border-t border-border p-4">
          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 h-12">
            {/* URL Input Section */}
            <div className="flex-1">
              <div className="flex gap-2 h-full">
                <Input
                  placeholder="Enter website URL (e.g., https://example.com)"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleImportWebsite()}
                />
                <Button onClick={handleImportWebsite} disabled={isImporting || !websiteUrl}>
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
            </div>

            <Separator orientation="vertical" />

            {/* AI Prompt Section */}
            <div className="flex-1">
              <div className="flex gap-2 h-full">
                <Input
                  placeholder={
                    selectedElements.length > 0
                      ? `Transform ${selectedElements.length} selected element${selectedElements.length > 1 ? "s" : ""}...`
                      : "Select an element first"
                  }
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={selectedElements.length === 0}
                  className="flex-1"
                />
                <Button
                  onClick={handleAITransform}
                  disabled={isGenerating || !aiPrompt || selectedElements.length === 0}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Transform with AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Properties Panel */}
      <div className="w-64 bg-sidebar border-l border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <h3 className="text-sm font-medium text-sidebar-foreground">Properties</h3>
        </div>

        <div className="flex-1 p-4">
          {selectedElements.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  SELECTION INFO {selectedElements.length > 1 && `(${selectedElements.length} elements)`}
                </h4>
                {selectedElement && (
                  <div className="space-y-1 text-sm">
                    <div>Type: {selectedElement.type}</div>
                    <div>
                      Size: {selectedElement.position.width} × {selectedElement.position.height}
                    </div>
                    <div>
                      Position: {selectedElement.position.x}, {selectedElement.position.y}
                    </div>
                    {selectedElement.selector && (
                      <div className="text-xs text-muted-foreground">Selector: {selectedElement.selector}</div>
                    )}
                    {selectedElement.text && (
                      <div className="text-xs text-muted-foreground">Text: "{selectedElement.text}"</div>
                    )}
                  </div>
                )}
                {selectedElements.length > 1 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Multiple elements selected. Showing first element details.
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">AI SUGGESTIONS</h4>
                <div className="space-y-2">
                  {["Make it modern", "Change color scheme", "Add glassmorphism", "Make it minimalist"].map(
                    (suggestion) => (
                      <Button
                        key={suggestion}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => setAiPrompt(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">ACTIONS</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    <Download className="w-4 h-4 mr-2" />
                    Download Element{selectedElements.length > 1 ? "s" : ""}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    onClick={() => setElements((prev) => prev.map((el) => ({ ...el, selected: false })))}
                  >
                    Deselect All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    onClick={() => setElements((prev) => prev.filter((el) => !el.selected))}
                  >
                    Delete Selected
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm">
              <p className="mb-4">Select an element to view properties</p>
              <div className="text-xs space-y-2 text-left">
                <div>
                  <kbd className="bg-muted px-1 rounded">Click</kbd> to select
                </div>
                <div>
                  <kbd className="bg-muted px-1 rounded">Ctrl+Click</kbd> multi-select
                </div>
                <div>
                  <kbd className="bg-muted px-1 rounded">Esc</kbd> deselect all
                </div>
                <div>
                  <kbd className="bg-muted px-1 rounded">Del</kbd> remove selected
                </div>
                <div>
                  <kbd className="bg-muted px-1 rounded">Ctrl+A</kbd> select all
                </div>
                <div>
                  <kbd className="bg-muted px-1 rounded">Ctrl+D</kbd> duplicate
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
