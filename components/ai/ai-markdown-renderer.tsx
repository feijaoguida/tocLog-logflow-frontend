'use client'

import React, { useMemo } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AiMarkdownRendererProps {
  content: string
  className?: string
}

export function AiMarkdownRenderer({ content, className = '' }: AiMarkdownRendererProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content])

  return (
    <div className={`space-y-3 text-sm leading-relaxed text-foreground select-text ${className}`}>
      {blocks.map((block, idx) => (
        <React.Fragment key={idx}>{renderBlock(block, idx)}</React.Fragment>
      ))}
    </div>
  )
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'paragraph'; text: string }

function parseMarkdownBlocks(markdown: string): Block[] {
  if (!markdown) return []
  const lines = markdown.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block ```
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // consume closing ```
      blocks.push({ type: 'code', language, code: codeLines.join('\n') })
      continue
    }

    // Headings #, ##, ###
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      })
      i++
      continue
    }

    // Table detection: line contains | and next line has |---
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      lines[i + 1].includes('|') &&
      /^[|\s-:]+$/.test(lines[i + 1])
    ) {
      const headers = line
        .split('|')
        .map((c) => c.trim())
        .filter((c, idx, arr) => (idx === 0 && c === '' ? false : idx === arr.length - 1 && c === '' ? false : true))
      i += 2 // skip header and separator
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|')) {
        const rowCells = lines[i]
          .split('|')
          .map((c) => c.trim())
          .filter((c, idx, arr) => (idx === 0 && c === '' ? false : idx === arr.length - 1 && c === '' ? false : true))
        if (rowCells.length > 0) rows.push(rowCells)
        i++
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') })
      continue
    }

    // Unordered List
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, '').trim())
        i++
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    // Ordered List
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim())
        i++
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    // Empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph
    const paragraphLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('>') &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].includes('|')
    ) {
      paragraphLines.push(lines[i].trim())
      i++
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
  }

  return blocks
}

function renderBlock(block: Block, index: number) {
  switch (block.type) {
    case 'heading': {
      if (block.level === 1) {
        return <h2 className="text-base font-bold text-foreground mt-2 mb-1">{formatInline(block.text)}</h2>
      }
      if (block.level === 2) {
        return <h3 className="text-sm font-semibold text-foreground mt-2 mb-1">{formatInline(block.text)}</h3>
      }
      return <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mt-1">{formatInline(block.text)}</h4>
    }
    case 'code':
      return <CodeBlock key={index} language={block.language} code={block.code} />
    case 'table':
      return (
        <div key={index} className="overflow-x-auto rounded-md border border-border my-2 max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 border-b border-border text-foreground font-semibold">
              <tr>
                {block.headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-3 py-2 border-r border-border last:border-r-0">
                    {formatInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 border-r border-border last:border-r-0 text-muted-foreground">
                      {formatInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'list': {
      if (block.ordered) {
        return (
          <ol key={index} className="list-decimal pl-5 space-y-1 text-sm text-foreground my-1">
            {block.items.map((item, iIdx) => (
              <li key={iIdx}>{formatInline(item)}</li>
            ))}
          </ol>
        )
      }
      return (
        <ul key={index} className="list-disc pl-5 space-y-1 text-sm text-foreground my-1">
          {block.items.map((item, iIdx) => (
            <li key={iIdx}>{formatInline(item)}</li>
          ))}
        </ul>
      )
    }
    case 'quote':
      return (
        <blockquote
          key={index}
          className="border-l-2 border-primary/50 pl-3 py-1 italic text-muted-foreground bg-muted/20 rounded-r text-sm my-1"
        >
          {formatInline(block.text)}
        </blockquote>
      )
    case 'paragraph':
    default:
      return (
        <p key={index} className="text-sm leading-relaxed text-foreground">
          {formatInline(block.text)}
        </p>
      )
  }
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-md border border-border bg-surface-subtle overflow-hidden my-2 text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/40 text-muted-foreground font-mono">
        <span>{language || 'texto'}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </Button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-foreground leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/**
 * Sanitiza e formata inline Markdown (negrito, itálico, código inline, links seguros).
 */
function formatInline(text: string): React.ReactNode[] {
  if (!text) return []

  // Quebra por tokens: code `...`, bold **...**, link [...](...)
  const parts: React.ReactNode[] = []
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    const token = match[0]
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-muted/60 text-primary font-mono text-[12px]">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-foreground">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        const label = linkMatch[1]
        const url = linkMatch[2].trim()
        // Prevenção de XSS: URLs javascript: são estritamente rejeitadas
        const isSafeUrl = !url.toLowerCase().startsWith('javascript:') && !url.toLowerCase().startsWith('data:')
        if (isSafeUrl) {
          parts.push(
            <a
              key={match.index}
              href={url}
              target={url.startsWith('/') ? undefined : '_blank'}
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
            >
              {label}
            </a>
          )
        } else {
          parts.push(label)
        }
      } else {
        parts.push(token)
      }
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}
