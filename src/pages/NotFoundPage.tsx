import { Link } from 'react-router-dom'
import { useTitle } from '../lib/useTitle'

export default function NotFoundPage() {
  useTitle('궤도를 벗어났어요')
  return (
    <div className="panel panel-center empty">
      <h1>궤도를 벗어났어요</h1>
      <p>찾는 페이지가 이 은하에 없어요. <Link to="/">은하로 돌아가기</Link></p>
    </div>
  )
}
