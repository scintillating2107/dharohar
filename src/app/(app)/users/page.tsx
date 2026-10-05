"use client";

import { useState } from "react";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { useLocale } from "@/contexts/LocaleContext";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { RolePermissionsMatrix } from "@/components/users/RolePermissionsMatrix";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { formatRole, formatDateShort, formatDate } from "@/lib/utils";
import type { User, UserRole } from "@/types";

const ROLES: UserRole[] = ["ADMIN", "VERIFICATION_OFFICER", "DATA_OFFICER", "SURVEY_OFFICER", "CITIZEN"];
const EMPTY = { name: "", email: "", password: "", role: "DATA_OFFICER" as UserRole, district: "", phone: "" };

async function patchUser(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Update failed");
  return json.data.user as User;
}

export default function UsersPage() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const { t } = useLocale();
  const { data, error, initialLoading, reload } = useApi<{ users: User[] }>("/api/users");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<User | null>(null);
  const [edit, setEdit] = useState({ role: "DATA_OFFICER" as UserRole, district: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      await apiPost("/api/users", form);
      toast("User created", "success");
      setShowCreate(false);
      setForm(EMPTY);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create user", "error");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setEdit({ role: u.role, district: u.district ?? "", phone: u.phone ?? "", password: "" });
  };

  const saveEdit = async (extra: Record<string, unknown> = {}) => {
    if (!editing) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = { role: edit.role, district: edit.district, phone: edit.phone, ...extra };
      if (edit.password) body.password = edit.password;
      await patchUser(editing.id, body);
      toast("User updated", "success");
      setEditing(null);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout title="Users">
      <div className="space-y-6">
        <PageTitle
          title="Users"
          description="Officer accounts, roles, district assignment and access."
          actions={<Button onClick={() => setShowCreate(true)}>{t("Add user")}</Button>}
        />

        <Card title="All users">
          {initialLoading ? (
            <LoadingState />
          ) : !data ? (
            <ErrorState message={error || "Could not load users"} onRetry={reload} />
          ) : (
            <DataTable
              keyField="id"
              data={data.users}
              columns={[
                { key: "name", header: "Name", sortable: true },
                { key: "email", header: "Email", sortable: true },
                { key: "role", header: "Role", sortable: true, render: (u) => <Badge variant="info">{t(formatRole(u.role))}</Badge> },
                { key: "district", header: "District", render: (u) => (u.district ? t(u.district) : "—") },
                { key: "active", header: "Status", render: (u) => (u.active === false ? <Badge variant="error">{t("Deactivated")}</Badge> : <Badge variant="success">{t("Active")}</Badge>) },
                { key: "lastLoginAt", header: "Last sign-in", render: (u) => (u.lastLoginAt ? formatDate(u.lastLoginAt) : "—") },
                { key: "createdAt", header: "Created", sortable: true, sortValue: (u) => u.createdAt, render: (u) => formatDateShort(u.createdAt) },
              ]}
              onRowClick={openEdit}
              emptyTitle="No users"
            />
          )}
        </Card>

        <Card title="Roles & permissions">
          <RolePermissionsMatrix />
        </Card>
      </div>

      <Modal
        open={showCreate}
        title="Create user"
        onClose={() => setShowCreate(false)}
        wide
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("Cancel")}</Button>
            <Button onClick={create} loading={busy}>{t("Create")}</Button>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Initial password" hint="At least 8 characters with letters and numbers">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {ROLES.map((r) => <option key={r} value={r}>{t(formatRole(r))}</option>)}
            </Select>
          </Field>
          <Field label="District"><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
          <Field label="Mobile (for SMS alerts)"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        title={editing ? `${editing.name} (${editing.email})` : ""}
        onClose={() => setEditing(null)}
        wide
        footer={
          editing && (
            <>
              {editing.id !== me?.id && (
                <Button variant={editing.active === false ? "outline" : "danger"} loading={busy} onClick={() => saveEdit({ active: editing.active === false })}>
                  {editing.active === false ? t("Reactivate") : t("Deactivate")}
                </Button>
              )}
              <Button variant="outline" loading={busy} onClick={() => saveEdit({ unlock: true })}>{t("Unlock sign-in")}</Button>
              <Button onClick={() => saveEdit()} loading={busy}>{t("Save")}</Button>
            </>
          )
        }
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Role">
            <Select value={edit.role} disabled={editing?.id === me?.id} onChange={(e) => setEdit({ ...edit, role: e.target.value as UserRole })}>
              {ROLES.map((r) => <option key={r} value={r}>{t(formatRole(r))}</option>)}
            </Select>
          </Field>
          <Field label="District"><Input value={edit.district} onChange={(e) => setEdit({ ...edit, district: e.target.value })} /></Field>
          <Field label="Mobile"><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
          <Field label="Reset password" hint="Leave empty to keep the current password">
            <Input type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </AppLayout>
  );
}
