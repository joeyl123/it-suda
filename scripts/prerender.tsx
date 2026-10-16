// 링크 미리보기(카카오톡·당근 채팅 등)용 빌드 후처리. `npm run build` 마지막 단계.
//
// 채팅 앱의 미리보기 봇은 자바스크립트를 실행하지 않고 HTML만 읽는다. 그래서
//  1. 회차·행성마다 dist/sessions/<slug>[/<n>]/index.html 을 만들어 og 태그를 그 페이지 것으로 바꾸고
//  2. 각 페이지의 미리보기 이미지(1200×630 PNG)를 dist/og/ 에 그린다 (satori → resvg).
// 사이트 자체는 그대로 SPA다. 이 HTML들도 같은 앱을 불러온다. (design.md §10)
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { planetColors, planetProfile, seeded, systemProfile, type PlanetProfile } from '../src/lib/cosmos'
import { toSession, type Session, type Topic } from '../src/lib/parse'

const ROOT = path.resolve(import.meta.dirname, '..')
const DIST = path.join(ROOT, 'dist')
const SITE = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://it-suda.vercel.app')
).replace(/\/$/, '')
const W = 1200
const H = 630

const C = {
  bg: '#0f0c18',
  ink: '#f3ecdd',
  soft: '#a99fbc',
  rule: '#352c4a',
  violet: '#b898ea',
  apricot: '#f0946e',
  butter: '#f2dc7e',
}

// ---------------------------------------------------------------- content

const sessions: Session[] = fs
  .readdirSync(path.join(ROOT, 'content/sessions'))
  .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  .map((f) => toSession(f, fs.readFileSync(path.join(ROOT, 'content/sessions', f), 'utf8')))
  .sort((a, b) => b.date.localeCompare(a.date))

const pad2 = (n: number) => String(n).padStart(2, '0')
const no = (s: Session) => (s.number !== undefined ? `No.${pad2(s.number)}` : 'No.··')
const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return y ? `${y}년 ${m}월 ${day}일` : d
}
/** 마크다운 본문에서 첫 문장 정도를 평문으로 */
function plain(md: string, max = 110) {
  const text = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*>\s?.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`|>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text
}

// ---------------------------------------------------------------- svg art (배경 그림은 SVG로 그려 이미지로 넣는다)

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

function starfield(seed: string) {
  const r = seeded(seed)
  let dots = ''
  for (let i = 0; i < 220; i++) {
    const o = (0.25 + r() * 0.75).toFixed(2)
    dots += `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * H).toFixed(1)}" r="${(0.5 + r() * r() * 1.8).toFixed(2)}" fill="#fff" opacity="${o}"/>`
  }
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <radialGradient id="a" cx="78%" cy="30%" r="60%"><stop offset="0" stop-color="#6a3fa0" stop-opacity=".45"/><stop offset="1" stop-color="#6a3fa0" stop-opacity="0"/></radialGradient>
        <radialGradient id="b" cx="8%" cy="95%" r="55%"><stop offset="0" stop-color="#d9744f" stop-opacity=".28"/><stop offset="1" stop-color="#d9744f" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="${C.bg}"/><rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/>${dots}
    </svg>`,
  )
}

function glow(id: string, color: string) {
  return `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity=".9"/><stop offset=".35" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`
}

/** 은하: 나선팔 4개 + 블랙홀 (사이트의 은하와 같은 색) */
function galaxyArt() {
  const r = seeded('og-galaxy')
  const g = () => (r() + r() + r() - 1.5) / 1.5
  const arms = [
    { off: 0, c: ['#b898ea', '#ff8fc7'], n: 900 },
    { off: Math.PI, c: ['#f0946e', '#f2dc7e'], n: 900 },
    { off: Math.PI / 2 + 0.3, c: ['#7aa8f0', '#7fe6df'], n: 420 },
    { off: -Math.PI / 2 + 0.2, c: ['#9be7a0', '#a8dcf0'], n: 420 },
  ]
  let dots = ''
  for (const arm of arms) {
    for (let i = 0; i < arm.n; i++) {
      const t = Math.pow(r(), 0.8)
      const rad = 18 + t * 250
      const a = arm.off + rad * 0.021 + g() * 0.25
      const x = Math.cos(a) * rad + g() * (6 + t * 18)
      const y = (Math.sin(a) * rad + g() * (6 + t * 18)) * 0.55 // 아이소메트릭처럼 눌러서
      const col = t < 0.3 ? '#fff1c4' : t < 0.65 ? arm.c[0] : arm.c[1]
      dots += `<circle cx="${(300 + x).toFixed(1)}" cy="${(200 + y).toFixed(1)}" r="${(0.7 + r() * r() * 1.8).toFixed(2)}" fill="${col}" opacity="${(0.45 + r() * 0.55).toFixed(2)}"/>`
    }
  }
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><defs>${glow('core', '#f2dc7e')}</defs>
      ${dots}
      <ellipse cx="300" cy="200" rx="70" ry="44" fill="url(#core)"/>
      <ellipse cx="300" cy="200" rx="34" ry="12" fill="none" stroke="#ff9a4a" stroke-width="5" opacity=".85"/>
      <circle cx="300" cy="200" r="11" fill="#000"/>
    </svg>`,
  )
}

