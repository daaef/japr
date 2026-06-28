import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { extname } from 'node:path'

const execAsync = promisify(exec)

/**
 * Convert DOC/DOCX to HTML using Pandoc
 */
export async function convertDocToHtml(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase()

  if (ext === '.pdf') {
    throw new Error('Use direct PDF embed for PDF files')
  }

  if (!['.doc', '.docx'].includes(ext)) {
    throw new Error(`Unsupported file format: ${ext}`)
  }

  try {
    const { stdout } = await execAsync(`pandoc "${filePath}" -t html --extract-media=/tmp/pandoc-media`)
    return stdout
  } catch (error) {
    console.error('Pandoc conversion failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to convert document'
    })
  }
}

/**
 * Inject watermark into HTML content
 */
export function injectWatermark(html: string, userEmail: string): string {
  const watermarkHtml = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 48px;
      color: rgba(200, 200, 200, 0.3);
      pointer-events: none;
      z-index: 1000;
      white-space: nowrap;
      font-family: Arial, sans-serif;
    ">
      ${userEmail} - ${new Date().toISOString().split('T')[0]}
    </div>
  `

  // Insert watermark before closing body tag or at end
  if (html.includes('</body>')) {
    return html.replace('</body>', `${watermarkHtml}</body>`)
  }

  return html + watermarkHtml
}

/**
 * Inject copy/print protection into HTML
 */
export function injectProtection(html: string): string {
  const protectionStyles = `
    <style>
      /* Prevent text selection */
      body {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      /* Prevent print */
      @media print {
        body { display: none !important; }
      }
    </style>
  `

  if (html.includes('</head>')) {
    return html.replace('</head>', `${protectionStyles}</head>`)
  }

  if (html.includes('<body')) {
    return html.replace('<body', `${protectionStyles}<body`)
  }

  return protectionStyles + html
}

/**
 * Wrap HTML in a proper document structure
 */
export function wrapHtmlDocument(html: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
      background: #fff;
    }
    h1, h2, h3 { color: #c74e07; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 8px; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`
}

export function sanitizePreviewHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<(iframe|object|embed|link|meta|base)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(iframe|object|embed|link|meta|base)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '')
}

/**
 * Check if file type is supported for preview
 */
export function isPreviewSupported(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return ['.doc', '.docx', '.pdf'].includes(ext)
}

/**
 * Get file type for preview handling
 */
export function getPreviewType(filePath: string): 'doc' | 'pdf' | 'unsupported' {
  const ext = extname(filePath).toLowerCase()
  if (['.doc', '.docx'].includes(ext)) return 'doc'
  if (ext === '.pdf') return 'pdf'
  return 'unsupported'
}
