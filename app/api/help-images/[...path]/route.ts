import { NextResponse } from 'next/server'

import { getHelpImageContentType, readHelpImage } from '@/lib/help'

type HelpImageRouteProps = {
  params: Promise<{ path: string[] }>
}

export async function GET(_request: Request, { params }: HelpImageRouteProps) {
  const resolvedParams = await params
  const relativePath = resolvedParams.path.join('/')

  if (relativePath.includes('..')) {
    return new NextResponse('Invalid path', { status: 400 })
  }

  try {
    const buffer = readHelpImage(relativePath)
    const contentType = getHelpImageContentType(relativePath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
