export default function AboutPage() {
  return (
    <section className="panel panel-center prose about">
      <p className="label" style={{ textAlign: 'center' }}>ABOUT</p>
      <h1>마주 앉아 나누는<br />IT 이야기</h1>
      <p className="lead">
        <strong>IT 수다 모임</strong>은 당근 IT 소모임 안에서 정기적으로 열리는 작은 토크 세션이에요.
      </p>
      <p style={{ textAlign: 'center' }}>
        자기계발과 정보 공유를 목표로, 요즘 IT 트렌드부터 업무 노하우, 써보니 좋았던 도구, 소소한 꿀팁까지
        무엇이든 편하게 이야기합니다.
      </p>

      <div className="about-pair">
        <div>
          <h2>이런 이야기를 나눠요</h2>
          <ul>
            <li>IT 트렌드 — AI, 개발, 서비스, 업계 소식</li>
            <li>노하우 — 업무 방식, 공부법, 커리어 팁</li>
            <li>정보 공유 — 유용한 툴, 아티클, 강의, 이벤트</li>
          </ul>
        </div>
        <div>
          <h2>왜 기록하나요?</h2>
          <p style={{ margin: 0 }}>
            모임에서 나온 좋은 이야기들이 그날로 흩어지지 않도록, 매 회차의 내용을 정리해 남겨요.
            오지 못한 분들도, 다시 찾아보고 싶은 분들도 언제든 둘러보세요.
          </p>
        </div>
      </div>
      <p className="about-foot">◐◑ IT 수다 모임 · 당근 소모임에서 마주 앉아 나눈 이야기들</p>
    </section>
  )
}
