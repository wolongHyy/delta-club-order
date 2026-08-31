import { redirect } from 'next/navigation'

export default function FighterOrdersPage() {
  redirect('/fighter?tab=orders')
}
