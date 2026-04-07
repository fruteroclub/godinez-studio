import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useAdminOverview,
  useAdminWorkspaces,
  useAdminInstances,
  useAdminGrowth,
  useAdminUsage,
  useAdminAlerts,
  useAdminCapacity,
  useAdminAgentActivity,
  useAdminUsers,
  useUpdateUserRole,
  useInstanceHealth,
  useCreateInstance,
  useUpdateInstance,
} from "@/hooks/use-admin";
import { content } from "@/lib/content";
import Errors from "./admin/Errors";
import { PageSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import type { AdminInstanceRow } from "@godinez/types";

const { admin } = content.studio;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const statusColors: Record<string, string> = {
  active: "text-green-400",
  offline: "text-red-400",
  draining: "text-yellow-400",
  decommissioned: "text-gray-400",
};

// --- Alerts Banner ---

function AlertsBanner() {
  const { data: alerts } = useAdminAlerts();
  if (!alerts?.length) return null;

  return (
    <section className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            alert.level === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
          }`}
        >
          <span className="mt-0.5 text-base">{alert.level === "error" ? "!!!" : "(!)"}</span>
          <div>
            <p className="font-medium">{alert.message}</p>
            <p className="mt-0.5 text-xs opacity-70">
              {alert.condition} — {new Date(alert.timestamp).toLocaleTimeString("es-MX")}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

// --- Section 1: Overview Cards ---

function OverviewSection() {
  const { data: stats, isLoading } = useAdminOverview();

  if (isLoading) return <PageSkeleton />;
  if (!stats) return null;

  const cards = [
    { label: admin.totalWorkspaces, value: stats.workspaces.total },
    { label: admin.totalUsers, value: stats.users },
    { label: admin.activeAgents, value: stats.agents.active },
    { label: admin.totalMessages, value: stats.messages },
    { label: admin.storage, value: formatBytes(stats.storageBytes) },
  ];

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">
        {admin.overview}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
          >
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Section 2: Instance Health Table + Create Form ---

function InstanceRow({ instance }: { instance: AdminInstanceRow }) {
  const [expanded, setExpanded] = useState(false);
  const { data: health } = useInstanceHealth(expanded ? instance.id : null);
  const updateInstance = useUpdateInstance();

  const isOffline = instance.status === "offline";
  const canReactivate = isOffline || instance.status === "draining";
  const canDeactivate = instance.status === "active";
  const showRecoveryHint = isOffline && health?.gatewayReachable;

  return (
    <>
      <tr
        className="cursor-pointer border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
          {expanded ? "▼" : "▶"} {instance.name}
        </td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              instance.tier === "dedicated"
                ? "bg-violet/20 text-violet"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
            }`}
          >
            {instance.tier}
          </span>
        </td>
        <td className={`px-4 py-3 text-sm font-medium ${statusColors[instance.status] ?? ""}`}>
          {instance.status}
        </td>
        <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
          {instance.usedSlots}/{instance.maxSlots}
        </td>
        <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
          {instance.utilizationPercent}%
        </td>
        <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
          {instance.region ?? "—"}
        </td>
        <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
          {instance.customerId ?? "—"}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-[hsl(var(--muted))]/10 px-8 py-4">
            {!health ? (
              <ListSkeleton rows={2} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    Gateway:{" "}
                    <span className={health.gatewayReachable ? "text-green-400" : "text-red-400"}>
                      {health.gatewayReachable ? admin.reachable : admin.unreachable}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    {canReactivate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateInstance.mutate({ id: instance.id, status: "active" });
                        }}
                        disabled={updateInstance.isPending}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50"
                      >
                        {updateInstance.isPending ? "..." : admin.activate}
                      </button>
                    )}
                    {canDeactivate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateInstance.mutate({ id: instance.id, status: "offline" });
                        }}
                        disabled={updateInstance.isPending}
                        className="rounded-md bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                      >
                        {updateInstance.isPending ? "..." : admin.deactivate}
                      </button>
                    )}
                  </div>
                </div>
                {showRecoveryHint && (
                  <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
                    {admin.recoveryHint}
                  </div>
                )}
                {updateInstance.error && (
                  <p className="text-sm text-red-400">{updateInstance.error.message}</p>
                )}
                {health.workspaces.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[hsl(var(--muted-foreground))]">
                        <th className="pb-1 pr-4">{admin.workspace}</th>
                        <th className="pb-1 pr-4">{admin.owner}</th>
                        <th className="pb-1 pr-4">{admin.agent}</th>
                        <th className="pb-1">{admin.lastActivity}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {health.workspaces.map((ws) => (
                        <tr key={ws.id} className="text-[hsl(var(--foreground))]">
                          <td className="pr-4 py-1">{ws.name}</td>
                          <td className="pr-4 py-1">{ws.ownerEmail ?? "—"}</td>
                          <td className="pr-4 py-1">{ws.agentStatus ?? "—"}</td>
                          <td className="py-1">
                            {ws.lastMessageAt
                              ? new Date(ws.lastMessageAt).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Sin espacios asignados
                  </p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CreateInstanceForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [tier, setTier] = useState<"shared" | "dedicated">("shared");
  const [maxSlots, setMaxSlots] = useState(25);
  const [workspaceBase, setWorkspaceBase] = useState("/home/openclaw/.openclaw/workspaces");
  const [region, setRegion] = useState("us-east-1");
  const createInstance = useCreateInstance();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInstance.mutate(
      { name, url, token, tier, maxSlots, workspaceBase, region },
      { onSuccess: () => onClose() },
    );
  };

  const inputClass =
    "w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-magenta";

  return (
    <form onSubmit={handleSubmit} className="border-t border-[hsl(var(--border))] p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-[hsl(var(--muted-foreground))]">
            {admin.name}
          </label>
          <input
            className={inputClass}
            placeholder={admin.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[hsl(var(--muted-foreground))]">
            {admin.url}
          </label>
          <input
            className={inputClass}
            placeholder={admin.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[hsl(var(--muted-foreground))]">
            {admin.token}
          </label>
          <input
            className={inputClass}
            type="password"
            placeholder={admin.tokenPlaceholder}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[hsl(var(--muted-foreground))]">
            {admin.workspaceBase}
          </label>
          <input
            className={inputClass}
            placeholder={admin.workspaceBasePlaceholder}
            value={workspaceBase}
            onChange={(e) => setWorkspaceBase(e.target.value)}
            required
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[hsl(var(--muted-foreground))]">
              {admin.tier}
            </label>
            <select
              className={inputClass}
              value={tier}
              onChange={(e) => setTier(e.target.value as "shared" | "dedicated")}
            >
              <option value="shared">shared</option>
              <option value="dedicated">dedicated</option>
            </select>
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs text-[hsl(var(--muted-foreground))]">
              {admin.maxSlots}
            </label>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={maxSlots}
              onChange={(e) => setMaxSlots(Number(e.target.value))}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[hsl(var(--muted-foreground))]">
              {admin.region}
            </label>
            <input
              className={inputClass}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
        </div>
      </div>
      {createInstance.error && (
        <p className="text-sm text-red-400">{createInstance.error.message}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          {admin.cancel}
        </button>
        <button
          type="submit"
          disabled={createInstance.isPending}
          className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
        >
          {createInstance.isPending ? "..." : admin.save}
        </button>
      </div>
    </form>
  );
}

function InstancesSection() {
  const { data: instances, isLoading } = useAdminInstances();
  const [showForm, setShowForm] = useState(false);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
          {admin.instances}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-magenta px-3 py-1.5 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
        >
          {admin.addInstance}
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {isLoading ? (
          <div className="p-4">
            <ListSkeleton rows={3} />
          </div>
        ) : !instances?.length && !showForm ? (
          <p className="p-4 text-sm text-[hsl(var(--muted-foreground))]">{admin.noInstances}</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))]">
                <th className="px-4 py-3">{admin.instance}</th>
                <th className="px-4 py-3">{admin.tier}</th>
                <th className="px-4 py-3">{admin.status}</th>
                <th className="px-4 py-3">{admin.slots}</th>
                <th className="px-4 py-3">{admin.utilization}</th>
                <th className="px-4 py-3">{admin.region}</th>
                <th className="px-4 py-3">{admin.customer}</th>
              </tr>
            </thead>
            <tbody>
              {instances?.map((inst) => (
                <InstanceRow key={inst.id} instance={inst} />
              ))}
            </tbody>
          </table>
        )}
        {showForm && <CreateInstanceForm onClose={() => setShowForm(false)} />}
      </div>
    </section>
  );
}

// --- Section 3: Workspace Table ---

function WorkspacesSection() {
  const [cursor, setCursor] = useState<number | undefined>();
  const { data, isLoading } = useAdminWorkspaces(cursor);

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">
        {admin.workspacesSection}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {isLoading ? (
          <div className="p-4">
            <ListSkeleton rows={5} />
          </div>
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))]">
                  <th className="px-4 py-3">{admin.workspace}</th>
                  <th className="px-4 py-3">{admin.owner}</th>
                  <th className="px-4 py-3">{admin.status}</th>
                  <th className="px-4 py-3">{admin.members}</th>
                  <th className="px-4 py-3">{admin.messages}</th>
                  <th className="px-4 py-3">{admin.lastActivity}</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((ws) => (
                  <tr
                    key={ws.id}
                    className="border-b border-[hsl(var(--border))] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                      {ws.name}
                      <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
                        {ws.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {ws.ownerEmail ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ws.status === "active"
                            ? "bg-green-400/20 text-green-400"
                            : ws.status === "suspended"
                              ? "bg-red-400/20 text-red-400"
                              : "bg-yellow-400/20 text-yellow-400"
                        }`}
                      >
                        {ws.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {ws.memberCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {ws.messageCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {ws.lastActivity
                        ? new Date(ws.lastActivity).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.nextCursor && (
              <div className="border-t border-[hsl(var(--border))] p-3 text-center">
                <button
                  onClick={() => setCursor(data.nextCursor!)}
                  className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
                >
                  {admin.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// --- Section 4: Growth Chart ---

const LINE_COLORS = {
  newUsers: "#E91E8C",
  newWorkspaces: "#8B5CF6",
  newConversations: "#FFB800",
  messagesSent: "#22d3ee",
};

const LINE_LABELS: Record<string, string> = {
  newUsers: "Usuarios",
  newWorkspaces: "Espacios",
  newConversations: "Conversaciones",
  messagesSent: "Mensajes",
};

function GrowthSection() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const { data, isLoading } = useAdminGrowth(period);

  const periods = [
    { value: "7d" as const, label: admin.period7d },
    { value: "30d" as const, label: admin.period30d },
    { value: "90d" as const, label: admin.period90d },
  ];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
          {admin.growth}
        </h2>
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                period === p.value
                  ? "bg-magenta text-white"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data?.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              {(Object.keys(LINE_COLORS) as (keyof typeof LINE_COLORS)[]).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={LINE_LABELS[key]}
                  stroke={LINE_COLORS[key]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

// --- Section 5: Usage Table ---

function UsageSection() {
  const [period, setPeriod] = useState("30d");
  const { data, isLoading } = useAdminUsage(period);

  function fmtBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  function fmtTokens(tokens: number) {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return String(tokens);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["7d", "30d", "90d"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              period === p
                ? "bg-magenta text-white"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            {p === "7d" ? admin.period7d : p === "30d" ? admin.period30d : admin.period90d}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">{admin.workspace}</th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">{admin.owner}</th>
                <th className="px-4 py-3 text-right font-medium text-[hsl(var(--muted-foreground))]">Tokens</th>
                <th className="px-4 py-3 text-right font-medium text-[hsl(var(--muted-foreground))]">{admin.storage}</th>
                <th className="px-4 py-3 text-right font-medium text-[hsl(var(--muted-foreground))]">{admin.messages}</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((row) => (
                <tr key={row.id} className="border-b border-[hsl(var(--border))] last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-[hsl(var(--foreground))]">{row.name}</span>
                    <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">{row.tier}</span>
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{row.ownerEmail ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(var(--foreground))]">{fmtTokens(row.tokenUsage)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(var(--foreground))]">{fmtBytes(row.storageBytes)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(var(--foreground))]">{row.messageCount}</td>
                </tr>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Section: Users ---

function UsersSection() {
  const [cursor, setCursor] = useState<number | undefined>();
  const { data, isLoading } = useAdminUsers(cursor);
  const updateRole = useUpdateUserRole();

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">
        {admin.users}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {isLoading ? (
          <div className="p-4"><ListSkeleton rows={5} /></div>
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))]">
                  <th className="px-4 py-3">{admin.name}</th>
                  <th className="px-4 py-3">{admin.email}</th>
                  <th className="px-4 py-3">{admin.role}</th>
                  <th className="px-4 py-3">{admin.workspace}</th>
                  <th className="px-4 py-3">{admin.agentStatus}</th>
                  <th className="px-4 py-3">{admin.lastActivity}</th>
                  <th className="px-4 py-3 text-right">{admin.avgMessages}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((u) => (
                  <tr key={u.id} className="border-b border-[hsl(var(--border))] last:border-0">
                    <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                      {u.name || "—"}
                      {u.jobRole && (
                        <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
                          {u.jobRole}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-magenta/20 text-magenta"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {u.workspaceName ? (
                        <span className="text-[hsl(var(--foreground))]">
                          {u.workspaceName}
                          <span className={`ml-2 text-xs ${
                            u.workspaceStatus === "active" ? "text-green-400" : "text-yellow-400"
                          }`}>
                            {u.workspaceStatus}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">{admin.noWorkspace}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {u.agentName ? (
                        <span className="text-[hsl(var(--foreground))]">
                          {u.agentName}
                          <span className={`ml-2 text-xs ${
                            u.agentStatus === "active" ? "text-green-400" :
                            u.agentStatus === "error" ? "text-red-400" : "text-yellow-400"
                          }`}>
                            {u.agentStatus}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">{admin.noAgent}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {u.lastMessageAt
                        ? new Date(u.lastMessageAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-[hsl(var(--foreground))]">
                      {u.avgMessagesPerDay}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => updateRole.mutate({
                          id: u.id,
                          role: u.role === "admin" ? "user" : "admin",
                        })}
                        disabled={updateRole.isPending}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                          u.role === "admin"
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            : "bg-magenta/10 text-magenta hover:bg-magenta/20"
                        }`}
                      >
                        {u.role === "admin" ? admin.removeAdmin : admin.makeAdmin}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.nextCursor && (
              <div className="border-t border-[hsl(var(--border))] p-3 text-center">
                <button
                  onClick={() => setCursor(data.nextCursor!)}
                  className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
                >
                  {admin.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// --- Main Admin Page ---

// --- Section: Capacity Planning ---

function CapacitySection() {
  const { data, isLoading } = useAdminCapacity();

  if (isLoading) return <PageSkeleton />;
  if (!data) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Capacidad</h2>

      {/* Aggregate stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Slots totales</p>
          <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
            {data.aggregate.usedSlots}/{data.aggregate.totalSlots}
          </p>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Utilización</p>
          <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
            {data.aggregate.utilization}%
          </p>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Slots libres</p>
          <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
            {data.projection.remainingSlots}
          </p>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Crecimiento semanal</p>
          <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
            +{data.projection.weeklyGrowthRate}
          </p>
        </div>
      </div>

      {/* Projection banner */}
      {data.projection.daysUntilFull !== null && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          data.projection.daysUntilFull < 14
            ? "border-red-500/30 bg-red-500/10 text-red-400"
            : data.projection.daysUntilFull < 30
              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
              : "border-blue-500/30 bg-blue-500/10 text-blue-400"
        }`}>
          Capacidad compartida se llena en ~{data.projection.daysUntilFull} días al ritmo actual
        </div>
      )}

      {/* Per-instance utilization */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">Por instancia</h3>
        <div className="space-y-2">
          {data.instances.map((inst) => (
            <div key={inst.id} className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${statusColors[inst.status] ?? "text-gray-400"}`}>
                    {inst.name}
                  </span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {inst.tier} · {inst.region}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-[hsl(var(--muted))]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      inst.utilization > 80 ? "bg-red-500" :
                      inst.utilization > 60 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${inst.utilization}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-[hsl(var(--foreground))] tabular-nums">
                {inst.usedSlots}/{inst.maxSlots}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Token consumption chart */}
      {data.trends.dailyTokens.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
            Consumo de tokens (30d)
          </h3>
          <div className="h-64 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trends.dailyTokens}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="tokens" stroke="#E91E8C" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}

// --- Section: Agent Activity ---

function AgentActivitySection() {
  const { data, isLoading } = useAdminAgentActivity();

  if (isLoading) return <PageSkeleton />;
  if (!data) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Actividad de agentes</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Agentes activos</p>
          <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">{data.summary.activeAgents}</p>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Eventos (30d)</p>
          <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">{data.summary.totalEvents.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Tokens (30d)</p>
          <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">{data.summary.totalTokens.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Errores (30d)</p>
          <p className={`mt-1 text-2xl font-semibold ${data.summary.errorCount > 0 ? "text-red-400" : "text-[hsl(var(--foreground))]"}`}>
            {data.summary.errorCount}
          </p>
        </div>
      </div>

      {/* Daily events chart */}
      {data.dailyEvents.length > 0 && (
        <div className="h-64 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.dailyEvents}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="events" name="Eventos" stroke="#8B5CF6" dot={false} />
              <Line type="monotone" dataKey="tokens" name="Tokens" stroke="#FFB800" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Agent table */}
      {data.agents.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))]">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(var(--muted))]">
              <tr>
                <th className="px-4 py-2 text-left text-[hsl(var(--muted-foreground))]">Agent</th>
                <th className="px-4 py-2 text-left text-[hsl(var(--muted-foreground))]">Workspace</th>
                <th className="px-4 py-2 text-right text-[hsl(var(--muted-foreground))]">Eventos</th>
                <th className="px-4 py-2 text-right text-[hsl(var(--muted-foreground))]">Tokens</th>
                <th className="px-4 py-2 text-right text-[hsl(var(--muted-foreground))]">Errores</th>
                <th className="px-4 py-2 text-right text-[hsl(var(--muted-foreground))]">Ultima actividad</th>
              </tr>
            </thead>
            <tbody>
              {data.agents.map((a) => (
                <tr key={`${a.agentId}-${a.workspaceId}`} className="border-t border-[hsl(var(--border))]">
                  <td className="px-4 py-2 text-[hsl(var(--foreground))]">#{a.agentId}</td>
                  <td className="px-4 py-2 text-[hsl(var(--muted-foreground))]">#{a.workspaceId}</td>
                  <td className="px-4 py-2 text-right text-[hsl(var(--foreground))] tabular-nums">{a.totalEvents}</td>
                  <td className="px-4 py-2 text-right text-[hsl(var(--foreground))] tabular-nums">{a.totalTokens.toLocaleString()}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${a.errorCount > 0 ? "text-red-400" : "text-[hsl(var(--foreground))]"}`}>
                    {a.errorCount}
                  </td>
                  <td className="px-4 py-2 text-right text-[hsl(var(--muted-foreground))] text-xs">
                    {new Date(a.lastActivity).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const TABS = [
  { key: "overview", label: admin.overview },
  { key: "users", label: admin.users },
  { key: "instances", label: admin.instances },
  { key: "capacity", label: "Capacidad" },
  { key: "activity", label: "Actividad" },
  { key: "workspaces", label: admin.workspacesSection },
  { key: "growth", label: admin.growth },
  { key: "usage", label: admin.usage },
  { key: "errors", label: "Errores" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Admin() {
  const { data: user, isLoading } = useCurrentUser();
  const [tab, setTab] = useState<TabKey>("overview");

  if (isLoading) return <PageSkeleton />;
  if (user?.role !== "admin") return <Navigate to="/studio" replace />;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="border-b border-[hsl(var(--border))] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
            {admin.title}
          </h1>
          <Link
            to="/studio"
            className="rounded-md px-3 py-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            ← Studio
          </Link>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "bg-magenta text-white"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl space-y-8 p-6">
        <AlertsBanner />
        {tab === "overview" && <OverviewSection />}
        {tab === "users" && <UsersSection />}
        {tab === "instances" && <InstancesSection />}
        {tab === "capacity" && <CapacitySection />}
        {tab === "activity" && <AgentActivitySection />}
        {tab === "workspaces" && <WorkspacesSection />}
        {tab === "growth" && <GrowthSection />}
        {tab === "usage" && <UsageSection />}
        {tab === "errors" && <Errors />}
      </main>
    </div>
  );
}
