import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Play, Pause, RotateCcw, Download, FileSpreadsheet, FileText, Database, Maximize2, Minimize2, Eye, EyeOff } from "lucide-react";
import React from "react";
import Leaderboard from "../components/Leaderboard";
import Toast from "../components/Toast";
import { apiClient as api } from "../lib/api_client";
import { getSocket } from "../lib/socket";
import { AdminUserRow, TimerState, LeaderboardEntry } from "../types";

interface UsersResponse {
  users: AdminUserRow[];
}

function LeaderboardPreview() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    api
      .get<{ leaderboard: LeaderboardEntry[] }>("/submissions/leaderboard")
      .then((r) => setEntries(r.leaderboard))
      .catch(() => setEntries([]));

    function onFullChange() {
      const fsEl = document.fullscreenElement;
      setIsFullscreen(!!fsEl);
    }
    document.addEventListener('fullscreenchange', onFullChange);
    return () => document.removeEventListener('fullscreenchange', onFullChange);
  }, []);

  async function toggleFullscreen() {
    try {
      const el = containerRef.current;
      if (!el) return;
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {}
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="flex items-end gap-6 justify-center mb-6">
        <div className="text-center">
          <div className="rounded-md border border-border-light p-6" style={{ height: 120, width: 180 }}>
            <div className="text-sm text-muted">2</div>
            <div className="font-bold text-xl">{entries[1]?.name ?? "-"}</div>
            <div className="text-sm text-muted">{entries[1]?.best_score ?? ""}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="rounded-md border border-border-light p-6 bg-accent/10" style={{ height: 160, width: 220 }}>
            <div className="text-sm text-muted">1</div>
            <div className="font-bold text-2xl">{entries[0]?.name ?? "-"}</div>
            <div className="text-sm text-muted">{entries[0]?.best_score ?? ""}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="rounded-md border border-border-light p-6" style={{ height: 120, width: 180 }}>
            <div className="text-sm text-muted">3</div>
            <div className="font-bold text-xl">{entries[2]?.name ?? "-"}</div>
            <div className="text-sm text-muted">{entries[2]?.best_score ?? ""}</div>
          </div>
        </div>
      </div>

      {/* fullscreen icon top-right inside component */}
      <div className="absolute top-0 right-0 mt-[-8px] mr-[-8px]">
        <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'} className="inline-flex items-center justify-center rounded-full p-2 bg-bg border border-border-light dark:bg-surface dark:border-border-dark">
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <div className="mt-8">
        <Leaderboard entries={entries} limit={50} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [hours, setHours] = useState("4");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    function onUpdate(payload: TimerState) {
      setTimer(payload);
    }
    socket.on("timer:update", onUpdate);
    socket.emit("timer:request_sync");
    loadUsers();
    return () => {
      socket.off("timer:update", onUpdate);
    };
  }, []);

  function loadUsers() {
    api
      .get<UsersResponse>("/admin/users")
      .then((res) => setUsers(res.users))
      .catch(() => setUsers([]));
  }

  async function withBusy(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  const start = () => withBusy(() => api.post("/admin/timer/start"));
  const pause = () => withBusy(() => api.post("/admin/timer/pause"));
  const reset = () => withBusy(() => api.post("/admin/timer/reset"));
  const applyDuration = () =>
    withBusy(() => api.post("/admin/timer/duration", { durationMs: Number(hours) * 3600 * 1000 }));

  const exportCsv = () => api.download("/export/leaderboard.csv", "ragathon-leaderboard.csv");
  const exportPdf = () => api.download("/export/report.pdf", "ragathon-report.pdf");
  const exportDb = () => api.download("/export/database", "ragathon.db");
  const exportFull = () => api.download("/export/full", `ragathon_export.zip`);

  const [activeTab, setActiveTab] = useState<"users"|"submissions"|"timer"|"export"|"leaderboard"|"settings">("timer");
  const [toast, setToast] = useState<{message: string; type?: 'success'|'error'} | null>(null);
  const [sendStatus, setSendStatus] = useState<Record<string, 'idle'|'sending'|'sent'|'failed'>>({});
  const [smtpOk, setSmtpOk] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [editForm, setEditForm] = useState<{name:string; email:string; password:string}>({ name: '', email: '', password: '' });
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // settings state (dataset/github links + smtp/template)
  const [settings, setSettings] = useState<Record<string,string>>({});

  const location = useLocation();

  useEffect(() => {
    api.get<Record<string,string>>("/admin/settings").then((s) => setSettings(s)).catch(() => {});
  }, []);

  // update active tab when URL hash changes (navbar links use /admin#tab)
  useEffect(() => {
    const h = (location.hash || "").replace("#", "");
    if (h) setActiveTab(h as any);
  }, [location.hash]);

  function saveSettings(updated: Record<string,string>) {
    setSettings((prev) => ({...prev, ...updated}));
    return api.post("/admin/settings", updated);
  }

  async function uploadParticipants(file?: File) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file, file.name);
    const res = await api.post<{ created: { id: string; email: string; name: string; password: string }[] }>("/admin/users/upload", fd);
    // after upload, refresh list
    loadUsers();
    return res;
  }

  async function sendCredentials(userIds?: string[]) {
    await api.post("/admin/users/send", { userIds });
    // refresh pending state
    loadUsers();
  }

  async function saveEditedUser() {
    if (!editUser) return;
    try {
      setEditingUser(true);
      const payload: Record<string, string> = { name: editForm.name, email: editForm.email };
      if (editForm.password && editForm.password.trim().length > 0) payload.password = editForm.password;
      const identifier = (editUser as any).short_id || editUser.id;
      await api.put(`/admin/users/${identifier}`, payload);
      setToast({ message: 'User updated', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      setEditUser(null);
      loadUsers();
      setEditForm({ name: '', email: '', password: '' });
      setEditShowPassword(false);
    } catch (err) {
      setToast({ message: 'Update failed', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setEditingUser(false);
    }
  }

  async function performDeleteUser() {
    if (!deleteUserId) return;
    try {
      await api.post(`/admin/users/delete`, { id: deleteUserId });
      setToast({ message: 'User deleted', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      setDeleteUserId(null);
      if (editUser && (editUser.id === deleteUserId || (editUser as any).short_id === deleteUserId)) setEditUser(null);
      loadUsers();
    } catch (err:any) {
      // log details for easier debugging
      console.error('Failed to delete user', err?.response || err);
      const msg = err?.response?.data?.error || err?.message || 'Delete failed';
      setToast({ message: String(msg), type: 'error' });
      setTimeout(() => setToast(null), 5000);
      setDeleteUserId(null);
    }
  }

  async function sendCredentialsForUser(id: string) {
    try {
      setSendStatus((prev) => ({ ...prev, [id]: 'sending' }));
      await api.post('/admin/users/send', { userIds: [id] });
      setSendStatus((prev) => ({ ...prev, [id]: 'sent' }));
      loadUsers();
    } catch (err) {
      setSendStatus((prev) => ({ ...prev, [id]: 'failed' }));
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {toast && <Toast message={toast.message} type={toast.type === 'error' ? 'error' : 'success'} />}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
      </div>

      {/* Tabs moved to navbar; AdminDashboard relies on URL hash to pick the active section. */}

      {activeTab === 'timer' && (
        <section className="rounded-xl border border-border-light dark:border-border-dark p-6 mb-8">
          <h2 className="text-lg font-bold mb-6">{t("admin.timer_control_title")}</h2>

          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium mb-1.5">
                {t("admin.timer_duration_label")}
              </label>
              <input
                id="duration"
                type="number"
                min={0.5}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-32 rounded-md border border-border-light dark:border-border-dark bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              type="button"
              onClick={applyDuration}
              disabled={busy}
              className="rounded-md border border-border-light px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50"
            >
              {t("admin.timer_apply")}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className="btn-primary"
            >
              <Play size={16} aria-hidden="true" />
              {t("admin.timer_start")}
            </button>
            <button
              type="button"
              onClick={pause}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50"
            >
              <Pause size={16} aria-hidden="true" />
              {t("admin.timer_pause")}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50"
            >
              <RotateCcw size={16} aria-hidden="true" />
              {t("admin.timer_reset")}
            </button>
          </div>

          {timer && (
            <p className="text-sm text-muted">
              Status: <span className="font-semibold">{timer.status}</span> &middot; Remaining: {" "}
              <span className="font-mono">{Math.round(timer.remaining_ms / 1000)}s</span>
            </p>
          )}
        </section>
      )}

      {activeTab === 'export' && (
        <section className="rounded-xl border border-border-light dark:border-border-dark p-6 mb-8">
          <h2 className="text-lg font-bold mb-6">{t("admin.data_management_title")}</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
            >
              <FileSpreadsheet size={16} aria-hidden="true" />
              {t("admin.export_leaderboard")}
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
            >
              <FileText size={16} aria-hidden="true" />
              {t("admin.export_report")}
            </button>
            <button
              type="button"
              onClick={exportDb}
              className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
            >
              <Database size={16} aria-hidden="true" />
              {t("admin.export_database")}
            </button>
            <button
              type="button"
              onClick={exportFull}
              className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark"
            >
              <FileText size={16} aria-hidden="true" />
              Export full data
            </button>
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <section className="rounded-xl border border-border-light dark:border-border-dark p-6">
          <h2 className="text-lg font-bold mb-6">{t("admin.users_title")}</h2>
          <div className="mb-4 flex items-center gap-3">
          <input type="file" accept=".xlsx,.xls" id="upload-file" className="sr-only" onChange={(e)=>{
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) {
              uploadParticipants(f).then((r:any)=>{
                if (r?.created?.length) {
                  setToast({ message: `Created ${r.created.length} users`, type: 'success' });
                  setTimeout(()=>setToast(null), 3500);
                }
              });
            }
          }} />
          <label htmlFor="upload-file" className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-surface-light dark:hover:bg-surface-dark">
            <FileSpreadsheet size={16} /> Upload participants
          </label>
          <button onClick={() => sendCredentials()} disabled={!settings['gmail_user'] || !settings['gmail_pass'] || !smtpOk} className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:text-muted" title={!settings['gmail_user'] || !settings['gmail_pass'] ? 'Fill SMTP settings' : (!smtpOk ? 'Test SMTP in Settings first' : '')}>Send all</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark">
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">ID</th>
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">{t("admin.user_name")}</th>
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">{t("admin.user_email")}</th>
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">{t("admin.user_role")}</th>
                  <th className="py-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("admin.user_submissions")}</th>
                  <th className="py-2 text-xs font-semibold uppercase tracking-wide text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border-light dark:border-border-dark last:border-0">
                    <td className="py-3 pr-4 text-sm font-mono text-sm font-medium">{u.short_id || u.id.slice(0,4)}</td>
                    <td className="py-3 pr-4 text-sm font-medium">{u.name}</td>
                    <td className="py-3 pr-4 text-sm text-muted">{u.email}</td>
                    <td className="py-3 pr-4 text-sm"><span className="pill pill-accent px-2 py-0.5">{u.role}</span></td>
                    <td className="py-3 text-sm tabular-nums">{u.submissions.length}</td>
                    <td className="py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {sendStatus[u.id] === 'sending' ? (
                          <button className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled>Sending</button>
                        ) : sendStatus[u.id] === 'sent' ? (
                          <button className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled>Sent</button>
                        ) : sendStatus[u.id] === 'failed' ? (
                          <button onClick={() => sendCredentialsForUser(u.id)} disabled={!settings['gmail_user'] || !settings['gmail_pass'] || !smtpOk} className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-1 text-sm transition-colors hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:text-muted">Retry</button>
                        ) : (
                        <button onClick={() => sendCredentialsForUser(u.id)} disabled={!settings['gmail_user'] || !settings['gmail_pass'] || !smtpOk} className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-1 text-sm transition-colors hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:text-muted" title={!settings['gmail_user'] || !settings['gmail_pass'] ? 'Fill SMTP settings' : (!smtpOk ? 'Test SMTP in Settings first' : '')}>Send</button>
                        )}

                        <button onClick={() => { setEditUser(u); setEditForm({ name: u.name, email: u.email, password: (u as any).plain_password || '' }); }} className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-1 text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">Edit</button>

                        <button onClick={() => setDeleteUserId((u.short_id as any) || u.id)} className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-1 text-sm text-danger hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setEditUser(null)} />
              <div className="relative bg-bg dark:bg-surface rounded-lg p-6 max-w-md w-full z-10">
                <h3 className="text-lg font-bold mb-4">Edit user</h3>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input className="w-full rounded-md border border-border-light px-3 py-2 mb-3" value={editForm.name} onChange={(e)=>setEditForm(prev=>({...prev,name:e.target.value}))} />
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="w-full rounded-md border border-border-light px-3 py-2 mb-3" value={editForm.email} onChange={(e)=>setEditForm(prev=>({...prev,email:e.target.value}))} />
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative mb-4">
                  <input type={editShowPassword? 'text' : 'password'} placeholder="Input password" className="w-full rounded-md border border-border-light px-4 py-2 pr-12" value={editForm.password} onChange={(e)=>setEditForm(prev=>({...prev,password:e.target.value}))} />
                  <button type="button" onClick={()=>setEditShowPassword(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted px-2 py-1" aria-label={editShowPassword? 'Hide password' : 'Show password'}>
                    {editShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={()=>setEditUser(null)} className="btn-secondary">Cancel</button>
                  <button onClick={saveEditedUser} disabled={editingUser} className="btn-primary">Save</button>
                  <button onClick={()=>{ if(editUser) setDeleteUserId((editUser as any).short_id || editUser.id); }} className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-1 text-sm text-danger hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">Delete</button>
                </div>
              </div>
            </div>
          )}

          {deleteUserId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteUserId(null)} />
              <div className="relative bg-bg dark:bg-surface rounded-lg p-6 max-w-sm w-full z-10">
                <h3 className="text-lg font-bold mb-2">Confirm deletion</h3>
                <p className="text-sm text-muted mb-4">Are you sure you want to delete "{users.find(u => u.id === deleteUserId || u.short_id === deleteUserId)?.name || 'this user'}"? This action cannot be undone.</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setDeleteUserId(null)} className="inline-flex items-center justify-center min-w-[88px] rounded-md border border-border-light px-3 py-2 text-sm btn-secondary">Cancel</button>
                  <button onClick={performDeleteUser} className="inline-flex items-center justify-center min-w-[88px] rounded-md border border-border-light px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-red-50 dark:hover:bg-red-900">Delete</button>
                </div>
              </div>
            </div>
          )}

        </section>
      )}

      {activeTab === 'submissions' && (
        <section className="rounded-xl border border-border-light dark:border-border-dark p-6 mb-8">
          <h2 className="text-lg font-bold mb-6">Submissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Dataset link</label>
              <input className="w-full rounded-md border border-border-light px-3 py-2" value={settings['dataset_link']||''} onChange={(e)=>setSettings(prev=>({...prev,dataset_link:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">GitHub template</label>
              <input className="w-full rounded-md border border-border-light px-3 py-2" value={settings['github_template']||''} onChange={(e)=>setSettings(prev=>({...prev,github_template:e.target.value}))} />
            </div>
          </div>
          <div className="mt-4">
            <button className="btn-primary" onClick={()=>saveSettings({dataset_link: settings['dataset_link']||'', github_template: settings['github_template']||''})}>Save</button>
          </div>
        </section>
      )}

      {activeTab === 'leaderboard' && (
        <section className="rounded-xl border border-border-light dark:border-border-dark p-6 mb-8">
          <h2 className="text-lg font-bold mb-6">Leaderboard</h2>
          <LeaderboardPreview />
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="rounded-xl border border-border-light dark:border-border-dark p-6 mb-8">
          <h2 className="text-lg font-bold mb-6">Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Gmail app username</label>
              <input className="w-full rounded-md border border-border-light px-3 py-2" value={settings['gmail_user']||''} onChange={(e)=>setSettings(prev=>({...prev,gmail_user:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Gmail app password</label>
              <input className="w-full rounded-md border border-border-light px-3 py-2" value={settings['gmail_pass']||''} onChange={(e)=>setSettings(prev=>({...prev,gmail_pass:e.target.value}))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Email template</label>
              <textarea className="w-full rounded-md border border-border-light px-3 py-2" rows={6} value={settings['email_template']||''} onChange={(e)=>setSettings(prev=>({...prev,email_template:e.target.value}))} />
            </div>
          </div>
          <div className="mt-4">
            <button className="btn-primary" onClick={async ()=>{
              await saveSettings({gmail_user: settings['gmail_user']||'', gmail_pass: settings['gmail_pass']||'', email_template: settings['email_template']||''});
              try {
                await api.post('/admin/settings/test-smtp');
                setSmtpOk(true);
                setToast({message: 'SMTP connection OK', type: 'success'});
                setTimeout(()=>setToast(null), 3000);
              } catch (err) {
                setSmtpOk(false);
                setToast({message: 'SMTP test failed', type: 'error'});
                setTimeout(()=>setToast(null), 3000);
              }
            }}>Save settings</button>
          </div>
        </section>
      )}
    </main>
  );
}
