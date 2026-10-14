import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Prose({ children }: { children: string }) {
  return (
    <div className="prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}
