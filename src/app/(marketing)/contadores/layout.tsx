import type { ReactNode } from 'react'
import { PublicShell } from '@/components/marketing/public-shell'

export default function ContadoresLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
