// 새 회차(태양계) 파일을 템플릿에서 만들고 랜덤 시드를 넣어 준다.
//
//   npm run new -- "회차 제목" [영문-슬러그]
//   npm run seed                     → 랜덤 시드 하나만 출력 (행성 하나를 다시 굴릴 때)
import { randomInt } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const DIR = 'content/sessions'
const newSeed = () => randomInt(100000, 1000000)

const [cmd, title, slugArg] = process.argv.slice(2)

if (cmd === 'seed') {
  console.log(newSeed())
  process.exit(0)
}

if (!title) {
  console.log('사용법: npm run new -- "회차 제목" [영문-슬러그]')
  process.exit(1)
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_'))
const numbers = files.map((f) => Number(readFileSync(`${DIR}/${f}`, 'utf8').match(/^number:\s*(\d+)/m)?.[1] ?? 0))
const number = Math.max(0, ...numbers) + 1
const date = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD (로컬 시간)
const slug = (slugArg ?? `meetup-${number}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
const file = `${DIR}/${date}-${slug}.md`
if (existsSync(file)) {
  console.error(`이미 있어요: ${file}`)
  process.exit(1)
}

const seed = newSeed()
const body = readFileSync(`${DIR}/_template.md`, 'utf8')
  .replace(/^# .*\n/gm, '') // 템플릿 안내 주석 줄 제거
  .replace(/^title:.*$/m, `title: ${title}`)
  .replace(/^date:.*$/m, `date: ${date}`)
  .replace(/^number:.*$/m, `number: ${number}`)
  .replace(/^seed:.*$/m, `seed: ${seed}`)

writeFileSync(file, body)
console.log(`✓ ${file}\n  No.${String(number).padStart(2, '0')} · 태양계 시드 ${seed}`)
