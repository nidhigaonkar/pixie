interface ScreenshotElement {
  id: string
  position: { x: number; y: number; width: number; height: number }
  type: "button" | "text" | "image" | "container" | "form"
  selector: string
  text: string
}

interface ScreenshotResult {
  success: boolean
  screenshot: string
  elements: ScreenshotElement[]
  metadata: {
    url: string
    timestamp: string
    dimensions: { width: number; height: number }
  }
}

export async function captureWebsiteScreenshot(url: string): Promise<ScreenshotResult> {
  const response = await fetch("/api/screenshot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to capture screenshot")
  }

  return response.json()
}

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === "http:" || urlObj.protocol === "https:"
  } catch {
    return false
  }
}

export function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`
  }
  return url
}
