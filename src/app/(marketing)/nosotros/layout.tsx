import type { ReactNode } from 'react'
import { PublicShell } from '@/components/marketing/public-shell'

export default function NosotrosLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
