export default function SceneFallback() {
  return (
    <div className="scene-loading" role="status">
      <span className="spinner" aria-hidden="true" />
      우주를 불러오는 중…
    </div>
  )
}
