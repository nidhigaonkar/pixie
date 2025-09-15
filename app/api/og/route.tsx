import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Read the og.png file from the root directory
    const imagePath = join(process.cwd(), 'og.png')
    const imageBuffer = readFileSync(imagePath)
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
          }}
        >
          <img
            src={base64Image}
            alt="Pixie"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 32,
                color: 'white',
                fontWeight: 400,
                textAlign: 'center',
              }}
            >
              your design partner
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 60,
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <div>🎨 Pixie</div>
          <div style={{ fontSize: 30, marginTop: 20, fontWeight: 'normal' }}>
            your design partner
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  }
}
