'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

const PeopleViewClient = dynamic(
  () => import('./people-view-client').then((m) => m.PeopleViewClient),
  { ssr: false },
)

export function PeopleViewLoader({ fallback }: { fallback: ReactNode }) {
  return (
    <PeopleViewClientWrapper fallback={fallback} />
  )
}

function PeopleViewClientWrapper({ fallback }: { fallback: ReactNode }) {
  void fallback
  return <PeopleViewClient />
}
