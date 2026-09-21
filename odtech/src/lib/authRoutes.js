export const MODULES = {
  sales: {
    key: "sales",
    label: "Sales",
    route: "/sales",
  },
  merchant_hub: {
    key: "merchant_hub",
    label: "Merchant Hub",
    route: "/merchant-hub",
  },
};

export function getUserRole(profile = null, user = null) {
  return (
    profile?.role ||
    user?.app_metadata?.role ||
    'worker'
  )
}

export function userHasModuleAccess(moduleKey, profile = null, user = null, moduleAccess = []) {
  if (getUserRole(profile, user) === "admin") {
    return true;
  }

  return moduleAccess.includes(moduleKey);
}

export function getDefaultRoute(profile = null, user = null, moduleAccess = []) {
  if (getUserRole(profile, user) === 'admin') {
    return '/dashboard';
  }

  const firstModule = moduleAccess.find((moduleKey) => MODULES[moduleKey]);

  return firstModule ? MODULES[firstModule].route : '/dashboard/worker';
}
