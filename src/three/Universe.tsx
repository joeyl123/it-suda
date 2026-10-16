// 하나의 우주 (design.md §4, §6)
//
// 화면 전체에 늘 떠 있는 단 하나의 3D 캔버스. 페이지(URL)가 바뀌어도 사라지지 않고,
// 글자 패널은 모두 그 위에 떠 있다. 페이지 이동 = 카메라 비행.
//
// 비행 원리 — 중첩 좌표 (lib/layout.ts)
//   1. 지금 보는 장면 A는 원점·축척 1.
//   2. 가려는 장면 B를 "A 좌표에서 B가 실제로 있는 자리·크기"에 새 레이어로 띄운다.
//      (태양계는 그 별 자리에 아주 작게, 행성은 공전하던 그 자리에 그 크기 그대로)
//   3. 카메라가 그 점으로 날아가며 확대 → B가 점에서부터 자라나고 A의 별들은 스쳐 지나간다.
//   4. 도착하면 같은 프레임에 B를 원점·축척 1로, 카메라도 같은 비율로 되돌린다(re-root).
//      화면상으로는 아무것도 변하지 않는다. 그리고 A를 내린다.
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { useLocation, useNavigate } from 'react-router-dom'
import { systemProfile } from '../lib/cosmos'
import { childAnchor, extentOf, frameOf, galaxyOrder, systemLayout, viewFromPath, viewKey, type Frame, type View } from '../lib/layout'
import { formatDate, pad2, searchSessions } from '../lib/sessions'
import { prefersReducedMotion } from '../lib/zoom'
import { stepQuality, useQuality } from '../lib/quality'
import { useSheet, type SheetState } from '../lib/ui'
import { bindLabel, POLAR_FULL, POLAR_OPEN, registry, Starfield, syncAnchors, useHoverCursor, type EmergeSource, type EmergeState } from './common'
import { ShootingStars, Warp } from './effects'
import GalaxyScene from './GalaxyScene'
import PlanetScene from './PlanetScene'
import SystemScene from './SystemScene'

export interface SceneProps {
  layerId: string
  hovered: string | null
  /** 이 장면 속에서 감출 앵커 (비행 중 다른 레이어와 겹치는 오브젝트) */
  hide?: string
  /** 클릭·호버를 받는가 (도착한 장면만) */
  interactive: boolean
  /** 공전 멈춤 (비행 중이거나 뒤에 남은 레이어) */
  frozen: boolean
  onHover: (id: string | null) => void
  onSelect: (path: string) => void
  /** 비행 중 주변 오브젝트가 생겨나는 진행 상태 (common.tsx Emerge) */
  emerge?: EmergeSource
}

/** 화면 배치: galaxy = 왼쪽 소개 카드, panel = 오른쪽(모바일은 아래) 패널, ambient = 가운데 카드(소개·목록) */
type Mode = 'galaxy' | 'panel' | 'ambient'

function modeOf(pathname: string, search: string, view: View): Mode {
  if (view.kind !== 'galaxy') return 'panel'
  return pathname === '/' && !new URLSearchParams(search).has('view') ? 'galaxy' : 'ambient'
}

/** 패널을 피해 장면 중심을 옮길 거리 (px). x>0 오른쪽, y>0 위쪽 */
function shiftOf(mode: Mode, w: number, h: number, sheet: SheetState = 'peek') {
  if (mode === 'ambient') return { x: 0, y: 0 }
  if (w >= 900) return { x: mode === 'galaxy' ? 220 : -250, y: 0 }
  // 모바일: 아래 시트가 가리는 만큼 위로 (접힌 시트 ≈ 30%, 펼친 시트 ≈ 72%)
  return { x: 0, y: h * (sheet === 'open' ? 0.36 : 0.15) }
}

