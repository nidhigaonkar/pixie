
interface ScreenshotResult {
  success: boolean
  screenshot: string
  metadata: {
    url: string
    timestamp: string
    dimensions: { width: number; height: number }
  }
}

export async function captureWebsiteScreenshot(url: string): Promise<ScreenshotResult> {
  if (!url) {
    throw new Error("URL is required")
  }

  const normalizedUrl = normalizeUrl(url)
  if (!validateUrl(normalizedUrl)) {
    throw new Error("Please enter a valid URL (e.g., https://example.com)")
  }

  try {
    const response = await fetch("/api/screenshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: normalizedUrl }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to capture screenshot: ${response.statusText}`)
    }

    const data = await response.json()

    // Validate response data
    if (!data.screenshot || !data.metadata) {
      throw new Error("Invalid response format from screenshot service")
    }

    return data
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("An unexpected error occurred while capturing the screenshot")
  }
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
  let normalizedUrl = url.trim()
  
  // Remove any whitespace
  normalizedUrl = normalizedUrl.replace(/\s+/g, '')
  
  // Add https:// if no protocol is specified
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl}`
  }
  
  // Remove trailing slashes
  normalizedUrl = normalizedUrl.replace(/\/+$/, '')
  
  return normalizedUrl
}