/** 태양계: 항성 + 기울어진 궤도 + 행성 점 */
function systemArt(s: Session) {
  const { star, corona } = systemProfile(s)
  const planets = s.topicList.map((t) => planetProfile(s, t))
  const n = Math.max(planets.length, 1)
  let orbits = ''
  planets.forEach((p, i) => {
    const rx = 95 + (i + 1) * (190 / n)
    const a = seeded(p.seed + '/og')() * Math.PI * 2
    const x = 280 + Math.cos(a) * rx
    const y = 230 + Math.sin(a) * rx * 0.42
    const pr = 9 + p.size * 14
    const col = planetColors(p).land
    orbits += `<ellipse cx="280" cy="230" rx="${rx}" ry="${rx * 0.42}" fill="none" stroke="${corona}" stroke-opacity=".35" stroke-width="1.5"/>`
    orbits += `<circle cx="${x}" cy="${y}" r="${pr * 1.9}" fill="url(#g${i})"/><circle cx="${x}" cy="${y}" r="${pr}" fill="${col}"/>`
  })
  const defs = planets.map((p, i) => glow(`g${i}`, p.biome.glow)).join('')
  const sr = 46 * star.size
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="460"><defs>${glow('corona', corona)}${glow('core', star.core)}${defs}</defs>
      <circle cx="280" cy="230" r="${sr * 3.4}" fill="url(#corona)"/>
      ${orbits}
      <circle cx="280" cy="230" r="${sr * 1.8}" fill="url(#core)"/>
      <circle cx="280" cy="230" r="${sr}" fill="${star.core}"/>
    </svg>`,
  )
}

/** 행성: 생태계 색으로 칠한 구 + 대기 + (있으면) 고리 */
function planetArt(p: PlanetProfile) {
  const b = p.biome
  const land = planetColors(p).land
  const ring = p.ring
    ? `<ellipse cx="260" cy="250" rx="235" ry="62" fill="none" stroke="${b.land[2]}" stroke-opacity=".55" stroke-width="14" transform="rotate(-14 260 250)"/>`
    : ''
  // 고리의 뒤쪽 절반은 행성 뒤로 숨는다 → 행성을 그 다음에, 앞쪽 절반을 마지막에
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="500"><defs>
        ${glow('atmo', b.glow)}
        <radialGradient id="body" cx="35%" cy="32%" r="75%">
          <stop offset="0" stop-color="${b.land[2]}"/><stop offset=".35" stop-color="${land}"/>
          <stop offset=".75" stop-color="${b.water}"/><stop offset="1" stop-color="#0f0c18"/>
        </radialGradient>
        <clipPath id="front"><rect x="0" y="250" width="520" height="250"/></clipPath>
      </defs>
      <circle cx="260" cy="250" r="225" fill="url(#atmo)"/>
      ${ring}
      <circle cx="260" cy="250" r="150" fill="url(#body)"/>
      <circle cx="260" cy="250" r="150" fill="none" stroke="${b.glow}" stroke-opacity=".6" stroke-width="3"/>
      ${p.ring ? `<g clip-path="url(#front)">${ring}</g>` : ''}
    </svg>`,
  )
}

