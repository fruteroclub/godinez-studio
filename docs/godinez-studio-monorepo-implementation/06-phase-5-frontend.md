# Phase 5: Frontend SPA (Vite + React)

**Effort:** 2 days
**Dependencies:** Phase 1 (API contract defined). Can run **in parallel** with Phases 3-4.
**Deliverable:** Complete Studio SPA with auth, workspace management, chat, projects, tasks, files

---

## Architecture

- **SPA with client-side routing** (react-router-dom)
- **Clerk React SDK** for auth (not Next.js SDK)
- **TanStack React Query** for server state
- **EventSource** for SSE chat streaming
- **Tailwind CSS 4** with godinez-ai brand tokens
- **No SSR** — Vite builds static assets, served from CDN

```
apps/web/src/
├── main.tsx                    # React root + providers
├── App.tsx                     # Router definition
├── index.css                   # Tailwind imports + brand CSS vars
├── lib/
│   ├── api.ts                  # Typed fetch wrapper for backend
│   ├── sse.ts                  # EventSource helper for chat streaming
│   └── content.ts              # UI strings (migrated from godinez-ai)
├── hooks/
│   ├── use-auth.ts             # Clerk auth state + token
│   ├── use-workspace.ts        # Current workspace context
│   ├── use-chat.ts             # Core: send message + stream response
│   ├── use-conversations.ts    # Conversation list query
│   ├── use-projects.ts         # Project list/detail queries
│   ├── use-tasks.ts            # Task queries + mutations
│   └── use-files.ts            # File list + upload mutation
├── components/
│   ├── layout/
│   │   ├── Shell.tsx           # Sidebar + topbar + content area
│   │   ├── Sidebar.tsx         # Navigation + workspace branding
│   │   └── TopBar.tsx          # Breadcrumbs + mobile menu
│   ├── chat/
│   │   ├── ChatView.tsx        # Message list + input
│   │   ├── MessageBubble.tsx   # User/agent message display
│   │   ├── MessageInput.tsx    # Text input + send button
│   │   └── StreamingMessage.tsx # Live-typing indicator
│   ├── projects/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectDetail.tsx
│   │   └── CreateProjectForm.tsx
│   ├── tasks/
│   │   ├── TaskBoard.tsx       # Kanban columns
│   │   ├── TaskCard.tsx
│   │   └── CreateTaskForm.tsx
│   ├── files/
│   │   ├── FileList.tsx
│   │   └── UploadForm.tsx
│   ├── team/
│   │   ├── TeamList.tsx
│   │   └── InviteForm.tsx
│   ├── settings/
│   │   └── WorkspaceSettings.tsx
│   ├── auth/
│   │   └── ProtectedRoute.tsx  # Clerk auth guard
│   └── ui/
│       ├── Skeleton.tsx        # Loading skeletons
│       ├── EmptyState.tsx      # Empty list placeholder
│       └── ErrorBoundary.tsx   # Error boundary wrapper
├── pages/
│   ├── SignIn.tsx
│   ├── SignUp.tsx
│   ├── WorkspaceSelector.tsx   # /studio — select or create workspace
│   ├── Dashboard.tsx           # /studio/:slug — overview
│   ├── Chat.tsx                # /studio/:slug/chat
│   ├── ChatConversation.tsx    # /studio/:slug/chat/:conversationId
│   ├── Projects.tsx            # /studio/:slug/projects
│   ├── ProjectDetail.tsx       # /studio/:slug/projects/:id
│   ├── Tasks.tsx               # /studio/:slug/tasks
│   ├── Files.tsx               # /studio/:slug/files
│   ├── Agents.tsx              # /studio/:slug/agents
│   ├── Activity.tsx            # /studio/:slug/activity
│   ├── Team.tsx                # /studio/:slug/team
│   └── Settings.tsx            # /studio/:slug/settings
└── providers/
    ├── ClerkProvider.tsx        # Clerk setup
    ├── QueryProvider.tsx        # React Query client
    └── WorkspaceProvider.tsx    # Current workspace context
```

---

## Tickets

### P5-01: Setup providers and routing

Configure Clerk, React Query, and react-router-dom.

