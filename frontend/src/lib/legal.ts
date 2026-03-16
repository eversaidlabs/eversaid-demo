import fs from 'fs/promises'
import path from 'path'

export type LegalPageType = 'privacy-policy' | 'terms-of-service' | 'cookie-policy' | 'sub-processors'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'legal')

/**
 * Load legal page markdown content by type and locale.
 * Falls back to English if the requested locale file doesn't exist.
 */
export async function getLegalContent(
  pageType: LegalPageType,
  locale: string
): Promise<string> {
  const localePath = path.join(CONTENT_DIR, locale, `${pageType}.md`)
  const fallbackPath = path.join(CONTENT_DIR, 'en', `${pageType}.md`)

  try {
    // Try locale-specific file first
    return await fs.readFile(localePath, 'utf-8')
  } catch {
    // Fall back to English
    return await fs.readFile(fallbackPath, 'utf-8')
  }
}
