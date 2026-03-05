import { useState } from "react";
import { Navigate } from "react-router-dom";
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
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useAdminOverview,
  useAdminWorkspaces,
  useAdminInstances,
  useAdminGrowth,
  useInstanceHealth,
} from "@/hooks/use-admin";
import { content } from "@/lib/content";
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

// --- Section 2: Instance Health Table ---

function InstanceRow({ instance }: { instance: AdminInstanceRow }) {
  const [expanded, setExpanded] = useState(false);
  const { data: health } = useInstanceHealth(expanded ? instance.id : null);

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
          <td colSpan={7} className="bg-[hsl(var(--muted))]/10 px-8 py-3">
            {!health ? (
              <ListSkeleton rows={2} />
            ) : (
              <div className="space-y-2">
                <p className="text-sm">
                  Gateway:{" "}
                  <span className={health.gatewayReachable ? "text-green-400" : "text-red-400"}>
                    {health.gatewayReachable ? admin.reachable : admin.unreachable}
                  </span>
                </p>
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

function InstancesSection() {
  const { data: instances, isLoading } = useAdminInstances();

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">
        {admin.instances}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {isLoading ? (
          <div className="p-4">
            <ListSkeleton rows={3} />
          </div>
        ) : !instances?.length ? (
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
              {instances.map((inst) => (
                <InstanceRow key={inst.id} instance={inst} />
              ))}
            </tbody>
          </table>
        )}
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

// --- Main Admin Page ---

export default function Admin() {
  const { slug } = useWorkspace();
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return <PageSkeleton />;
  if (user?.role !== "admin") return <Navigate to={`/studio/${slug}`} replace />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {admin.title}
      </h1>
      <OverviewSection />
      <InstancesSection />
      <WorkspacesSection />
      <GrowthSection />
    </div>
  );
}
