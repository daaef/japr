import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, basename, extname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { rename, unlink } from 'node:fs/promises'

const execAsync = promisify(exec)

/**
 * Convert DOC/DOCX to PDF using LibreOffice
 * @param inputPath - Path to input DOC/DOCX file
 * @returns Path to generated PDF file
 */
export async function convertDocToPdf(inputPath: string): Promise<string> {
  const ext = extname(inputPath).toLowerCase()

  if (!['.doc', '.docx'].includes(ext)) {
    throw new Error(`Unsupported file format for conversion: ${ext}`)
  }

  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const inputDir = dirname(inputPath)
  const inputName = basename(inputPath, ext)
  const outputPath = join(inputDir, `${inputName}.pdf`)

  try {
    // Use LibreOffice in headless mode to convert to PDF
    // Output will be in the same directory as input
    const command = `libreoffice --headless --convert-to pdf --outdir "${inputDir}" "${inputPath}"`

    const { stderr } = await execAsync(command, {
      timeout: 60000 // 60 second timeout
    })

    if (stderr && !stderr.includes('convert to')) {
      console.warn('LibreOffice conversion warning:', stderr)
    }

    // LibreOffice creates output as {inputName}.pdf in the outdir
    const libreOfficeOutput = join(inputDir, `${inputName}.pdf`)

    if (!existsSync(libreOfficeOutput)) {
      throw new Error('PDF conversion failed: output file not created')
    }

    // If the output path is different from expected, rename it
    if (libreOfficeOutput !== outputPath && existsSync(libreOfficeOutput)) {
      await rename(libreOfficeOutput, outputPath)
    }

    return outputPath
  } catch (error) {
    console.error('PDF conversion error:', error)

    // Clean up any partial output
    try {
      const tempOutput = join(inputDir, `${inputName}.pdf`)
      if (existsSync(tempOutput)) {
        await unlink(tempOutput)
      }
    } catch {
      // Ignore cleanup errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to convert document to PDF'
    })
  }
}

/**
 * Check if file needs PDF conversion
 */
export function needsPdfConversion(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return ['.doc', '.docx'].includes(ext)
}

/**
 * Get the PDF path for a given document path
 */
export function getPdfPath(filePath: string): string {
  const ext = extname(filePath)
  const base = filePath.slice(0, -ext.length)
  return `${base}.pdf`
}

/**
 * Check if PDF version exists for a document
 */
export function pdfExists(filePath: string): boolean {
  const pdfPath = getPdfPath(filePath)
  return existsSync(pdfPath)
}
