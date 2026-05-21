import { redirect } from 'next/navigation'

export default function RadarRedirectPage() {
  redirect('/dashboard/centro-sunafil?tab=radar')
}
