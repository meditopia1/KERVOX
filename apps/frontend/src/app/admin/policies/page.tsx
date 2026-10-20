import { redirect } from 'next/navigation'

export default function AdminPoliciesRedirectPage() {
  redirect('/admin/products')
}
