"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ZoomOut, ZoomIn, Sparkles, Code, Download } from "lucide-react"

type Props = {
  zoom: number
  setZoom: (v: number | ((prev: number) => number)) => void
  currentHistoryIndex: number
  imageHistory: string[]
  setCurrentHistoryIndex: (v: number | ((prev: number) => number)) => void
  setImportedImage: (v: string) => void
  isGeneratingCode: boolean
  importedImage: string | null
  handleGenerateCode: () => Promise<void>
  isLoadingPrompt: boolean
  handleViewPrompt: () => Promise<void>
  hasPrompt: boolean
  handleExportImage: () => void
}

export default function CanvasHeader({
  zoom,
  setZoom,
  currentHistoryIndex,
  imageHistory,
  setCurrentHistoryIndex,
  setImportedImage,
  isGeneratingCode,
  importedImage,
  handleGenerateCode,
  isLoadingPrompt,
  handleViewPrompt,
  hasPrompt,
  handleExportImage,
}: Props) {
  return (
    <div className="h-12 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setZoom((prev) => Math.max(25, (typeof prev === 'number' ? prev : 100) - 25))}
            disabled={zoom <= 25}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <div className="text-sm text-gray-500 min-w-[60px] text-center">{zoom}%</div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setZoom((prev) => Math.min(200, (typeof prev === 'number' ? prev : 100) + 25))}
            disabled={zoom >= 200}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              if (currentHistoryIndex > 0) {
                setCurrentHistoryIndex((prev) => (typeof prev === 'number' ? prev - 1 : currentHistoryIndex - 1))
                const nextIndex = currentHistoryIndex - 1
                if (imageHistory[nextIndex]) setImportedImage(imageHistory[nextIndex])
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
                setCurrentHistoryIndex((prev) => (typeof prev === 'number' ? prev + 1 : currentHistoryIndex + 1))
                const nextIndex = currentHistoryIndex + 1
                if (imageHistory[nextIndex]) setImportedImage(imageHistory[nextIndex])
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

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 bg-green-50 text-green-600 hover:bg-green-100 border-b-2 border-green-500"
          >
            Design
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-green-50 hover:border-green-300 hover:text-green-600"
          onClick={handleGenerateCode}
          disabled={isGeneratingCode || !importedImage || currentHistoryIndex <= 0}
        >
          {isGeneratingCode ? (
            <>
              <Code className="w-4 h-4 mr-2 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <Code className="w-4 h-4 mr-2" />
              Generate Code
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="hover:bg-green-50 hover:border-green-300 hover:text-green-600"
          onClick={handleExportImage}
          disabled={!importedImage}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="hover:bg-green-50 hover:border-green-300 hover:text-green-600"
          onClick={handleViewPrompt}
          disabled={isLoadingPrompt || !importedImage || currentHistoryIndex <= 0}
        >
          {isLoadingPrompt ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              Loading...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {hasPrompt ? 'View Prompt' : 'Generate Prompt'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