**`main.tsx`:**
```tsx
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './App'
import { queryClient } from './providers/QueryProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </ClerkProvider>
)
```

**`App.tsx` router:**
```tsx
export const router = createBrowserRouter([
  {
    path: '/sign-in/*',
    element: <SignIn />
  },
  {
    path: '/sign-up/*',
    element: <SignUp />
  },
  {
    path: '/studio',
    element: <ProtectedRoute><WorkspaceSelector /></ProtectedRoute>
  },
  {
    path: '/studio/:slug',
    element: <ProtectedRoute><Shell /></ProtectedRoute>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'chat', element: <Chat /> },
      { path: 'chat/:conversationId', element: <ChatConversation /> },
      { path: 'projects', element: <Projects /> },
      { path: 'projects/:projectId', element: <ProjectDetail /> },
      { path: 'tasks', element: <Tasks /> },
      { path: 'files', element: <Files /> },
      { path: 'agents', element: <Agents /> },
      { path: 'activity', element: <Activity /> },
      { path: 'team', element: <Team /> },
      { path: 'settings', element: <Settings /> },
    ]
  }
])
```

**Acceptance:**
- Clerk sign-in/sign-up pages render
- Protected routes redirect to sign-in when unauthenticated
- React Query devtools visible in development
- All routes resolve without errors

---

### P5-02: API client + auth token injection

Typed fetch wrapper that automatically includes Clerk JWT in requests.

**File:** `apps/web/src/lib/api.ts`

```typescript
import { useAuth } from '@clerk/clerk-react'

const API_URL = import.meta.env.VITE_API_URL || ''

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchOptions.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error || 'Request failed')
  }

  return res.json()
}
```

**Usage in hooks:**
```typescript
function useProjects(workspaceId: number) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<Project[]>(`/api/workspaces/${workspaceId}/projects`, { token })
    }
  })
}
```

**Acceptance:**
- All API calls include Clerk JWT
- 401 responses trigger sign-in redirect
- Type-safe request/response

---

### P5-03: Shell layout (sidebar + topbar + responsive)

Port the godinez-ai Studio shell to React SPA.

**Components:** `Shell.tsx`, `Sidebar.tsx`, `TopBar.tsx`

**Features:**
- Sidebar with nav items (same as godinez-ai: Dashboard, Chat, Projects, Agent, Tasks, Files, Activity, Team, Settings)
- Active state from `useLocation()` pathname
- Mobile: hamburger toggle, overlay sidebar, close on navigation
- TopBar: breadcrumbs from pathname, mobile menu button
- WorkspaceProvider: resolves workspace from `:slug` param, provides workspace context to children
- Clerk `<UserButton />` in sidebar

**Acceptance:**
- Desktop: fixed sidebar + scrollable content area
- Mobile (<1024px): hidden sidebar, hamburger menu, overlay
- Active nav item highlighted
- Breadcrumbs match current route

---

### P5-04: useChat hook + chat streaming UI

The core real-time feature. Implements optimistic send + SSE streaming.

**Hook:** `apps/web/src/hooks/use-chat.ts`

```typescript
export function useChat(conversationId: number, workspaceId: number) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const { getToken } = useAuth()

  // Load history on mount
  useEffect(() => { loadHistory() }, [conversationId])

  const sendMessage = useCallback(async (content: string) => {
    const token = await getToken()

    // 1. Optimistic: add user message
    setMessages(prev => [...prev, { id: tempId, role: 'user', content }])

    // 2. POST /api/chat/send
    const { runId } = await apiFetch('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ conversationId, workspaceId, content }),
      token,
    })

    // 3. Add empty agent message (will be filled by stream)
    setMessages(prev => [...prev, { id: agentTempId, role: 'agent', content: '', streaming: true }])
    setIsStreaming(true)

    // 4. Open SSE stream
    const es = new EventSource(`${API_URL}/api/chat/stream/${runId}`)

    es.addEventListener('delta', (e) => {
      const { text } = JSON.parse(e.data)
      setMessages(prev => prev.map(m =>
        m.id === agentTempId ? { ...m, content: text } : m
      ))
    })

    es.addEventListener('done', (e) => {
      const { text, messageId } = JSON.parse(e.data)
      setMessages(prev => prev.map(m =>
        m.id === agentTempId ? { ...m, id: messageId, content: text, streaming: false } : m
      ))
      setIsStreaming(false)
      es.close()
    })

    es.addEventListener('error', () => {
      setIsStreaming(false)
      es.close()
    })
  }, [conversationId, workspaceId])

  return { messages, sendMessage, isStreaming }
}
```