/** @param onReady 첫 장면이 실제로 그려졌을 때 (로딩 화면을 걷는다) */
export default function Universe({ onReady }: { onReady?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const target = useMemo(() => viewFromPath(location.pathname), [location.pathname])
  const mode = modeOf(location.pathname, location.search, target)
  const matches = useMemo(() => {
    const p = new URLSearchParams(location.search)
    return new Set(searchSessions(p.get('q') ?? '', p.get('tag')).map((s) => s.slug))
  }, [location.search])
  const [hovered, setHovered] = useState<string | null>(null)
  const [active, setActive] = useState<{ view: View; flying: boolean }>({ view: target, flying: false })
  const { settings } = useQuality()
  useHoverCursor(hovered !== null)
  useEffect(() => setHovered(null), [location.pathname])

  return (
    <div className="universe">
      <Canvas orthographic dpr={[1, settings.dpr]} frameloop={settings.fps ? 'demand' : 'always'} camera={{ position: [115, 115, 115], zoom: 10, near: 0.1, far: 1200 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.9} />
        <hemisphereLight args={['#e2d3f7', '#2a2140', 1.1]} />
        <directionalLight position={[-8, 12, 6]} intensity={2.2} color="#fff4e0" />
        {/* 버벅이면 품질을 한 단계 내리고, 여유가 생기면 올린다 (자동 모드일 때만) */}
        <PerformanceMonitor flipflops={3} onDecline={() => stepQuality(-1)} onIncline={() => stepQuality(1)} />
        {settings.fps > 0 && <FrameCap fps={settings.fps} />}
        <Starfield key={settings.starfield} count={settings.starfield} />
        <RenderAndSync />
        <ShootingStars />
        <Warp />
        <World
          target={target}
          mode={mode}
          matches={matches}
          hovered={hovered}
          onHover={setHovered}
          onSelect={(path) => navigate(path)}
          onActive={setActive}
          onReady={onReady}
        />
      </Canvas>
      <Labels
        view={active.view}
        hidden={active.flying || mode === 'ambient'}
        hovered={hovered}
        matches={matches}
        onHover={setHovered}
        onSelect={(path) => navigate(path)}
      />
    </div>
  )
}

// ---------------------------------------------------------------- world + camera director

interface Layer {
  id: string
  view: View
  pos: [number, number, number]
  scale: number
  hide?: string
}

interface Flight {
  t: number
  dur: number
  kind: 'in' | 'out' | 'side' | 'intro'
  fromT: THREE.Vector3
  toT: THREE.Vector3
  fromZ: number
  toZ: number
  bump: number
  camOffset: THREE.Vector3
  layerId?: string
  /** 도착할 장면의 은하 속 자리 (도착 후 배경 은하 위치 계산용) */
  frame?: Frame
}

type Controls = { target: THREE.Vector3; update: () => void }

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

interface WorldProps {
  target: View
  mode: Mode
  matches: Set<string>
  hovered: string | null
  onHover: (id: string | null) => void
  onSelect: (path: string) => void
  onActive: (a: { view: View; flying: boolean }) => void
  onReady?: () => void
}

function World({ target, mode, matches, hovered, onHover, onSelect, onActive, onReady }: WorldProps) {
  const quality = useQuality()
  const gl = useThree((st) => st.gl)
  /**
   * 장면이 바뀌는 순간의 블러 (글자 패널은 그대로). 줌 하는 동안엔 또렷하게 두고,
   * 줌이 끝나 갈 때 살짝 흐려지기 시작해 장면이 바뀌는 프레임에 가장 흐리고, 그 뒤 천천히 또렷해진다.
   * 가벼움 모드·동작 줄이기에선 끈다.
   */
  const blurPx = useRef(0)
  const settle = useRef<{ t: number; peak: number } | null>(null) // 장면이 바뀐 뒤 초점이 돌아오는 중
  const BLUR_PEAK = 4
  const BLUR_SETTLE = 1.2 // 초점이 돌아오는 시간 (초)
  const setBlur = (px: number) => {
    const v = quality.level === 'low' || prefersReducedMotion() ? 0 : Math.round(px * 10) / 10
    if (v === blurPx.current) return
    blurPx.current = v
    gl.domElement.style.filter = v > 0.2 ? `blur(${v}px)` : ''
  }
  const sheet = useSheet()
  const readySent = useRef(false)
  const { camera, size } = useThree()
  const cam = camera as THREE.OrthographicCamera
  const controls = useThree((s) => s.controls) as unknown as Controls | null
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: viewKey(target), view: target, pos: [0, 0, 0], scale: 1 }])
  const layersRef = useRef(layers)
  layersRef.current = layers
  const groups = useRef(new Map<string, THREE.Group>())
  const flight = useRef<Flight | null>(null)
  // 도착할 레이어의 주변 오브젝트가 생겨나는 진행 상태 (레이어 id → 상태)
  const emerges = useRef(new Map<string, EmergeState>())
  // 각 레이어가 비행의 어느 구간(t0→t1)에서 나타나거나(leave=false) 사라지는지
  const emergeTiming = useRef(new Map<string, { t0: number; t1: number; leave: boolean }>())
  const emergeOf = useMemo(() => {
    const cache = new Map<string, EmergeSource>()
    return (id: string) => {
      let fn = cache.get(id)
      if (!fn) cache.set(id, (fn = () => emerges.current.get(id)))
      return fn
    }
  }, [])
  // 배경 은하: 지금 원점에 있는 장면이 은하 속 어디에 있는지(rootFrame)에 맞춰 은하를 뒤에 깐다.
  // 은하 레이어가 화면에 있을 땐(은하 화면, 은하로 빠져나가는 비행) 숨겨서 겹치지 않게.
  const rootFrame = useRef<Frame>(frameOf(target))
  const backdrop = useRef<THREE.Group>(null)
  const updateBackdrop = () => {
    const g = backdrop.current
    if (!g) return
    const { c, k } = rootFrame.current
    g.position.set(-c[0] / k, -c[1] / k, -c[2] / k)
    g.scale.setScalar(1 / k)
    g.visible = !layersRef.current.some((l) => l.view.kind === 'galaxy' && groups.current.get(l.id)?.visible !== false)
  }
  const [flying, setFlying] = useState(false)
  const shift = useRef(shiftOf(mode, size.width, size.height))
  const top = layers[layers.length - 1]
  const targetKey = viewKey(target)

  const baseZoom = (view: View) => {
    const s = shiftOf(mode, size.width, size.height)
    return Math.min(size.width - 2 * Math.abs(s.x), size.height - 2 * Math.abs(s.y)) / (extentOf(view) * 2.25)
  }
  const base = baseZoom(top.view)

  // 처음 열릴 때: 멀리서 다가오며 등장
  const started = useRef(false)
  useEffect(() => {
    if (!controls || started.current) return
    started.current = true
    cam.zoom = base * 0.35
    cam.updateProjectionMatrix()
    flight.current = { t: 0, dur: 1.6, kind: 'intro', fromT: controls.target.clone(), toT: controls.target.clone(), fromZ: cam.zoom, toZ: base, bump: 0, camOffset: camera.position.clone().sub(controls.target) }
    setFlying(true)
  }, [controls]) // eslint-disable-line react-hooks/exhaustive-deps

  // 창 크기가 바뀌면 같은 비율로 맞춘다 (장면이 바뀌는 건 비행이 처리하므로 창 크기만 본다)
  const viewport = Math.min(size.width, size.height)
  const lastViewport = useRef(viewport)
  useEffect(() => {
    const r = lastViewport.current > 0 ? viewport / lastViewport.current : 1
    lastViewport.current = viewport
    if (r === 1) return
    const f = flight.current
    if (f) {
      // 비행 중(특히 첫 등장 직후 캔버스가 실제 크기를 알게 될 때)에도 목적지를 맞춘다
      f.fromZ *= r
      f.toZ *= r
    } else {
      cam.zoom *= r
      cam.updateProjectionMatrix()
    }
  }, [viewport, cam])

  // 목적지가 바뀌면 비행 시작 (비행 중이면 도착 후)
  useEffect(() => {
    if (flight.current || !controls || top.id === targetKey) return
    const A = top.view
    const B = target
    // 공전 중인 행성으로 들어갈 땐 지금 그 행성이 있는 자리로
    let planetAt: [number, number, number] | undefined
    if (A.kind === 'system' && B.kind === 'planet' && A.session.slug === B.session.slug) {
      const obj = registry.objs.get(`${top.id}::p${B.topic.index}`)
      if (obj) planetAt = obj.getWorldPosition(new THREE.Vector3()).toArray() as [number, number, number]
    }
    const fa = frameOf(A)
    const fb = frameOf(B, planetAt)
    const pos = new THREE.Vector3(...fb.c).sub(new THREE.Vector3(...fa.c)).divideScalar(fa.k)
    const scale = fb.k / fa.k
    const into = childAnchor(A, B)
    const outOf = childAnchor(B, A)
    const kind: Flight['kind'] = into ? 'in' : outOf ? 'out' : 'side'
    const fromZ = cam.zoom
    const toZ = baseZoom(B) / scale
    // 옆 장면으로 건너갈 땐 잠깐 물러섰다가(줌아웃) 다시 다가간다
    const span = pos.length() * Math.min(fromZ, toZ)
    const bump = kind === 'side' ? Math.log(Math.max(1, span / (Math.min(size.width, size.height) * 0.45))) + 0.35 : 0
    const id = viewKey(B)
    setLayers((ls) => [
      ...ls.filter((l) => l.id !== id).map((l) => (l.id === top.id ? { ...l, hide: into } : l)),
      { id, view: B, pos: pos.toArray() as [number, number, number], scale, hide: outOf },
    ])
    settle.current = null // 초점이 돌아오던 중이면 새 비행이 이어받는다
    // 도착할 장면 B: 들어갈 땐 중심에서 자라나고, 나올 땐 화면 밖에서 방금 떠나온 자리(B 좌표에서 A의 위치) 쪽으로 모여든다.
    // 떠나는 장면 A: 그 반대 — 들어갈 땐 목적지를 중심으로 화면 밖으로 밀려나고, 나올 땐 자기 중심으로 오그라든다.
    emerges.current.clear()
    emergeTiming.current.clear()
    const out = kind === 'out'
    emerges.current.set(id, { p: 0, from: out ? 'outside' : 'center', pivot: out ? pos.clone().negate().divideScalar(scale) : new THREE.Vector3() })
    emergeTiming.current.set(id, out ? { t0: 0, t1: 0.95, leave: false } : { t0: 0.2, t1: 1, leave: false })
    emerges.current.set(top.id, { p: 1, from: kind === 'in' ? 'outside' : 'center', pivot: kind === 'in' ? pos.clone() : new THREE.Vector3() })
    emergeTiming.current.set(top.id, kind === 'in' ? { t0: 0.3, t1: 1, leave: true } : { t0: 0, t1: 0.7, leave: true })
    flight.current = {
      t: 0,
      dur: prefersReducedMotion() ? 0.01 : kind === 'side' ? 1.8 : 1.7,
      kind,
      fromT: controls.target.clone(),
      toT: pos,
      fromZ,
      toZ,
      bump,
      camOffset: camera.position.clone().sub(controls.target),
      layerId: id,
      frame: fb,
    }
    setFlying(true)
    onActive({ view: B, flying: true })
  }) // 매 렌더마다 확인: 목적지·비행 상태·레이어가 바뀔 때 모두 다시 본다

  useFrame((_, dt) => {
    // 패널을 피하는 화면 중심 이동 (부드럽게)
    if (!readySent.current && controls) {
      readySent.current = true
      onReady?.()
    }
    const want = shiftOf(mode, size.width, size.height, sheet)
    const k = 1 - Math.exp(-dt * 4)
    shift.current.x += (want.x - shift.current.x) * k
    shift.current.y += (want.y - shift.current.y) * k
    cam.setViewOffset(size.width, size.height, -shift.current.x, shift.current.y, size.width, size.height)
    cam.updateProjectionMatrix()

    updateBackdrop()
    if (settle.current) {
      const st = settle.current
      st.t = Math.min(1, st.t + Math.min(dt, 0.1) / BLUR_SETTLE)
      setBlur(st.peak * (1 - st.t)) // 일정한 속도로 또렷해진다
      if (st.t >= 1) settle.current = null
    }
    const f = flight.current
    if (!f || !controls) return
    // 무거운 프레임(행성 생성 등)이 있어도 시간표대로 — 너무 큰 건너뜀만 막는다
    f.t = Math.min(1, f.t + Math.min(dt, 0.25) / f.dur)
    // 블러: 줌과 함께 일정한 속도로 차올라 장면이 바뀌는 순간 최대 (첫 등장 줌에는 없음)
    if (f.kind !== 'intro') setBlur(BLUR_PEAK * f.t)
    // 들어갈 땐 새 장면이 점에서 화면 크기로 보이기 시작할 무렵부터 자라나고, 나올 땐 처음부터 모여든다
    emergeTiming.current.forEach((tm, lid) => {
      const em = emerges.current.get(lid)
      if (!em) return
      const k = THREE.MathUtils.smoothstep(f.t, tm.t0, tm.t1)
      em.p = tm.leave ? 1 - k : k
    })
    const u = easeInOutCubic(f.t)
    const lz = THREE.MathUtils.lerp(Math.log(f.fromZ), Math.log(f.toZ), easeInOutSine(f.t)) - f.bump * Math.sin(Math.PI * f.t)
    cam.zoom = Math.exp(lz)
    // 목적지 점이 화면 위에서 곧게 가운데로 오도록 (확대 중 옆으로 새지 않게)
    if (f.kind === 'in') controls.target.copy(f.toT).addScaledVector(f.toT.clone().sub(f.fromT), -(1 - u) * (f.fromZ / cam.zoom))
    else if (f.kind === 'out') controls.target.copy(f.fromT).addScaledVector(f.toT.clone().sub(f.fromT), u * (f.toZ / cam.zoom))
    else controls.target.lerpVectors(f.fromT, f.toT, u)
    camera.position.copy(controls.target).add(f.camOffset)
    cam.updateProjectionMatrix()

    if (f.t < 1) return
    flight.current = null
    emerges.current.clear()
    emergeTiming.current.clear()
    // 장면이 바뀌는 지금이 가장 흐린 순간 → 여기서부터 천천히 초점이 돌아온다
    if (f.kind !== 'intro') settle.current = { t: 0, peak: BLUR_PEAK }
    setFlying(false)
    const L = layersRef.current.find((l) => l.id === f.layerId)
    if (!L) return
    // re-root: 도착한 장면을 원점·축척 1로. 카메라도 같은 비율로 → 화면은 그대로
    controls.target.sub(new THREE.Vector3(...L.pos)).divideScalar(L.scale)
    camera.position.copy(controls.target).add(f.camOffset)
    cam.zoom *= L.scale
    cam.updateProjectionMatrix()
    groups.current.forEach((g, gid) => {
      if (gid === L.id) {
        g.position.set(0, 0, 0)
        g.scale.setScalar(1)
      } else g.visible = false
    })
    if (f.frame) rootFrame.current = f.frame
    updateBackdrop() // 같은 프레임에 은하 레이어 → 배경 은하로 넘겨받는다
    controls.update()
    setLayers([{ ...L, pos: [0, 0, 0], scale: 1, hide: undefined }])
    onActive({ view: L.view, flying: false })
  })

  const polar = top.view.kind === 'planet' ? POLAR_FULL : POLAR_OPEN

  return (
    <>
      <OrbitControls
        makeDefault
        enabled={!flying}
        enableDamping
        enablePan={top.view.kind === 'galaxy'}
        minPolarAngle={polar[0]}
        maxPolarAngle={polar[1]}
        minZoom={base * 0.25}
        maxZoom={base * 8}
        autoRotate={top.view.kind === 'galaxy' && !flying && hovered === null}
        autoRotateSpeed={0.35}
      />
      <group ref={backdrop} visible={false}>
        <GalaxyScene
          backdrop
          layerId="backdrop"
          matches={matches}
          hovered={null}
          hide={top.view.kind !== 'galaxy' ? `sys:${top.view.session.slug}` : undefined}
          interactive={false}
          frozen
          onHover={onHover}
          onSelect={onSelect}
        />
      </group>
      {layers.map((l, i) => {
        const last = i === layers.length - 1
        const props: SceneProps = {
          layerId: l.id,
          hovered: last ? hovered : null,
          hide: l.hide,
          interactive: last && !flying && mode !== 'ambient',
          frozen: !last || flying,
          onHover,
          onSelect,
          emerge: emergeOf(l.id),
        }
        return (
          <group
            key={l.id}
            ref={(g) => void (g ? groups.current.set(l.id, g) : groups.current.delete(l.id))}
            position={l.pos}
            scale={l.scale}
          >
            <Suspense fallback={null}>
              {l.view.kind === 'galaxy' && <GalaxyScene {...props} matches={matches} />}
              {l.view.kind === 'system' && <SystemScene {...props} session={l.view.session} />}
              {l.view.kind === 'planet' && <PlanetScene {...props} session={l.view.session} topic={l.view.topic} />}
            </Suspense>
          </group>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------- labels (DOM)

interface LabelsProps {
  view: View
  hidden: boolean
  hovered: string | null
  matches: Set<string>
  onHover: (id: string | null) => void
  onSelect: (path: string) => void
}

function Labels({ view, hidden, hovered, matches, onHover, onSelect }: LabelsProps) {
  const lid = viewKey(view)
  // 원 마커가 클릭 대상, 이름표는 호버(또는 키보드 포커스) 때만 보인다
  const target = (id: string, path: string, name: string, extra: string, style: CSSProperties) => (
    <button
      key={id + '|marker'}
      ref={bindLabel(`${lid}::${id}|marker`)}
      type="button"
      tabIndex={hidden ? -1 : 0}
      aria-label={name}
      className={`marker${hovered === id ? ' is-hover' : ''}${extra}`}
      style={style}
      onClick={() => onSelect(path)}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onBlur={() => onHover(null)}
    />
  )

  if (view.kind === 'galaxy') {
    return (
      <div className={`label-layer${hidden ? ' is-hidden' : ''}`}>
        {galaxyOrder.flatMap((s, i) => {
          const id = `sys:${s.slug}`
          const style = { '--corona': systemProfile(s, i + 1).corona, '--mark': 'var(--corona)' } as CSSProperties
          const dim = matches.has(s.slug) ? '' : ' is-dim'
          return [
            target(id, `/sessions/${s.slug}`, `No.${s.number ?? ''} ${s.title}`, dim, style),
            <div key={id} ref={bindLabel(`${lid}::${id}`)} aria-hidden="true" className={`sys-label${hovered === id ? ' is-hover' : ''}${dim}`} style={style}>
              <span className="sys-no">No.{s.number !== undefined ? pad2(s.number) : '··'}</span>
              <span className="sys-title">{s.title}</span>
              <span className="sys-meta">
                {formatDate(s.date)} · 행성 {s.topicList.length}개
              </span>
            </div>,
          ]
        })}
      </div>
    )
  }

  if (view.kind === 'system') {
    return (
      <div className={`label-layer${hidden ? ' is-hidden' : ''}`}>
        {systemLayout(view.session).planets.flatMap((p) => {
          const style = { '--glow': p.profile.biome.glow, '--mark': 'var(--glow)' } as CSSProperties
          return [
            target(p.id, `/sessions/${view.session.slug}/${p.topic.index}`, `행성 ${p.topic.index} ${p.topic.title}`, '', style),
            <div key={p.id} ref={bindLabel(`${lid}::${p.id}`)} aria-hidden="true" className={`planet-label${hovered === p.id ? ' is-hover' : ''}`} style={style}>
              <span className="planet-no">{pad2(p.topic.index)}</span>
              <span>{p.topic.title}</span>
            </div>,
          ]
        })}
      </div>
    )
  }

  return null
}

/** 가벼움 모드: 화면 주사율 대신 정해진 fps로만 그린다 (frameloop="demand"와 함께) */
function FrameCap({ fps }: { fps: number }) {
  const invalidate = useThree((st) => st.invalidate)
  useEffect(() => {
    const t = window.setInterval(() => invalidate(), 1000 / fps)
    return () => window.clearInterval(t)
  }, [fps, invalidate])
  return null
}

/**
 * 그리기를 직접 맡는다(priority 1): 모든 움직임(카메라·공전·비행)이 끝난 뒤 3D를 그리고,
 * 바로 이어서 마커·라벨 DOM을 같은 위치로 옮긴다 → 3D와 마커가 같은 프레임에 화면에 뜬다.
 */
function RenderAndSync() {
  useFrame(({ gl, scene, camera, size }) => {
    gl.render(scene, camera)
    syncAnchors(camera, size)
  }, 1)
  return null
}
