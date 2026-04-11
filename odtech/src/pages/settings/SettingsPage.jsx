import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Globe,
  Lock,
  LogOut,
  Mail,
  MonitorCog,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import { supabase } from "../../lib/supabase";
import {
  applySystemPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_SYSTEM_PREFERENCES,
  normalizeNotificationPreferences,
  normalizeSystemPreferences,
  readStoredSystemPreferences,
} from "../../lib/settings";
import { formatDate } from "../../lib/utils";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Avatar from "../../components/ui/Avatar";
import toast from "react-hot-toast";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "system", label: "System", icon: Settings },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
];

const TIMEZONE_OPTIONS = [
  { value: "Africa/Accra", label: "Africa/Accra" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Chicago", label: "America/Chicago" },
];

const NOTIFICATION_ROWS = [
  {
    key: "email_alerts",
    label: "Email alerts",
    description: "Receive account and billing updates in your inbox.",
  },
  {
    key: "job_updates",
    label: "Job updates",
    description: "Get notified when assigned jobs are created or change status.",
  },
  {
    key: "customer_updates",
    label: "Customer updates",
    description: "Stay in sync when customer details or requests are updated.",
  },
  {
    key: "system_alerts",
    label: "System alerts",
    description: "Important maintenance, security, and platform notices.",
  },
];

function buildProfileForm(profile, emailAddress) {
  return {
    full_name: profile?.full_name || "",
    email: emailAddress || "",
    phone: profile?.phone ? String(profile.phone) : "",
    specialization: profile?.specialization || "",
    avatar_url:
      profile?.avatar_url && profile.avatar_url !== "NULL"
        ? profile.avatar_url
        : "",
  };
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-surface-border bg-surface p-4">
      <div className="space-y-1">
        <p className="font-medium text-text-primary">{label}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-surface-border"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function InfoTile(props) {
  const IconComponent = props.icon;

  return (
    <div className="min-w-0 rounded-2xl border border-surface-border bg-surface px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-text-muted">
        <IconComponent size={15} />
        <span className="text-xs uppercase tracking-[0.18em]">
          {props.label}
        </span>
      </div>
      <p className="min-w-0 break-words text-sm font-medium leading-5 text-text-primary">
        {props.value}
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const { session, profile, loading: authLoading, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [systemSaving, setSystemSaving] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    new_password: "",
    confirm_password: "",
  });

  const accountEmail = session?.user?.email || profile?.email || "";
  const baseProfileForm = useMemo(
    () => buildProfileForm(profile, accountEmail),
    [profile, accountEmail],
  );
  const baseNotifications = useMemo(
    () =>
      normalizeNotificationPreferences(profile?.notification_preferences),
    [profile?.notification_preferences],
  );
  const baseSystemPrefs = useMemo(
    () =>
      normalizeSystemPreferences(
        readStoredSystemPreferences(),
        profile?.system_preferences,
      ),
    [profile?.system_preferences],
  );

  const [profileForm, setProfileForm] = useState(baseProfileForm);
  const [notifications, setNotifications] = useState(baseNotifications);
  const [systemPrefs, setSystemPrefs] = useState(baseSystemPrefs);

  useEffect(() => {
    setProfileForm(baseProfileForm);
  }, [baseProfileForm]);

  useEffect(() => {
    setNotifications(baseNotifications);
  }, [baseNotifications]);

  useEffect(() => {
    setSystemPrefs(baseSystemPrefs);
  }, [baseSystemPrefs]);

  const profileDirty =
    JSON.stringify(profileForm) !== JSON.stringify(baseProfileForm);
  const notificationsDirty =
    JSON.stringify(notifications) !== JSON.stringify(baseNotifications);
  const systemDirty =
    JSON.stringify(systemPrefs) !== JSON.stringify(baseSystemPrefs);

  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "Worker";
  const memberSince = profile?.created_at
    ? formatDate(profile.created_at)
    : "Recently";

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field, value) => {
    setSecurityForm((prev) => ({ ...prev, [field]: value }));
  };

  const persistProfile = async (updates) => {
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error("No active session found.");
    }

    const payload = {
      id: userId,
      full_name:
        updates.full_name ??
        profile?.full_name ??
        session?.user?.user_metadata?.full_name ??
        accountEmail,
      email: updates.email ?? profileForm.email.trim() ?? accountEmail,
      phone: updates.phone ?? profile?.phone ?? null,
      specialization:
        updates.specialization ?? profile?.specialization ?? null,
      avatar_url: updates.avatar_url ?? profile?.avatar_url ?? null,
      notification_preferences:
        updates.notification_preferences ??
        profile?.notification_preferences ??
        DEFAULT_NOTIFICATION_PREFERENCES,
      system_preferences:
        updates.system_preferences ??
        profile?.system_preferences ??
        DEFAULT_SYSTEM_PREFERENCES,
      role: profile?.role || "worker",
    };

    const { error } = await supabase.from("profiles").upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      throw error;
    }

    await useAuthStore.getState().fetchProfile(userId);
  };

  const handleSaveProfile = async () => {
    const userId = session?.user?.id;

    if (!userId) {
      toast.error("Please sign in again to update your profile.");
      return;
    }

    const fullName = profileForm.full_name.trim();
    const email = profileForm.email.trim();
    const specialization = profileForm.specialization.trim();
    const avatarUrl = profileForm.avatar_url.trim();
    const phoneDigits = profileForm.phone.replace(/[^\d]/g, "");

    if (!fullName) {
      toast.error("Full name is required.");
      return;
    }

    if (!email) {
      toast.error("Email address is required.");
      return;
    }

    setProfileSaving(true);

    try {
      if (email !== accountEmail) {
        const { error: emailError } = await supabase.auth.updateUser({
          email,
        });

        if (emailError) {
          throw emailError;
        }
      }

      await persistProfile({
        full_name: fullName,
        email,
        phone: phoneDigits ? Number(phoneDigits) : null,
        specialization: specialization || null,
        avatar_url: avatarUrl || null,
      });

      toast.success(
        email !== accountEmail
          ? "Profile updated. Check your inbox to confirm the new email."
          : "Profile updated successfully.",
      );
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!securityForm.new_password || !securityForm.confirm_password) {
      toast.error("Enter and confirm the new password.");
      return;
    }

    if (securityForm.new_password !== securityForm.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }

    if (securityForm.new_password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setPasswordSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: securityForm.new_password,
      });

      if (error) {
        throw error;
      }

      setSecurityForm({
        new_password: "",
        confirm_password: "",
      });
      toast.success("Password updated successfully.");
    } catch (error) {
      console.error("Password change error:", error);
      toast.error(error.message || "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setNotificationSaving(true);

    try {
      await persistProfile({
        notification_preferences: notifications,
      });

      toast.success("Notification preferences updated.");
    } catch (error) {
      console.error("Notification save error:", error);
      toast.error(error.message || "Failed to save notification settings.");
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleSaveSystem = async () => {
    const normalizedSystemPrefs = applySystemPreferences(systemPrefs);
    setSystemSaving(true);

    try {
      await persistProfile({
        system_preferences: normalizedSystemPrefs,
      });

      toast.success("System preferences updated.");
    } catch (error) {
      console.error("System preferences save error:", error);
      toast.error(error.message || "Failed to save system settings.");
    } finally {
      setSystemSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out successfully.");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to sign out.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-surface-border bg-surface-card">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_32%),linear-gradient(135deg,var(--color-surface-card),var(--color-surface))] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar
                src={profileForm.avatar_url || undefined}
                name={profileForm.full_name || accountEmail}
                size="xl"
                className="ring-4 ring-primary/15"
              />
              <div className="space-y-2">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-primary/80">
                    Account Settings
                  </p>
                  <h1 className="text-3xl font-bold text-text-primary">
                    {profileForm.full_name || "Your workspace profile"}
                  </h1>
                </div>
                <p className="max-w-2xl text-sm text-text-secondary">
                  Keep your profile, sign-in details, and workspace preferences
                  up to date so the rest of the app feels personal and stays in
                  sync.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoTile icon={ShieldCheck} label="Role" value={roleLabel} />
              <InfoTile icon={Mail} label="Account Email" value={accountEmail || "No email"} />
              <InfoTile icon={Globe} label="Member Since" value={memberSince} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-surface-border bg-surface-card p-3">
          <div className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
                }`}
              >
                <tab.icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-[24px] border border-surface-border bg-surface-card p-6 md:p-7">
          {authLoading ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === "profile" && (
                <>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-semibold text-text-primary">
                          Profile Details
                        </h2>
                        <p className="mt-1 text-sm text-text-muted">
                          Update the information teammates will see across jobs,
                          chat, receipts, and reports.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                          label="Full Name"
                          value={profileForm.full_name}
                          onChange={(event) =>
                            handleProfileChange("full_name", event.target.value)
                          }
                          required
                        />
                        <Input
                          label="Email Address"
                          type="email"
                          value={profileForm.email}
                          onChange={(event) =>
                            handleProfileChange("email", event.target.value)
                          }
                          hint="Changing this may require email confirmation in Supabase."
                          required
                        />
                        <Input
                          label="Phone Number"
                          value={profileForm.phone}
                          onChange={(event) =>
                            handleProfileChange("phone", event.target.value)
                          }
                          placeholder="e.g. 0548631776"
                        />
                        <Input
                          label="Specialization"
                          value={profileForm.specialization}
                          onChange={(event) =>
                            handleProfileChange(
                              "specialization",
                              event.target.value,
                            )
                          }
                          placeholder="Electrical Engineer"
                        />
                      </div>

                      <Input
                        label="Avatar URL"
                        value={profileForm.avatar_url}
                        onChange={(event) =>
                          handleProfileChange("avatar_url", event.target.value)
                        }
                        placeholder="https://example.com/avatar.jpg"
                        hint="Paste an image URL if you want a custom avatar."
                      />
                    </div>

                    <div className="rounded-[24px] border border-surface-border bg-surface p-5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={profileForm.avatar_url || undefined}
                            name={profileForm.full_name || accountEmail}
                            size="xl"
                          />
                          <div>
                            <p className="font-semibold text-text-primary">
                              {profileForm.full_name || "No name yet"}
                            </p>
                            <p className="text-sm text-text-muted">
                              {roleLabel}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <InfoTile
                            icon={Mail}
                            label="Email"
                            value={profileForm.email || "No email"}
                          />
                          <InfoTile
                            icon={Phone}
                            label="Phone"
                            value={profileForm.phone || "Not set"}
                          />
                          <InfoTile
                            icon={BriefcaseBusiness}
                            label="Specialization"
                            value={profileForm.specialization || "Not set"}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setProfileForm(baseProfileForm)}
                      disabled={!profileDirty || profileSaving}
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      loading={profileSaving}
                      disabled={!profileDirty}
                    >
                      <Save size={16} className="mr-2" />
                      Save Profile
                    </Button>
                  </div>
                </>
              )}

              {activeTab === "security" && (
                <>
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary">
                      Security
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Update your password and manage the current signed-in
                      session.
                    </p>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-4 rounded-[24px] border border-surface-border bg-surface p-5">
                      <Input
                        label="New Password"
                        type="password"
                        value={securityForm.new_password}
                        onChange={(event) =>
                          handleSecurityChange(
                            "new_password",
                            event.target.value,
                          )
                        }
                        hint="Use at least 8 characters."
                      />
                      <Input
                        label="Confirm New Password"
                        type="password"
                        value={securityForm.confirm_password}
                        onChange={(event) =>
                          handleSecurityChange(
                            "confirm_password",
                            event.target.value,
                          )
                        }
                      />

                      <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setSecurityForm({
                              new_password: "",
                              confirm_password: "",
                            })
                          }
                          disabled={
                            (!securityForm.new_password &&
                              !securityForm.confirm_password) ||
                            passwordSaving
                          }
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={handleChangePassword}
                          loading={passwordSaving}
                        >
                          Update Password
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-[24px] border border-surface-border bg-surface p-5">
                      <InfoTile
                        icon={ShieldCheck}
                        label="Signed In As"
                        value={accountEmail || "Unknown account"}
                      />
                      <InfoTile
                        icon={MonitorCog}
                        label="Current Session"
                        value="This browser on the current device"
                      />

                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} className="mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "notifications" && (
                <>
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary">
                      Notifications
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Choose which updates should reach you while you work.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {NOTIFICATION_ROWS.map((item) => (
                      <ToggleRow
                        key={item.key}
                        label={item.label}
                        description={item.description}
                        checked={Boolean(notifications[item.key])}
                        onChange={() =>
                          setNotifications((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))
                        }
                      />
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setNotifications(DEFAULT_NOTIFICATION_PREFERENCES)
                      }
                      disabled={
                        JSON.stringify(notifications) ===
                          JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES) ||
                        notificationSaving
                      }
                    >
                      Reset To Default
                    </Button>
                    <Button
                      onClick={handleSaveNotifications}
                      loading={notificationSaving}
                      disabled={!notificationsDirty}
                    >
                      Save Preferences
                    </Button>
                  </div>
                </>
              )}

              {activeTab === "system" && (
                <>
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary">
                      System Preferences
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Personalize the app appearance and keep your workspace
                      aligned with your locale.
                    </p>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Select
                        label="Theme"
                        value={systemPrefs.theme}
                        onChange={(event) =>
                          setSystemPrefs((prev) => ({
                            ...prev,
                            theme: event.target.value,
                          }))
                        }
                        options={[
                          { value: "dark", label: "Dark" },
                          { value: "light", label: "Light" },
                          { value: "auto", label: "Auto" },
                        ]}
                      />
                      <Select
                        label="Language"
                        value={systemPrefs.language}
                        onChange={(event) =>
                          setSystemPrefs((prev) => ({
                            ...prev,
                            language: event.target.value,
                          }))
                        }
                        options={LANGUAGE_OPTIONS}
                      />
                      <Select
                        label="Timezone"
                        value={systemPrefs.timezone}
                        onChange={(event) =>
                          setSystemPrefs((prev) => ({
                            ...prev,
                            timezone: event.target.value,
                          }))
                        }
                        options={TIMEZONE_OPTIONS}
                      />
                    </div>

                    <div className="space-y-4 rounded-[24px] border border-surface-border bg-surface p-5">
                      <InfoTile
                        icon={Settings}
                        label="Theme Mode"
                        value={systemPrefs.theme}
                      />
                      <InfoTile
                        icon={Globe}
                        label="Timezone"
                        value={systemPrefs.timezone}
                      />
                      <InfoTile
                        icon={Bell}
                        label="Language"
                        value={
                          LANGUAGE_OPTIONS.find(
                            (option) => option.value === systemPrefs.language,
                          )?.label || systemPrefs.language
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSystemPrefs(
                          normalizeSystemPreferences(
                          DEFAULT_SYSTEM_PREFERENCES,
                          ),
                        );
                      }}
                      disabled={
                        JSON.stringify(systemPrefs) ===
                          JSON.stringify(DEFAULT_SYSTEM_PREFERENCES) ||
                        systemSaving
                      }
                    >
                      Reset To Default
                    </Button>
                    <Button
                      onClick={handleSaveSystem}
                      loading={systemSaving}
                      disabled={!systemDirty}
                    >
                      Save System Settings
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