// ---------------------------------------------------------------- card layout (satori: flexbox만 지원)

type Node = React.ReactElement
void React // JSX(classic runtime)용

function Card({ bg, art, artW, artH, artRight = 20, children }: { bg: string; art: string; artW: number; artH: number; artRight?: number; children: Node | Node[] }) {
  return (
    <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: C.bg, fontFamily: 'Wanted Sans', color: C.ink }}>
      <img src={bg} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }} />
      <img src={art} width={artW} height={artH} style={{ position: 'absolute', right: artRight, top: (H - artH) / 2 }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 72px', width: 640, height: H }}>{children}</div>
      <div style={{ position: 'absolute', left: 72, bottom: 44, display: 'flex', alignItems: 'center', fontFamily: 'Share Tech Mono', fontSize: 22, color: C.soft, letterSpacing: 2 }}>
        IT 수다 모임 · {SITE.replace(/^https?:\/\//, '')}
      </div>
    </div>
  )
}

const Label = ({ color = C.soft, children }: { color?: string; children: string }) => (
  <div style={{ display: 'flex', fontFamily: 'Share Tech Mono', fontSize: 24, letterSpacing: 3, color, marginBottom: 18 }}>{children}</div>
)
/** 제목: 영문·숫자는 Audiowide, 한글은 자동으로 Wanted Sans. 그리스 문자(α β γ …)는 Noto Sans Greek로 직접 지정 */
const Title = ({ children, size }: { children: string; size: number }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: 'Audiowide', fontWeight: 700, fontSize: size, lineHeight: 1.18, letterSpacing: 0.5 }}>
    {children.split(/([Ͱ-Ͽ]+)/).map((part, i) =>
      i % 2 ? <span key={i} style={{ fontFamily: 'Noto Sans Greek', marginLeft: '0.25em' }}>{part}</span> : part,
    )}
  </div>
)
const Sub = ({ children }: { children: string }) => (
  <div style={{ display: 'flex', fontSize: 28, lineHeight: 1.5, color: C.soft, marginTop: 22, fontWeight: 500 }}>{children}</div>
)
const titleSize = (t: string) => (t.length > 22 ? 48 : t.length > 14 ? 58 : 72)

function siteCard() {
  const planets = sessions.reduce((n, s) => n + s.topicList.length, 0)
  return (
    <Card bg={starfield('og-site')} art={galaxyArt()} artW={600} artH={400} artRight={-50}>
      <Label>당근 IT 소모임 · 자기계발 &amp; 정보 공유</Label>
      <div style={{ display: 'flex', fontFamily: 'Audiowide', fontWeight: 700, fontSize: 96, lineHeight: 1.1 }}>
        IT 수다&nbsp;<span style={{ color: C.apricot }}>은하</span>
      </div>
      <Sub>모임 하나는 태양계, 나눈 토픽 하나는 행성. 별을 눌러 들어가 보세요.</Sub>
      <div style={{ display: 'flex', marginTop: 30, fontFamily: 'Share Tech Mono', fontSize: 26, letterSpacing: 2, color: C.violet }}>
        SYSTEMS {pad2(sessions.length)} · PLANETS {pad2(planets)}
      </div>
    </Card>
  )
}

function systemCard(s: Session) {
  const { star, corona } = systemProfile(s)
  return (
    <Card bg={starfield('og-' + s.slug)} art={systemArt(s)} artW={560} artH={460}>
      <Label color={corona}>{`태양계 ${no(s)} · ${star.name}`}</Label>
      <Title size={titleSize(s.title)}>{s.title}</Title>
      <Sub>{s.summary ?? plain(s.intro, 70)}</Sub>
      <div style={{ display: 'flex', marginTop: 26, fontFamily: 'Share Tech Mono', fontSize: 24, letterSpacing: 2, color: C.soft }}>
        {`${fmtDate(s.date)} · 행성 ${s.topicList.length}개`}
      </div>
    </Card>
  )
}

