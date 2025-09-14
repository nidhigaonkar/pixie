"use client"

import { Button } from "@/components/ui/button"

type Props = {
  geminiApiKey: string
  elevenlabsApiKey: string
  setTempGeminiApiKey: (v: string) => void
  setTempElevenlabsApiKey: (v: string) => void
  setShowApiKeyModal: (v: boolean) => void
  setShowModelSettingsModal: (v: boolean) => void
  showUsageGuideModal: boolean
  setShowUsageGuideModal: (v: boolean) => void
}

export default function TopBar({
  geminiApiKey,
  elevenlabsApiKey,
  setTempGeminiApiKey,
  setTempElevenlabsApiKey,
  setShowApiKeyModal,
  setShowModelSettingsModal,
  showUsageGuideModal,
  setShowUsageGuideModal,
}: Props) {

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
          className="h-8 w-8 p-0 bg-red-50 hover:bg-red-100 text-red-600 rounded-md"
          onClick={() => window.open('mailto:pixie@workmail.com?subject=Pixie%20Feedback', '_blank')}
          title="Contact us"
        >
          💌
        </Button>
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
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-md"
          onClick={() => setShowUsageGuideModal(true)}
        >
          📹 Usage Guide
        </Button>
      </div>
    </div>
  )
}