**Components:**
- `ChatView.tsx` — message list + input, auto-scroll to bottom
- `MessageBubble.tsx` — user (right-aligned, magenta) vs agent (left-aligned, card bg)
- `MessageInput.tsx` — text area + send button, disabled during streaming
- `StreamingMessage.tsx` — agent bubble with blinking cursor

**Acceptance:**
- Type message → appears immediately (optimistic)
- Agent response streams in token-by-token
- Blinking cursor during streaming
- History loads on conversation open
- Auto-scroll follows new messages

---

### P5-05: Workspace pages (selector, dashboard, settings)

**Pages:**
- `WorkspaceSelector.tsx` — list workspaces or create first one
- `Dashboard.tsx` — stats cards (projects, tasks, messages, agent status)
- `Settings.tsx` — rename workspace, view plan, delete (with confirmation)

**Queries:**
- `useWorkspaces()` — list user's workspaces
- `useDashboard(workspaceId)` — aggregate stats
- `useWorkspaceSettings(workspaceId)` — workspace detail for editing

**Acceptance:**
- New user → create workspace → redirected to dashboard
- Dashboard shows real counts
- Settings: rename works, delete requires slug confirmation

---

### P5-06: Projects pages

**Pages:**
- `Projects.tsx` — project list with create form
- `ProjectDetail.tsx` — project info + scoped nav (chat, tasks, files)

**Queries:**
- `useProjects(workspaceId)` — list projects
- `useProject(projectId)` — detail + stats

**Acceptance:**
- Create project → appears in list
- Detail page shows conversation/task/file counts
- Links to scoped chat/tasks/files work

---

### P5-07: Tasks page (kanban)

**Page:** `Tasks.tsx`

**Components:**
- `TaskBoard.tsx` — 3 columns: Pendiente, En progreso, Completada
- `TaskCard.tsx` — title, priority badge, click to advance status
- `CreateTaskForm.tsx` — inline form with priority selector

**Queries:**
- `useTasks(workspaceId, projectId?)` — list tasks
- `useUpdateTaskStatus()` — mutation to change status

**Acceptance:**
- Kanban columns populated from DB
- Click card → status advances → card moves to next column
- Create task with priority → appears in Pendiente column

---

### P5-08: Files page

**Page:** `Files.tsx`

**Components:**
- `FileList.tsx` — file rows with name, type, size, date
- `UploadForm.tsx` — file input + upload button

**Queries:**
- `useFiles(workspaceId, projectId?)` — list files
- `useUploadFile()` — mutation (FormData upload)

**Acceptance:**
- Upload file → appears in list
- Click file → opens in new tab (CDN URL)
- Shows formatted file size

---

### P5-09: Team page

**Page:** `Team.tsx`

**Components:**
- `TeamList.tsx` — member rows with avatar, email, role
- `InviteForm.tsx` — email input + role selector

**Queries:**
- `useMembers(workspaceId)` — list members
- `useInviteMember()` — mutation
- `useRemoveMember()` — mutation

**Acceptance:**
- Member list with roles
- Invite by email → member added
- Owner can change roles and remove members

---

### P5-10: Design system + Tailwind config

Port godinez-ai brand tokens to the Vite app.

**`apps/web/src/index.css`:**
- Import Tailwind base/components/utilities
- Define CSS variables matching godinez-ai globals.css
- Brand colors: magenta (`#E91E8C`), violet (`#8B5CF6`), gold (`#FFB800`)
- Dark theme by default
- shadcn-compatible HSL variables

**Typography:**
- Plus Jakarta Sans (headers + body)
- Playfair Display (emphasis only)
- Via `@fontsource` packages or Google Fonts CDN

**Acceptance:**
- UI visually matches godinez-ai Studio
- Dark theme with magenta/violet/gold accents
- Consistent spacing and typography