function planetCard(s: Session, t: Topic) {
  const p = planetProfile(s, t)
  return (
    <Card bg={starfield('og-' + p.seed)} art={planetArt(p)} artW={520} artH={500}>
      <Label color={p.biome.glow}>{`PLANET ${pad2(t.index)} / ${pad2(s.topicList.length)} · ${p.biome.name}`}</Label>
      <Title size={titleSize(t.title)}>{t.title}</Title>
      <Sub>{`${no(s)} ${s.title}`}</Sub>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 24, color: C.soft }}>{p.biome.blurb}</div>
    </Card>
  )
}

// ---------------------------------------------------------------- render + html

const font = (f: string) => fs.readFileSync(path.join(ROOT, 'scripts/og-fonts', f))
const fonts = [
  { name: 'Audiowide', data: font('Audiowide.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'Share Tech Mono', data: font('ShareTechMono.ttf'), weight: 400 as const, style: 'normal' as const },
  { name: 'Wanted Sans', data: font('WantedSans-Bold.otf'), weight: 700 as const, style: 'normal' as const },
  { name: 'Wanted Sans', data: font('WantedSans-Medium.otf'), weight: 500 as const, style: 'normal' as const },
  // 행성 이름의 α β γ … (위 폰트들엔 그리스 문자가 없다)
  { name: 'Noto Sans Greek', data: font('NotoSans-Greek.ttf'), weight: 700 as const, style: 'normal' as const },
]

async function png(node: Node, name: string) {
  const svg = await satori(node, { width: W, height: H, fonts })
  const out = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng()
  fs.mkdirSync(path.join(DIST, 'og'), { recursive: true })
  fs.writeFileSync(path.join(DIST, 'og', name), out)
  return `${SITE}/og/${name}`
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Meta {
  route: string
  title: string
  ogTitle: string
  description: string
  image: string
}

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
const OG = /<!-- og:start[\s\S]*?<!-- og:end -->/
if (!OG.test(template)) throw new Error('dist/index.html 에 <!-- og:start --> … <!-- og:end --> 구간이 없어요')

function writeHtml(m: Meta) {
  const url = `${SITE}${m.route}`
  const tags = [
    `<!-- og:start -->`,
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="IT 수다 모임" />`,
    `<meta property="og:locale" content="ko_KR" />`,
    `<meta property="og:title" content="${esc(m.ogTitle)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(m.image)}" />`,
    `<meta property="og:image:width" content="${W}" />`,
    `<meta property="og:image:height" content="${H}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<!-- og:end -->`,
  ].join('\n    ')
  const file = path.join(DIST, m.route, 'index.html')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, template.replace(OG, tags))
}

const SITE_DESC = "당근 IT 소모임 'IT 수다 모임'에서 나눈 트렌드, 노하우, 정보를 기록하는 은하. 모임 하나는 태양계, 토픽 하나는 행성."

async function main() {
  const t0 = Date.now()
  writeHtml({ route: '/', title: 'IT 수다 모임 · IT 수다 은하', ogTitle: 'IT 수다 은하', description: SITE_DESC, image: await png(siteCard(), 'site.png') })
  let pages = 1
  for (const s of sessions) {
    writeHtml({
      route: `/sessions/${s.slug}`,
      title: `${no(s)} ${s.title} · IT 수다 모임`,
      ogTitle: `${no(s)} ${s.title}`,
      description: `${fmtDate(s.date)} · 행성 ${s.topicList.length}개. ${s.summary ?? plain(s.intro)}`,
      image: await png(systemCard(s), `${s.slug}.png`),
    })
    pages++
    for (const t of s.topicList) {
      const p = planetProfile(s, t)
      writeHtml({
        route: `/sessions/${s.slug}/${t.index}`,
        title: `${t.title} · ${no(s)} ${s.title} · IT 수다 모임`,
        ogTitle: `${t.title} — ${p.biome.name}`,
        description: `${no(s)} ${s.title}의 행성 ${pad2(t.index)}. ${plain(t.body) || p.biome.blurb}`,
        image: await png(planetCard(s, t), `${s.slug}-${t.index}.png`),
      })
      pages++
    }
  }
  console.log(`✓ link previews: ${pages} pages, og images → dist/og (${Date.now() - t0}ms, ${SITE})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
