import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="empty">
      <h1>페이지를 찾을 수 없어요</h1>
      <p><Link to="/">아카이브로 돌아가기</Link></p>
    </div>
  )
}
