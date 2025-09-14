"use client"

import { Button } from "@/components/ui/button"

type Props = {
  geminiApiKey: string
  elevenlabsApiKey: string
  setTempGeminiApiKey: (v: string) => void
  setTempElevenlabsApiKey: (v: string) => void
  setShowApiKeyModal: (v: boolean) => void
  setShowModelSettingsModal: (v: boolean) => void
  copySuccess: string | null
  setCopySuccess: (v: string | null) => void
}

export default function TopBar({
  geminiApiKey,
  elevenlabsApiKey,
  setTempGeminiApiKey,
  setTempElevenlabsApiKey,
  setShowApiKeyModal,
  setShowModelSettingsModal,
  copySuccess,
  setCopySuccess,
}: Props) {
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText('https://pixiedesign.vercel.app/')
      setCopySuccess('Link copied!')
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {
      setCopySuccess('Copy failed')
      setTimeout(() => setCopySuccess(null), 2000)
    }
  }

  return (
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
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md"
          onClick={() => {
            setTempGeminiApiKey(geminiApiKey)
            setTempElevenlabsApiKey(elevenlabsApiKey)
            setShowApiKeyModal(true)
          }}
        >
          🔑 API Key
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-md"
          onClick={() => setShowModelSettingsModal(true)}
        >
          Models
        </Button>
        <div className="relative">
          {copySuccess && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-xs rounded shadow-lg z-10">
              {copySuccess}
            </div>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 bg-gray-100 hover:bg-gray-200 rounded-md"
            onClick={handleShare}
          >
            Share
          </Button>
        </div>
      </div>
    </div>
  )
}

