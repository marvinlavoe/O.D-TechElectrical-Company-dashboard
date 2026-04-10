export function getUserRole(profile = null, user = null) {
  return (
    profile?.role ||
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    'worker'
  )
}

export function getDefaultRoute(profile = null, user = null) {
  return getUserRole(profile, user) === 'admin' ? '/dashboard' : '/dashboard/worker'
}
