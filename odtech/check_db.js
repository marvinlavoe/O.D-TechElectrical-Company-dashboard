import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ytvkucudjbxxbnoouehe.supabase.co',
  'sb_publishable_b93Hu-Cn8aqZHengeU--4g_3veT9XBb'
)

async function check() {
  const { count: receiptsCount, error: reError } = await supabase.from('receipts').select('*', { count: 'exact', head: true })
  console.log('Receipts count:', receiptsCount, reError)
  
  const { count: billingCount, error: biError } = await supabase.from('billing_documents').select('*', { count: 'exact', head: true })
  console.log('Billing count:', billingCount, biError)

  const { data: jobs, error: joError } = await supabase.from('jobs').select('status, payment_status')
  console.log('Jobs status counts:', jobs?.length, joError)
  
  process.exit(0)
}

check()
