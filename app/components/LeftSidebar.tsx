"use client"

import { Button } from "@/components/ui/button"
import { History, ChevronDown } from "lucide-react"

type PromptHistoryItem = { timestamp: number; prompt: string; requestId: string }

type Props = {
  leftSidebarOpen: boolean
  setLeftSidebarOpen: (v: (prev: boolean) => boolean) => void
  imageHistory: {image: string; description: string; prompt?: string; reference?: string; timestamp: number; generatedCodeUrl?: string}[]
  currentHistoryIndex: number
  setCurrentHistoryIndex: (v: number | ((prev: number) => number)) => void
  setImportedImage: (v: string) => void
  setGeneratedCodeUrl: (v: string | null) => void
  promptHistory: PromptHistoryItem[]
}

export default function LeftSidebar({
  leftSidebarOpen,
  setLeftSidebarOpen,
  imageHistory,
  currentHistoryIndex,
  setCurrentHistoryIndex,
  setImportedImage,
  setGeneratedCodeUrl,
  promptHistory,
}: Props) {
  return (
    <div className={`${leftSidebarOpen ? 'w-64' : 'w-8'} shrink-0 bg-white border-r border-[#e2e8f0] flex flex-col relative transition-all duration-300`}>
      <div className={`p-4 min-w-[256px] ${leftSidebarOpen ? '' : 'invisible'}`}>
        <div className="flex items-center gap-2 mb-3 text-sm font-medium">
          <History className="w-4 h-4 text-gray-600" />
          <span>History</span>
        </div>
        <div className="space-y-2">
          {imageHistory.length === 0 ? (
            <div className="text-sm text-gray-500">No transformations yet</div>
          ) : (
            imageHistory
              .map((_, index) => {
                const historyIndex = index
                const isOriginal = historyIndex === 0
                const isCurrent = historyIndex === currentHistoryIndex
                const prompt = index > 0 ? promptHistory[promptHistory.length - index] : null
                return (
                  <div
                    key={index}
                    className={`text-sm p-2 rounded transition-colors cursor-pointer hover:bg-gray-100 ${
                      isCurrent ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100' : 'bg-gray-50'
                    }`}
                    onClick={() => {
                      setCurrentHistoryIndex(historyIndex)
                      setImportedImage(imageHistory[historyIndex].image)
                      setGeneratedCodeUrl(imageHistory[historyIndex].generatedCodeUrl || null)
                    }}
                  >
                    <div className="text-gray-900">
                      {isOriginal ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{imageHistory[historyIndex].description}</span>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{imageHistory[historyIndex].description}</div>
                          {imageHistory[historyIndex].prompt && imageHistory[historyIndex].prompt !== imageHistory[historyIndex].description && (
                            <div className="text-xs text-gray-600 mt-1">{imageHistory[historyIndex].prompt}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(imageHistory[historyIndex].timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )
              })
              .reverse()
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="absolute right-0 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 hover:bg-gray-100 rounded-full z-10 flex items-center justify-center"
        onClick={() => setLeftSidebarOpen((prev) => !prev)}
      >
        <ChevronDown className={`w-4 h-4 transform transition-transform ${leftSidebarOpen ? 'rotate-90' : '-rotate-90'} text-gray-600`} />
      </Button>
    </div>
  )
}
