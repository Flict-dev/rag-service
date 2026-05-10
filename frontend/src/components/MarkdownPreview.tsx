import type { ReactNode } from 'react'

type MarkdownPreviewProps = {
  markdown: string
}

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim()

  if (
    trimmedUrl.startsWith('#') ||
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('mailto:')
  ) {
    return trimmedUrl
  }

  return ''
}

function renderInline(text: string) {
  const nodes: ReactNode[] = []
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null = linkPattern.exec(text)

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const [, label, rawUrl] = match
    const href = normalizeUrl(rawUrl)

    if (href) {
      nodes.push(
        <a href={href} key={`${href}-${match.index}`} rel="noreferrer" target={href.startsWith('http') ? '_blank' : undefined}>
          {label}
        </a>,
      )
    } else {
      nodes.push(label)
    }

    lastIndex = match.index + match[0].length
    match = linkPattern.exec(text)
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : text
}

function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const nodes: ReactNode[] = []
  const paragraphLines: string[] = []
  let listItems: string[] = []
  let codeLines: string[] = []
  let insideCodeBlock = false
  let blockIndex = 0

  const pushParagraph = () => {
    if (paragraphLines.length === 0) {
      return
    }

    nodes.push(<p key={`p-${blockIndex}`}>{renderInline(paragraphLines.join(' '))}</p>)
    paragraphLines.length = 0
    blockIndex += 1
  }

  const pushList = () => {
    if (listItems.length === 0) {
      return
    }

    nodes.push(
      <ul key={`ul-${blockIndex}`}>
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInline(item)}</li>
        ))}
      </ul>,
    )
    listItems = []
    blockIndex += 1
  }

  const pushCode = () => {
    nodes.push(
      <pre key={`code-${blockIndex}`}>
        <code>{codeLines.join('\n')}</code>
      </pre>,
    )
    codeLines = []
    blockIndex += 1
  }

  markdown.split('\n').forEach((line) => {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('```')) {
      pushParagraph()
      pushList()

      if (insideCodeBlock) {
        pushCode()
        insideCodeBlock = false
        return
      }

      insideCodeBlock = true
      return
    }

    if (insideCodeBlock) {
      codeLines.push(line)
      return
    }

    if (!trimmedLine) {
      pushParagraph()
      pushList()
      return
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmedLine)
    if (headingMatch) {
      pushParagraph()
      pushList()

      const [, marks, heading] = headingMatch
      const HeadingTag = `h${Math.min(marks.length, 4)}` as 'h1' | 'h2' | 'h3' | 'h4'
      nodes.push(<HeadingTag key={`h-${blockIndex}`}>{renderInline(heading)}</HeadingTag>)
      blockIndex += 1
      return
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(trimmedLine)
    if (listMatch) {
      pushParagraph()
      listItems.push(listMatch[1])
      return
    }

    const quoteMatch = /^>\s?(.+)$/.exec(trimmedLine)
    if (quoteMatch) {
      pushParagraph()
      pushList()
      nodes.push(<blockquote key={`quote-${blockIndex}`}>{renderInline(quoteMatch[1])}</blockquote>)
      blockIndex += 1
      return
    }

    pushList()
    paragraphLines.push(trimmedLine)
  })

  pushParagraph()
  pushList()

  if (insideCodeBlock || codeLines.length > 0) {
    pushCode()
  }

  return <div className="markdown-preview">{nodes.length > 0 ? nodes : <p>Пустой markdown-файл.</p>}</div>
}

export default MarkdownPreview
