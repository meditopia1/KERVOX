import { redirect } from 'next/navigation'

export default function AdminFinanceRedirectPage() {
  redirect('/finance/dashboard')
}
