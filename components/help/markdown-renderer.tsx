import Link from 'next/link'

import { cn } from '@/lib/utils'

type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; label: string; href: string }

type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'callout'; tone: 'note' | 'tip' | 'important' | 'warning'; title?: string; lines: string[] }
  | { type: 'image'; alt: string; src: string }
  | { type: 'divider' }

function parseInline(text: string): InlineNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(pattern).filter(Boolean)

  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return { type: 'strong', value: part.slice(2, -2) }
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return { type: 'code', value: part.slice(1, -1) }
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return { type: 'link', label: linkMatch[1], href: linkMatch[2] }
    }

    return { type: 'text', value: part }
  })
}

function renderInline(text: string, keyPrefix: string) {
  return parseInline(text).map((node, index) => {
    const key = `${keyPrefix}-${index}`

    if (node.type === 'strong') {
      return (
        <strong key={key} className="font-semibold text-foreground">
          {node.value}
        </strong>
      )
    }

    if (node.type === 'code') {
      return (
        <code
          key={key}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
        >
          {node.value}
        </code>
      )
    }

    if (node.type === 'link') {
      const isExternal = node.href.startsWith('http')
      return (
        <Link
          key={key}
          href={node.href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
          className="font-medium text-primary underline underline-offset-4"
        >
          {node.label}
        </Link>
      )
    }

    return <span key={key}>{node.value}</span>
  })
}

function parseTableLine(line: string) {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed === '---') {
      blocks.push({ type: 'divider' })
      index += 1
      continue
    }

    const imageMatch = trimmed.match(/^!\[(.*)\]\((.*)\)$/)
    if (imageMatch) {
      blocks.push({ type: 'image', alt: imageMatch[1], src: imageMatch[2] })
      index += 1
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      })
      index += 1
      continue
    }

    if (trimmed.startsWith('>')) {
      const calloutLines: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        calloutLines.push(lines[index].trim().replace(/^>\s?/, ''))
        index += 1
      }

      const [first, ...rest] = calloutLines
      const match = first.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING)\]\s*(.*)$/i)
      blocks.push({
        type: 'callout',
        tone: (match?.[1]?.toLowerCase() as 'note' | 'tip' | 'important' | 'warning') || 'note',
        title: match?.[2] || undefined,
        lines: rest.length > 0 ? rest : match ? [] : calloutLines,
      })
      continue
    }

    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index].trim())
        index += 1
      }

      const headers = parseTableLine(tableLines[0] || '')
      const rows = tableLines
        .slice(1)
        .filter((tableLine) => !/^(\|\s*:?-+:?\s*)+\|$/.test(tableLine))
        .map(parseTableLine)

      blocks.push({ type: 'table', headers, rows })
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'unordered-list', items })
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'ordered-list', items })
      continue
    }

    const paragraphLines = [trimmed]
    index += 1
    while (index < lines.length) {
      const next = lines[index].trim()
      if (
        !next ||
        next === '---' ||
        next.startsWith('>') ||
        next.startsWith('|') ||
        /^!\[.*\]\(.*\)$/.test(next) ||
        /^(#{1,3})\s+/.test(next) ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break
      }
      paragraphLines.push(next)
      index += 1
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
  }

  return blocks
}

const calloutToneClasses = {
  note: 'border-info/30 bg-info/10 text-foreground',
  tip: 'border-success/30 bg-success/10 text-foreground',
  important: 'border-warning/30 bg-warning/10 text-foreground',
  warning: 'border-destructive/30 bg-destructive/10 text-foreground',
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdown(content)

  return (
    <div className="space-y-6 text-[15px] leading-7 text-muted-foreground">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h1 key={index} className="text-3xl font-semibold tracking-tight text-foreground">
                {block.text}
              </h1>
            )
          }

          if (block.level === 2) {
            return (
              <h2
                key={index}
                className="pt-2 text-xl font-semibold tracking-tight text-foreground"
              >
                {block.text}
              </h2>
            )
          }

          return (
            <h3 key={index} className="text-base font-semibold tracking-tight text-foreground">
              {block.text}
            </h3>
          )
        }

        if (block.type === 'paragraph') {
          return (
            <p key={index} className="text-sm leading-7 text-muted-foreground">
              {renderInline(block.text, `paragraph-${index}`)}
            </p>
          )
        }

        if (block.type === 'unordered-list') {
          return (
            <ul key={index} className="space-y-2 pl-5 text-sm text-muted-foreground">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="list-disc">
                  {renderInline(item, `ul-${index}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'ordered-list') {
          return (
            <ol key={index} className="space-y-2 pl-5 text-sm text-muted-foreground">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="list-decimal">
                  {renderInline(item, `ol-${index}-${itemIndex}`)}
                </li>
              ))}
            </ol>
          )
        }

        if (block.type === 'table') {
          return (
            <div key={index} className="overflow-x-auto rounded-2xl border border-border/70">
              <table className="min-w-full divide-y divide-border/70 text-sm">
                <thead className="bg-muted/40 text-left text-foreground">
                  <tr>
                    {block.headers.map((header) => (
                      <th key={header} className="px-4 py-3 font-semibold">
                        {renderInline(header, `th-${index}-${header}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-background">
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3 align-top text-muted-foreground">
                          {renderInline(cell, `td-${index}-${rowIndex}-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (block.type === 'callout') {
          return (
            <div
              key={index}
              className={cn(
                'rounded-3xl border px-4 py-4 text-sm',
                calloutToneClasses[block.tone],
              )}
            >
              {block.title ? (
                <p className="mb-2 font-semibold text-foreground">
                  {renderInline(block.title, `callout-title-${index}`)}
                </p>
              ) : null}
              <div className="space-y-2">
                {block.lines.map((line, lineIndex) => (
                  <p key={lineIndex}>{renderInline(line, `callout-${index}-${lineIndex}`)}</p>
                ))}
              </div>
            </div>
          )
        }

        if (block.type === 'image') {
          return (
            <figure
              key={index}
              className="overflow-hidden rounded-3xl border border-border/70 bg-muted/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.src} alt={block.alt} className="w-full object-cover" />
              <figcaption className="px-4 py-3 text-sm text-muted-foreground">
                {block.alt}
              </figcaption>
            </figure>
          )
        }

        return <hr key={index} className="border-border/70" />
      })}
    </div>
  )
}
