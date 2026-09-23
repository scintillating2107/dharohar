"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/States";
import { useToast } from "@/contexts/ToastContext";
import { apiGet, apiPost } from "@/lib/api-client";
import { formatRole, formatDateShort } from "@/lib/utils";
import type { User, UserRole } from "@/types";

const ROLES: UserRole[] = ["ADMIN", "VERIFICATION_OFFICER", "DATA_OFFICER", "SURVEY_OFFICER"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "DATA_OFFICER" as UserRole,
    district: "Lucknow",
  });
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    apiGet<{ users: User[] }>("/api/users")
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createUser = async () => {
    setCreating(true);
    try {
      await apiPost("/api/users", form);
      toast("User created successfully", "success");
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "DATA_OFFICER", district: "Lucknow" });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create user", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout title="User Management">
      <div className="space-y-6">
        <PageHeader
          title="System Users"
          description="Manage platform users and role-based access."
          action={<Button size="sm" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add User"}</Button>}
        />

        {showForm && (
          <Card title="Create User">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Input placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm sm:col-span-2"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>{formatRole(role)}</option>
                ))}
              </select>
            </div>
            <Button className="mt-4" loading={creating} onClick={createUser}>Create User</Button>
          </Card>
        )}

        <Card title="All Users">
          {loading ? (
            <LoadingState />
          ) : (
            <DataTable
              keyField="id"
              data={users}
              columns={[
                { key: "name", header: "Name", sortable: true },
                { key: "email", header: "Email", sortable: true },
                { key: "role", header: "Role", sortable: true, render: (u) => <Badge variant="info">{formatRole(u.role)}</Badge> },
                { key: "district", header: "District", sortable: true, render: (u) => u.district || "—" },
                { key: "createdAt", header: "Created", sortable: true, sortValue: (u) => u.createdAt, render: (u) => formatDateShort(u.createdAt) },
              ]}
              emptyTitle="No users found"
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
