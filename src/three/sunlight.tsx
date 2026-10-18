import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 항성의 빛 (design.md §7)
//
// 점광원 개수가 바뀌면 three.js는 빛을 받는 모든 재질의 셰이더를 다시 컴파일한다(Windows 브라우저에선 특히 느리다).
// 태양계 장면이 생길 때마다 pointLight를 넣었다 빼면 은하 ↔ 태양계 ↔ 행성 전환마다 버벅인다.
// 그래서 점광원은 우주 전체에 딱 하나 두고, 지금 보이는 태양계의 항성 자리로 옮겨 쓴다. 항성이 없으면 세기 0.

interface Sun {
  obj: THREE.Object3D
  color: THREE.Color
}
const suns: Sun[] = []

/** 항성 자리 표시 (SystemScene). 이 태양계 좌표 기준으로 세기 30, 닿는 거리 60 */
export function SunAnchor({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    const obj = ref.current
    if (!obj) return
    const sun = { obj, color: new THREE.Color(color) }
    suns.push(sun)
    return () => {
      const i = suns.indexOf(sun)
      if (i >= 0) suns.splice(i, 1)
    }
  }, [color])
  return <group ref={ref} />
}

const INTENSITY = 30
const DISTANCE = 60
const DECAY = 1.4
const tmp = new THREE.Vector3()

function shown(o: THREE.Object3D | null) {
  for (let n = o; n; n = n.parent) if (!n.visible) return false
  return true
}

/** 우주에 하나뿐인 점광원 (Universe). 가장 나중에 생긴, 화면에 있는 항성을 따라간다 */
export function SunLight() {
  const light = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const l = light.current
    if (!l) return
    let sun: Sun | undefined
    for (let i = suns.length - 1; i >= 0; i--) {
      if (shown(suns[i].obj)) {
        sun = suns[i]
        break
      }
    }
    if (!sun) {
      l.intensity = 0
      return
    }
    sun.obj.getWorldPosition(l.position)
    // 태양계 레이어가 커지거나 작아져도(비행 중) 같은 밝기로 보이도록 거리·세기를 축척에 맞춘다
    const s = sun.obj.getWorldScale(tmp).x
    l.distance = DISTANCE * s
    l.intensity = INTENSITY * Math.pow(s, DECAY)
    l.color.copy(sun.color)
  })
  return <pointLight ref={light} intensity={0} distance={DISTANCE} decay={DECAY} />
}
