#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const MAX_FILE_BYTES = 1024 * 1024

const PATTERNS = [
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { name: 'Stripe live key', re: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g },
  { name: 'Clerk live secret', re: /\bsk_live_[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
]

const ALLOWED_SNIPPETS = [
  'placeholder',
  'example',
  'changeme',
  'your_',
  'fake-',
  'testpass',
  'ci-test',
]

function trackedFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT })
    return output.toString('utf8').split('\0').filter(Boolean)
  } catch {
    return walk(ROOT).map((file) => path.relative(ROOT, file))
  }
}

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.next', 'coverage', 'dist'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

function isProbablyBinary(buffer) {
  const len = Math.min(buffer.length, 1024)
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0) return true
  }
  return false
}

const findings = []

for (const rel of trackedFiles()) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) continue
  const stat = fs.statSync(abs)
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) continue

  const buffer = fs.readFileSync(abs)
  if (isProbablyBinary(buffer)) continue
  const text = buffer.toString('utf8')

  for (const pattern of PATTERNS) {
    pattern.re.lastIndex = 0
    for (const match of text.matchAll(pattern.re)) {
      const value = match[0]
      const lower = value.toLowerCase()
      if (ALLOWED_SNIPPETS.some((snippet) => lower.includes(snippet))) continue

      const before = text.slice(0, match.index ?? 0)
      const line = before.split('\n').length
      findings.push({ file: rel, line, type: pattern.name })
    }
  }
}

if (findings.length > 0) {
  console.error('\nSecret scan failed:\n')
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line} — ${finding.type}`)
  }
  console.error('\nRemove the secret from git history or add a narrowly-scoped allowlist rule.\n')
  process.exit(1)
}

console.log('Secret scan passed.')
