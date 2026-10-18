import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toSession } from './src/lib/parse'

const SESSIONS_DIR = fileURLToPath(new URL('./content/sessions', import.meta.url))

/**
 * `virtual:sessions` — 회차 마크다운을 빌드할 때(개발 서버에선 저장할 때) 미리 파싱한 결과.
 * 브라우저는 YAML 파서와 파싱 작업 없이 완성된 데이터만 받는다. 파서는 scripts/prerender.tsx와 같은 src/lib/parse.ts.
 */
function sessionsPlugin(): Plugin {
  const id = 'virtual:sessions'
  const resolved = '\0' + id
  const files = () => readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  return {
    name: 'it-suda-sessions',
    resolveId: (source) => (source === id ? resolved : undefined),
    load(moduleId) {
      if (moduleId !== resolved) return
      const list = files().map((f) => {
        const path = resolve(SESSIONS_DIR, f)
        this.addWatchFile(path)
        return toSession(`/content/sessions/${f}`, readFileSync(path, 'utf8'))
      })
      list.sort((a, b) => b.date.localeCompare(a.date))
      return `export default ${JSON.stringify(list)}`
    },
    // 회차 파일을 추가·삭제해도 다시 읽는다 (수정은 addWatchFile이 처리)
    configureServer(server) {
      server.watcher.add(SESSIONS_DIR)
      const refresh = (file: string) => {
        if (!resolve(file).startsWith(SESSIONS_DIR)) return
        const mod = server.moduleGraph.getModuleById(resolved)
        if (mod) void server.reloadModule(mod)
      }
      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
    },
  }
}

export default defineConfig({
  plugins: [react(), sessionsPlugin()],
})
