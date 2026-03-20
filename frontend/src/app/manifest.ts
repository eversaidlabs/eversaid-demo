import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EverSaid',
    short_name: 'EverSaid',
    description: 'Transcribe audio or upload existing transcripts. Choose Clean or Edited cleanup and verify every change side-by-side against the original audio.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1D3557',
    theme_color: '#1D3557',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
