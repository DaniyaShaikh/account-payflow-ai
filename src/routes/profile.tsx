import { createFileRoute } from "@tanstack/react-router";
import { Camera, Check, KeyRound, Mail, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Btn, Field, PageHeader, Panel, StatusPill, TextInput } from "@/components/payflow-ui";
import { useRole } from "@/lib/role-context";
import { cn } from "@/lib/utils";

type ThemePreference = "light" | "dark" | "system";

const PROFILE_IMAGE_KEY = "payflow.profileImage";
const THEME_KEY = "payflow.theme";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — PayFlow" },
      {
        name: "description",
        content: "Manage your PayFlow profile, appearance and password settings.",
      },
      { property: "og:title", content: "My Profile — PayFlow" },
      {
        property: "og:description",
        content: "Manage your PayFlow profile and account settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function ProfilePage() {
  const { currentUser, userName, roleLabel, visibleClients } = useRole();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    setPhoto(window.localStorage.getItem(PROFILE_IMAGE_KEY));
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") setTheme(stored);
  }, []);

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  const updateTheme = (next: ThemePreference) => {
    setTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  };

  const updatePhoto = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setPhoto(reader.result);
      window.localStorage.setItem(PROFILE_IMAGE_KEY, reader.result);
      window.dispatchEvent(new Event("payflow-profile-updated"));
    };
    reader.readAsDataURL(file);
  };

  const changePassword = () => {
    if (!currentPassword || newPassword.length < 8) {
      setPasswordMessage("Enter your current password and a new password of at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated successfully.");
  };

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Manage your personal details, appearance and account security."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel title="Profile details" description="Your identity across the PayFlow workspace.">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-3">
                <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-bold text-primary ring-4 ring-primary/10">
                  {photo ? <img src={photo} alt={`${userName} profile`} className="size-full object-cover" /> : initials}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => updatePhoto(event.target.files?.[0])}
                />
                <Btn onClick={() => fileRef.current?.click()}>
                  <Camera className="size-3.5" /> Change photo
                </Btn>
                {photo && (
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setPhoto(null);
                      window.localStorage.removeItem(PROFILE_IMAGE_KEY);
                      window.dispatchEvent(new Event("payflow-profile-updated"));
                    }}
                  >
                    Remove
                  </Btn>
                )}
              </div>

              <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                <Field label="Full Name">
                  <TextInput value={userName} onChange={() => undefined} disabled />
                </Field>
                <Field label="Work Email">
                  <TextInput value={currentUser?.email ?? ""} onChange={() => undefined} disabled />
                </Field>
                <Field label="Role">
                  <TextInput value={roleLabel} onChange={() => undefined} disabled />
                </Field>
                <Field label="Account Status">
                  <div className="flex h-9 items-center rounded-md border border-border bg-surface px-3">
                    <StatusPill tone="success" dot>{currentUser?.status ?? "Active"}</StatusPill>
                  </div>
                </Field>
                <div className="sm:col-span-2 flex justify-end">
                  <Btn
                    variant="primary"
                    onClick={() => {
                      setProfileSaved(true);
                      window.setTimeout(() => setProfileSaved(false), 1800);
                    }}
                  >
                    {profileSaved ? <Check className="size-3.5" /> : null}
                    {profileSaved ? "Saved" : "Save Profile"}
                  </Btn>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Change password" description="Update the password used for your PayFlow account.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Current Password" className="sm:col-span-2">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/15"
                />
              </Field>
              <Field label="New Password" hint="Use at least 8 characters.">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/15"
                />
              </Field>
              <Field label="Confirm New Password">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/15"
                />
              </Field>
            </div>
            {passwordMessage && (
              <p className={cn("mt-3 text-xs", passwordMessage.includes("successfully") ? "text-success" : "text-destructive")}>{passwordMessage}</p>
            )}
            <div className="mt-4 flex justify-end">
              <Btn variant="primary" onClick={changePassword}>
                <KeyRound className="size-3.5" /> Update Password
              </Btn>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Appearance" description="Choose how PayFlow looks for you.">
            <div className="grid grid-cols-3 gap-2">
              {([
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
                ["system", "System", Monitor],
              ] as const).map(([value, label, Icon]) => (
                <Btn
                  key={value}
                  variant={theme === value ? "primary" : "secondary"}
                  className="h-auto flex-col justify-center gap-2 py-3"
                  onClick={() => updateTheme(value)}
                >
                  <Icon className="size-4" /> {label}
                </Btn>
              ))}
            </div>
          </Panel>

          <Panel title="Account overview">
            <dl className="space-y-4 text-[13px]">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-primary" />
                <div><dt className="font-semibold text-foreground">Work email</dt><dd className="mt-0.5 text-muted-foreground">{currentUser?.email}</dd></div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 text-primary" />
                <div><dt className="font-semibold text-foreground">Access</dt><dd className="mt-0.5 text-muted-foreground">{roleLabel} · {visibleClients.length} client{visibleClients.length === 1 ? "" : "s"} in view</dd></div>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}