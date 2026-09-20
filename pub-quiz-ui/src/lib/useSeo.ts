import { useEffect } from 'react'

const SITE_NAME = 'Ko Zna Zna'
const BASE_URL = 'https://koznazna.me'

interface SeoOptions {
  /** Page title. The site name is appended automatically. */
  title: string
  description: string
  /** Path without the domain, e.g. "/mapa". Defaults to the current path. */
  path?: string
  image?: string
  /** JSON-LD object. Replaced on every route change, never accumulated. */
  jsonLd?: Record<string, unknown>
  /**
   * False while the page's data is still loading. The server already wrote the
   * real title and description into the document; overwriting them with the
   * placeholders this hook would otherwise receive - "Kviz", "Detalji pab
   * kviza." - would undo that for as long as the request takes, and that is
   * exactly the window a crawler's renderer may sample.
   */
  enabled?: boolean
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    const [key, val] = selector.replace(/^meta\[|\]$/g, '').split('=')
    el.setAttribute(key, val.replace(/"/g, ''))
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

/**
 * Gives each route its own title, description, canonical URL and structured
 * data. A single-page app keeps whatever the initial HTML declared, so without
 * this every page looks identical to a crawler and they compete with each other
 * instead of ranking for their own terms.
 */
export function useSeo({ title, description, path, image, jsonLd, enabled = true }: SeoOptions) {
  useEffect(() => {
    if (!enabled) return

    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`
    const url = BASE_URL + (path ?? window.location.pathname)
    const img = image ?? `${BASE_URL}/images/logo1.png`

    document.title = fullTitle

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', fullTitle)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[property="og:url"]', 'content', url)
    setMeta('meta[property="og:image"]', 'content', img)
    setMeta('meta[property="og:type"]', 'content', 'website')
    setMeta('meta[property="og:site_name"]', 'content', SITE_NAME)
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image')
    setMeta('meta[name="twitter:title"]', 'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', description)
    setMeta('meta[name="twitter:image"]', 'content', img)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url

    // Tagged so it can be removed on the way out. Leaving stale structured data
    // behind would describe the previous page on this one.
    const SCRIPT_ID = 'route-json-ld'
    document.getElementById(SCRIPT_ID)?.remove()

    if (jsonLd) {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }

    return () => {
      document.getElementById(SCRIPT_ID)?.remove()
    }
  }, [title, description, path, image, jsonLd, enabled])
}

export { SITE_NAME, BASE_URL }
