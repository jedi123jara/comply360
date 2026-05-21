import { redirect } from 'next/navigation'

export default function RiesgoSunafilRedirectPage() {
  redirect('/dashboard/centro-sunafil?tab=brechas')
}
