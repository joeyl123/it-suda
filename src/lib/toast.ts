// 3D 이스터에그가 화면 아래에 짧은 메시지를 띄울 때 쓴다. (components/CosmicToast)
export function cosmicToast(text: string) {
  window.dispatchEvent(new CustomEvent<string>('cosmic-toast', { detail: text }))
}

export function pickLine(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)]
}

export const UFO_LINES = [
  '👽 지구인의 수다 신호를 수신했다. 다음 모임에도 몰래 참석하겠다.',
  "👽 우리 행성에서도 '제 컴퓨터에선 되는데요'가 유행이다.",
  '👽 탭 vs 스페이스 논쟁은 우리 은하에서도 아직 안 끝났다.',
  '👽 git push --force 는 우주 협약으로 금지되어 있다.',
  '👽 우리는 다크 모드만 쓴다. 우주는 원래 어두우니까.',
  '👽 너희 은하의 와이파이 비밀번호를 알려 달라.',
  '👽 소 대신 키보드를 납치하러 왔다. 기계식으로.',
]

export const ASTRONAUT_LINES = [
  '🧑‍🚀 여기서도 와이파이 잘 터지네요!',
  '🧑‍🚀 우주 유영 중… 슬랙 알림은 꺼 뒀어요.',
  '🧑‍🚀 무중력이라 커피가 동그랗게 떠다녀요.',
  '🧑‍🚀 휴스턴, 수다가 너무 재밌어서 귀환을 미루겠다.',
]

export const WHALE_LINES = ['🐋 우주 고래가 노래합니다… ♪', '🐋 고래는 별가루를 먹고 자라요.', '🐋 뿌우우— (은하 반대편까지 들리는 소리)']

export const SATELLITE_LINES = ['📡 핑… 응답 시간 42ms', '📡 이 행성의 날씨: 맑음, 가끔 아이디어 소나기', '📡 신호 수신 양호. 수다 전송 중…']
