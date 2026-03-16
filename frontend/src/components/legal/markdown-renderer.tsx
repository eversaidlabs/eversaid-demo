import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface MarkdownRendererProps {
  content: string
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-[#0F172A] mb-6 mt-8 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-semibold text-[#0F172A] mb-4 mt-8">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-[#0F172A] mb-3 mt-6">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[#334155] leading-relaxed mb-4">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside text-[#334155] mb-4 space-y-2 ml-4">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside text-[#334155] mb-4 space-y-2 ml-4">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[#334155] leading-relaxed">
      {children}
    </li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-6 -mx-4 px-4 md:mx-0 md:px-0">
      <table className="min-w-full border-collapse border border-[#E2E8F0] text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#F8FAFC]">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody>
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-[#E2E8F0]">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left font-semibold text-[#0F172A] border border-[#E2E8F0]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-[#334155] border border-[#E2E8F0]">
      {children}
    </td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-[#3B82F6] hover:text-[#2563EB] underline transition-colors"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  hr: () => (
    <hr className="border-t border-[#E2E8F0] my-8" />
  ),
  code: ({ children }) => (
    <code className="bg-[#F1F5F9] text-[#0F172A] px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#0F172A]">
      {children}
    </strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#3B82F6] pl-4 my-4 text-[#64748B] italic">
      {children}
    </blockquote>
  ),
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
