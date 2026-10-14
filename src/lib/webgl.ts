// three.js를 끌어오지 않도록 3D 코드와 분리해 둔다 (메인 번들 크기)
export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
