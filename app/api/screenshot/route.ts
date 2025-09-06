import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

const MAX_TIMEOUT = 30000; // 30 seconds
const MAX_PAGE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  let browser;
  
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Launch browser with serverless configuration
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';
    
    let executablePath;
    if (isProduction && isVercel) {
      try {
        executablePath = await chromium.executablePath({
          fontConfigPath: '/var/task/node_modules/@sparticuz/chromium/bin/etc/fonts',
        });
      } catch (error) {
        console.log('Failed to get chromium executable path:', error);
        // Fallback to letting puppeteer find chromium
        executablePath = await chromium.executablePath();
      }
    }
    
    browser = await puppeteer.launch({
      args: isProduction 
        ? [
            ...chromium.args,
            '--hide-scrollbars',
            '--disable-web-security',
            '--window-size=1280,800',
            '--single-process',
            '--no-zygote',
          ]
        : [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1280,800'
          ],
      defaultViewport: isProduction ? chromium.defaultViewport : { width: 1280, height: 800 },
      executablePath: executablePath,
      headless: isProduction ? chromium.headless : 'new',
      ignoreDefaultArgs: isProduction ? ['--disable-extensions'] : false,
    });

    const page = await browser.newPage();
    
    // Set viewport size (only needed for local development)
    if (!isProduction) {
      await page.setViewport({
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
      });
    }

    // Set request timeout
    page.setDefaultTimeout(MAX_TIMEOUT);
    page.setDefaultNavigationTimeout(MAX_TIMEOUT);

    // Block unnecessary resources to improve performance
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'media' || resourceType === 'font' || resourceType === 'other') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate to URL
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: MAX_TIMEOUT,
    });

    // Check response status
    if (!response) {
      throw new Error('Failed to load the page');
    }

    const status = response.status();
    if (status >= 400) {
      throw new Error(`Page returned status code ${status}`);
    }

    // Check page size
    const pageContent = await page.content();
    if (pageContent.length > MAX_PAGE_SIZE) {
      throw new Error('Page content is too large to process');
    }

    // Take screenshot
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true,
      type: 'jpeg',
      quality: 80,
    });


    // Get page dimensions
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));

    return NextResponse.json({
      success: true,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      metadata: {
        url,
        timestamp: new Date().toISOString(),
        dimensions,
      },
    });
  } catch (error) {
    console.error('Screenshot error:', error);
    
    // Determine appropriate error message and status code
    let message = 'Failed to capture screenshot';
    let status = 500;

    if (error instanceof Error) {
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        message = 'Could not resolve the website URL';
        status = 400;
      } else if (error.message.includes('net::ERR_CONNECTION_TIMED_OUT')) {
        message = 'Connection to website timed out';
        status = 504;
      } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        message = 'Connection to website was refused';
        status = 503;
      } else {
        message = error.message;
      }
    }

    return NextResponse.json(
      { error: message },
      { status }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}