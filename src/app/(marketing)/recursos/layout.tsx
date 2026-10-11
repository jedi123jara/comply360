import type { ReactNode } from 'react'
import { PublicShell } from '@/components/marketing/public-shell'

export default function RecursosLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
