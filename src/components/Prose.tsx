import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from 'remark-cjk-friendly'
import { Link } from 'react-router-dom'

// remark-cjk-friendly: "**카파시(Karpathy)**가"처럼 굵은 글씨 바로 뒤에 한국어 조사가 붙어도 굵게 보이도록
// (CommonMark 규칙만으로는 닫는 ** 가 인식되지 않아 별표가 그대로 보인다)
export default function Prose({ children }: { children: string }) {
  return (
    <div className="prose">
      <Markdown
        remarkPlugins={[remarkGfm, remarkCjkFriendly]}
        components={{
          // 사이트 안의 다른 행성으로 가는 링크는 새 탭 대신 그 자리에서 날아간다
          a: ({ node: _node, href, ...props }) =>
            href?.startsWith('/') ? <Link to={href} {...props} /> : <a href={href} {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}
