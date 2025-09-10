"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Upload } from "lucide-react"

type Props = {
  websiteUrl: string
  setWebsiteUrl: (v: string) => void
  handleImportWebsite: () => Promise<void>
  isImporting: boolean
  handleFileUpload: () => Promise<void>
  isUploading: boolean
}

export default function BottomBar({
  websiteUrl,
  setWebsiteUrl,
  handleImportWebsite,
  isImporting,
  handleFileUpload,
  isUploading,
}: Props) {
  return (
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
  )
}

