import fs from 'fs/promises';
import path from 'path';
import net from 'net';
import { spawn, type ChildProcess } from 'child_process';
import type { Request, Response } from 'express';
import { NEXUS_PREVIEW_BRIDGE_SCRIPT } from './websiteDeployer.ts';

export type WorkspaceTemplate = 'static' | 'react-vite' | 'fullstack-express';

export interface WorkspaceRuntime {
  sessionId: string;
  dir: string;
  port: number;
  pid?: number;
  command: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  proxyUrl: string;
  startedAt: number;
  logs: string[];
  process?: ChildProcess;
}

const WORKSPACES_ROOT = path.resolve(process.cwd(), 'workspaces');
const activeWorkspaces = new Map<string, WorkspaceRuntime>();
const inFlightStarts = new Map<string, Promise<Awaited<ReturnType<typeof startWorkspaceServerInternal>>>>();
const MAX_CONCURRENT_SUBSERVERS = 3; // Memory-safe for Render Free 512MB RAM

export function sanitizeSessionId(sessionId: string = 'default'): string {
  return String(sessionId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'default';
}

export function getWorkspaceDir(sessionId: string): string {
  return path.join(WORKSPACES_ROOT, sanitizeSessionId(sessionId));
}

async function allocateEphemeralPort(startPort = 4120, endPort = 4399): Promise<number> {
  const used = new Set(Array.from(activeWorkspaces.values()).map((w) => w.port));
  for (let p = startPort; p <= endPort; p++) {
    if (used.has(p)) continue;
    const available = await new Promise<boolean>((resolve) => {
      const srv = net.createServer();
      srv.once('error', () => resolve(false));
      srv.once('listening', () => {
        srv.close(() => resolve(true));
      });
      srv.listen(p, '127.0.0.1');
    });
    if (available) return p;
  }
  throw new Error('No free ephemeral port available for sandbox sub-server.');
}

export async function initSessionWorkspace(
  sessionId: string = 'default',
  template: WorkspaceTemplate = 'fullstack-express',
  appTitle: string = 'Sandboxed Nexus App'
): Promise<{
  success: boolean;
  sessionId: string;
  workspacePath: string;
  proxyUrl: string;
  template: WorkspaceTemplate;
  createdFiles: string[];
}> {
  const safeId = sanitizeSessionId(sessionId);
  const wsDir = getWorkspaceDir(safeId);
  await fs.mkdir(wsDir, { recursive: true });
  const createdFiles: string[] = [];

  const rootPkgRaw = await fs.readFile(path.resolve(process.cwd(), 'package.json'), 'utf-8').catch(() => '{}');
  const rootPkg = JSON.parse(rootPkgRaw || '{}');
  const sharedDeps = {
    react: rootPkg.dependencies?.react || '^19.0.1',
    'react-dom': rootPkg.dependencies?.['react-dom'] || '^19.0.1',
    'lucide-react': rootPkg.dependencies?.['lucide-react'] || '^0.546.0',
    clsx: rootPkg.dependencies?.clsx || '^2.1.1',
    'tailwind-merge': rootPkg.dependencies?.['tailwind-merge'] || '^3.7.0',
    motion: rootPkg.dependencies?.motion || '^12.23.24',
    express: rootPkg.dependencies?.express || '^4.21.2',
    cors: rootPkg.dependencies?.cors || '^2.8.6',
    vite: rootPkg.dependencies?.vite || '^8.3.0',
    '@vitejs/plugin-react': rootPkg.dependencies?.['@vitejs/plugin-react'] || '^6.1.1',
    '@tailwindcss/vite': rootPkg.dependencies?.['@tailwindcss/vite'] || '^4.3.3',
    firebase: rootPkg.dependencies?.firebase || '^13.3.0',
  };

  // Symlink root node_modules into workspace so modular React/Vite/Express apps boot immediately without npm install
  if (template !== 'static') {
    const wsNodeModules = path.join(wsDir, 'node_modules');
    const rootNodeModules = path.resolve(process.cwd(), 'node_modules');
    const hasNm = await fs.lstat(wsNodeModules).then(() => true).catch(() => false);
    if (!hasNm) {
      await fs.symlink(rootNodeModules, wsNodeModules, 'dir').catch(() => {});
    }
  }

  const modularTsConfig = JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        types: ['vite/client'],
        skipLibCheck: true,
        allowImportingTsExtensions: true,
        noEmit: true,
      },
      include: ['src', 'server', 'server.ts'],
    },
    null,
    2
  );

  const modularViteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/w/${safeId}/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    allowedHosts: true,
    hmr: false,
    ws: false,
    watch: null,
  },
});
`;

  const baseFrontendFiles: Record<string, string> = {
    'tsconfig.json': modularTsConfig,
    'vite.config.ts': modularViteConfig,
    'src/vite-env.d.ts': `/// <reference types="vite/client" />\n`,
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appTitle}</title>
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased">
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>
`,
    'src/main.tsx': `import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
`,
    'src/index.css': `@import "tailwindcss";\n`,
    'src/types.ts': `export type ActiveTab = 'overview' | 'explore' | 'settings';

export interface WorkspaceItem {
  id: string;
  title: string;
  category: string;
  status: 'active' | 'draft';
  updatedAt: string;
}
`,
    'src/data/seed.ts': `import type { WorkspaceItem } from '../types.ts';

export const INITIAL_ITEMS: WorkspaceItem[] = [
  { id: '1', title: '${appTitle} Core Module', category: 'Architecture', status: 'active', updatedAt: 'Just now' },
  { id: '2', title: 'Modular Component Shell', category: 'UI', status: 'active', updatedAt: 'Just now' },
];
`,
    'src/components/Navbar.tsx': `import React from 'react';
import type { ActiveTab } from '../types.ts';

interface NavbarProps {
  title: string;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export function Navbar({ title, activeTab, onSelectTab }: NavbarProps) {
  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'explore', label: 'Explore' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3 flex items-center justify-between">
      <span className="font-bold text-white tracking-tight">{title}</span>
      <nav className="flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectTab(t.id)}
            className={\`px-3 py-1.5 rounded-lg text-sm font-medium transition \${
              activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }\`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
`,
    'src/pages/HomePage.tsx': `import React from 'react';
import type { WorkspaceItem } from '../types.ts';

interface HomePageProps {
  items: WorkspaceItem[];
  onAddItem: () => void;
}

export function HomePage({ items, onAddItem }: HomePageProps) {
  return (
    <section className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Modular Workspace Ready</h1>
          <p className="text-sm text-slate-400">Organized into types, data, components, pages, and routes.</p>
        </div>
        <button
          onClick={onAddItem}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
        >
          Add Item
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="font-semibold text-white">{item.title}</div>
            <div className="mt-1 text-xs text-slate-400">{item.category} · {item.status}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
`,
    'src/App.tsx': `import React, { useState } from 'react';
import type { ActiveTab, WorkspaceItem } from './types.ts';
import { INITIAL_ITEMS } from './data/seed.ts';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [items, setItems] = useState<WorkspaceItem[]>(INITIAL_ITEMS);

  const handleAddItem = () => {
    setItems((prev) => [
      {
        id: String(Date.now()),
        title: \`New Item #\${prev.length + 1}\`,
        category: activeTab,
        status: 'active',
        updatedAt: 'Now',
      },
      ...prev,
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar title="${appTitle}" activeTab={activeTab} onSelectTab={setActiveTab} />
      <main>
        <HomePage items={items} onAddItem={handleAddItem} />
      </main>
    </div>
  );
}
`,
  };

  if (template === 'static') {
    const indexPath = path.join(wsDir, 'index.html');
    const exists = await fs.access(indexPath).then(() => true).catch(() => false);
    if (!exists) {
      await fs.writeFile(
        indexPath,
        `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6">
  <main class="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
    <h1 class="text-2xl font-bold text-white">${appTitle}</h1>
    <p class="mt-2 text-sm text-slate-400">Isolated workspace ready at workspaces/${safeId}/</p>
  </main>
</body>
</html>`,
        'utf-8'
      );
      createdFiles.push(`workspaces/${safeId}/index.html`);
    }
  } else if (template === 'react-vite') {
    const files: Record<string, string> = {
      'package.json': JSON.stringify(
        {
          name: `nexus-ws-${safeId}`,
          private: true,
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            lint: 'tsc --noEmit',
          },
          dependencies: {
            react: sharedDeps.react,
            'react-dom': sharedDeps['react-dom'],
            'lucide-react': sharedDeps['lucide-react'],
            clsx: sharedDeps.clsx,
            'tailwind-merge': sharedDeps['tailwind-merge'],
            motion: sharedDeps.motion,
            firebase: sharedDeps.firebase,
          },
          devDependencies: {
            vite: sharedDeps.vite,
            '@vitejs/plugin-react': sharedDeps['@vitejs/plugin-react'],
            '@tailwindcss/vite': sharedDeps['@tailwindcss/vite'],
          },
        },
        null,
        2
      ),
      ...baseFrontendFiles,
    };
    for (const [rel, content] of Object.entries(files)) {
      const target = path.join(wsDir, rel);
      const exists = await fs.access(target).then(() => true).catch(() => false);
      if (!exists) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content, 'utf-8');
        createdFiles.push(`workspaces/${safeId}/${rel}`);
      }
    }
  } else {
    const files: Record<string, string> = {
      'package.json': JSON.stringify(
        {
          name: `nexus-fullstack-${safeId}`,
          private: true,
          type: 'module',
          scripts: {
            dev: 'tsx server.ts',
            build: 'vite build',
            start: 'node server.ts',
            lint: 'tsc --noEmit',
          },
          dependencies: sharedDeps,
        },
        null,
        2
      ),
      'server/routes.ts': `import { Router } from 'express';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, workspace: '${safeId}', uptime: Math.round(process.uptime()) });
});
`,
      'server.ts': `import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4120;

app.use(express.json());
app.use('/w/${safeId}/api', apiRouter);
app.use('/api', apiRouter);

async function boot() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: __dirname,
      base: '/w/${safeId}/',
      server: { middlewareMode: true, allowedHosts: true, hmr: false, ws: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use('/w/${safeId}', express.static(distDir));
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log('Fullstack modular sandbox listening on port', PORT);
  });
}

boot();
`,
      ...baseFrontendFiles,
    };
    for (const [rel, content] of Object.entries(files)) {
      const target = path.join(wsDir, rel);
      const exists = await fs.access(target).then(() => true).catch(() => false);
      if (!exists) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content, 'utf-8');
        createdFiles.push(`workspaces/${safeId}/${rel}`);
      }
    }
  }

  return {
    success: true,
    sessionId: safeId,
    workspacePath: `workspaces/${safeId}`,
    proxyUrl: `/w/${safeId}/`,
    template,
    createdFiles,
  };
}

export async function startWorkspaceServer(
  sessionId: string = 'default',
  customCommand?: string
) {
  const safeId = sanitizeSessionId(sessionId);
  const existingFlight = inFlightStarts.get(safeId);
  if (existingFlight) {
    return existingFlight;
  }
  const promise = startWorkspaceServerInternal(safeId, customCommand).finally(() => {
    inFlightStarts.delete(safeId);
  });
  inFlightStarts.set(safeId, promise);
  return promise;
}

async function startWorkspaceServerInternal(
  safeId: string,
  customCommand?: string
): Promise<{
  success: boolean;
  sessionId: string;
  status: string;
  port?: number;
  proxyUrl: string;
  logs?: string[];
  error?: string;
}> {
  const wsDir = getWorkspaceDir(safeId);
  const proxyUrl = `/w/${safeId}/`;

  const exists = await fs.access(wsDir).then(() => true).catch(() => false);
  if (!exists) {
    return {
      success: false,
      sessionId: safeId,
      status: 'missing',
      proxyUrl,
      error: `Workspace workspaces/${safeId} does not exist yet. Call workspace_init first.`,
    };
  }

  // Reuse if already running
  const existing = activeWorkspaces.get(safeId);
  if (existing && existing.status === 'running' && existing.process && !existing.process.killed) {
    return {
      success: true,
      sessionId: safeId,
      status: 'running',
      port: existing.port,
      proxyUrl,
      logs: existing.logs.slice(-15),
    };
  }

  // Enforce memory-safe cap on Render Free by evicting oldest sub-server
  if (activeWorkspaces.size >= MAX_CONCURRENT_SUBSERVERS) {
    const oldest = Array.from(activeWorkspaces.values()).sort((a, b) => a.startedAt - b.startedAt)[0];
    if (oldest) {
      await stopWorkspaceServer(oldest.sessionId);
    }
  }

  const hasServerTs = await fs.access(path.join(wsDir, 'server.ts')).then(() => true).catch(() => false);
  const hasServerJs = await fs.access(path.join(wsDir, 'server.js')).then(() => true).catch(() => false);
  const hasVite = await fs.access(path.join(wsDir, 'vite.config.ts')).then(() => true).catch(() => false);

  const port = await allocateEphemeralPort();
  const rootBinDir = path.resolve(process.cwd(), 'node_modules', '.bin');
  const tsxBin = path.join(rootBinDir, 'tsx');
  const viteBin = path.join(rootBinDir, 'vite');
  const hasLocalTsx = await fs.access(tsxBin).then(() => true).catch(() => false);
  const hasLocalVite = await fs.access(viteBin).then(() => true).catch(() => false);

  let cmd = customCommand?.trim();
  if (!cmd) {
    if (hasServerTs) cmd = hasLocalTsx ? `"${tsxBin}" server.ts` : `npx tsx server.ts`;
    else if (hasServerJs) cmd = `node server.js`;
    else if (hasVite) cmd = hasLocalVite ? `"${viteBin}" --port ${port} --host 127.0.0.1` : `npx vite --port ${port} --host 127.0.0.1`;
    else {
      // Static workspace: no background daemon needed, /w/:sessionId/ serves static files directly
      return {
        success: true,
        sessionId: safeId,
        status: 'static_ready',
        proxyUrl,
      };
    }
  }

  const rootNodeModules = path.resolve(process.cwd(), 'node_modules');
  const child = spawn('bash', ['-c', cmd], {
    cwd: wsDir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_PATH: [process.env.NODE_PATH, rootNodeModules].filter(Boolean).join(':'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const runtime: WorkspaceRuntime = {
    sessionId: safeId,
    dir: wsDir,
    port,
    pid: child.pid,
    command: cmd,
    status: 'starting',
    proxyUrl,
    startedAt: Date.now(),
    logs: [],
    process: child,
  };
  activeWorkspaces.set(safeId, runtime);

  const pushLog = (chunk: Buffer) => {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const l of lines) {
      runtime.logs.push(l.slice(0, 300));
      if (runtime.logs.length > 60) runtime.logs.shift();
    }
  };
  child.stdout?.on('data', pushLog);
  child.stderr?.on('data', pushLog);
  child.on('exit', (code) => {
    runtime.status = code === 0 ? 'stopped' : 'error';
  });

  // Poll 127.0.0.1:port up to 25s until listening
  let listening = false;
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (runtime.status === 'error' || runtime.status === 'stopped') break;
    try {
      const probe = await fetch(`http://127.0.0.1:${port}/w/${safeId}/`, { signal: AbortSignal.timeout(900) });
      if (probe.status > 0) {
        listening = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }

  if (listening) {
    runtime.status = 'running';
    return {
      success: true,
      sessionId: safeId,
      status: 'running',
      port,
      proxyUrl,
      logs: runtime.logs.slice(-12),
    };
  }

  return {
    success: false,
    sessionId: safeId,
    status: runtime.status,
    port,
    proxyUrl,
    logs: runtime.logs.slice(-20),
    error: `Sub-server failed to bind port ${port} within 25s.`,
  };
}

export async function stopWorkspaceServer(sessionId: string): Promise<{ success: boolean; sessionId: string }> {
  const safeId = sanitizeSessionId(sessionId);
  const rt = activeWorkspaces.get(safeId);
  if (rt?.process && !rt.process.killed) {
    try {
      rt.process.kill('SIGTERM');
    } catch {}
  }
  activeWorkspaces.delete(safeId);
  return { success: true, sessionId: safeId };
}

export async function getWorkspaceStatus(sessionId?: string) {
  if (sessionId) {
    const safeId = sanitizeSessionId(sessionId);
    const rt = activeWorkspaces.get(safeId);
    const wsDir = getWorkspaceDir(safeId);
    const exists = await fs.access(wsDir).then(() => true).catch(() => false);
    return {
      sessionId: safeId,
      exists,
      proxyUrl: `/w/${safeId}/`,
      running: rt?.status === 'running',
      port: rt?.port,
      status: rt?.status || (exists ? 'idle' : 'missing'),
      logs: rt?.logs?.slice(-15) || [],
    };
  }

  const dirs = await fs.readdir(WORKSPACES_ROOT, { withFileTypes: true }).catch(() => []);
  return {
    workspaces: dirs
      .filter((d) => d.isDirectory())
      .map((d) => {
        const rt = activeWorkspaces.get(d.name);
        return {
          sessionId: d.name,
          proxyUrl: `/w/${d.name}/`,
          status: rt?.status || 'idle',
          port: rt?.port,
        };
      }),
  };
}

// Express middleware to reverse-proxy /w/:sessionId/* -> running sub-server OR static workspace folder
export async function handleWorkspaceProxyRequest(req: Request, res: Response) {
  const safeId = sanitizeSessionId(req.params.sessionId);
  const wsDir = getWorkspaceDir(safeId);
  let rt = activeWorkspaces.get(safeId);

  // Strip /w/:sessionId prefix cleanly
  const prefix = `/w/${req.params.sessionId}`;
  const rawRemaining = req.originalUrl.startsWith(prefix)
    ? req.originalUrl.slice(prefix.length) || '/'
    : req.url || '/';
  const targetSubPath = rawRemaining.startsWith('/') ? rawRemaining : `/${rawRemaining}`;

  // Ensure root /w/:sessionId has trailing slash so relative asset/module URLs resolve inside the sandbox
  const rawPathOnly = req.originalUrl.split('?')[0];
  if (req.method === 'GET' && targetSubPath === '/' && !rawPathOnly.endsWith('/')) {
    const querySuffix = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';
    return res.redirect(302, `${rawPathOnly}/${querySuffix}`);
  }

  const hasVite = await fs.access(path.join(wsDir, 'vite.config.ts')).then(() => true).catch(() => false);
  const hasServerTs = await fs.access(path.join(wsDir, 'server.ts')).then(() => true).catch(() => false);
  const hasServerJs = await fs.access(path.join(wsDir, 'server.js')).then(() => true).catch(() => false);
  const hasDistIndex = await fs.access(path.join(wsDir, 'dist', 'index.html')).then(() => true).catch(() => false);

  // Auto-boot workspace sub-server on demand if it is stopped/cold and needs Vite or Express API
  if ((!rt || rt.status !== 'running') && (hasVite || hasServerTs || hasServerJs)) {
    const needsLiveServer = !hasDistIndex || targetSubPath.startsWith('/api') || targetSubPath.startsWith('/src/') || targetSubPath.startsWith('/@vite');
    if (needsLiveServer) {
      await startWorkspaceServer(safeId).catch(() => null);
      rt = activeWorkspaces.get(safeId);
    }
  }

  if (rt && rt.status === 'running') {
    try {
      const viteCfgRaw = hasVite
        ? await fs.readFile(path.join(wsDir, 'vite.config.ts'), 'utf-8').catch(() => '')
        : '';
      const hasWorkspaceBase = viteCfgRaw.includes(`/w/${safeId}`);
      const upstreamPath = hasVite ? (hasWorkspaceBase ? req.originalUrl : targetSubPath) : targetSubPath;
      const targetUrl = `http://127.0.0.1:${rt.port}${upstreamPath}`;
      const fwdHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (k === 'host' || k === 'connection' || k === 'content-length') continue;
        if (typeof v === 'string') fwdHeaders[k] = v;
      }
      const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase());
      const bodyPayload =
        hasBody && req.body !== undefined
          ? typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body)
          : undefined;
      if (bodyPayload && !fwdHeaders['content-type']) {
        fwdHeaders['content-type'] = 'application/json';
      }

      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: fwdHeaders,
        body: bodyPayload,
        signal: AbortSignal.timeout(12000),
      });

      res.status(upstream.status);
      const contentType = upstream.headers.get('content-type') || '';
      upstream.headers.forEach((val, key) => {
        if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
          res.setHeader(key, val);
        }
      });
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (targetSubPath.startsWith('/@vite/client') || req.originalUrl.includes('/@vite/client')) {
        const safeCode = buf
          .toString('utf-8')
          .replace(/\bws\.send\(/g, 'ws?.send(')
          .replace(/await wsTransport\.connect\(handlers\);/g, 'return;');
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(safeCode);
        return;
      }
      if (contentType.includes('text/html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        let html = buf.toString('utf-8');
        if (!hasWorkspaceBase) {
          html = html.replace(
            /((?:src|href)=["'])\/(?!w\/|generated\/|\/)([^"']+["'])/gi,
            `$1/w/${safeId}/$2`
          );
          if (!html.includes('<base ')) {
            html = html.replace(/<head([^>]*)>/i, `<head$1><base href="/w/${safeId}/">`);
          }
        }
        if (!html.includes('__nexusElementPicker')) {
          const idx = html.indexOf('</head>');
          html = idx !== -1
            ? html.slice(0, idx) + NEXUS_PREVIEW_BRIDGE_SCRIPT + html.slice(idx)
            : NEXUS_PREVIEW_BRIDGE_SCRIPT + html;
        }
        res.send(html);
        return;
      }
      res.send(buf);
      return;
    } catch (err: any) {
      // If upstream failed transiently and dist/index.html exists, allow falling through to static dist/
      if (!hasDistIndex || targetSubPath.startsWith('/api')) {
        res.status(502).json({ error: `Sandbox proxy upstream error: ${err?.message}` });
        return;
      }
    }
  }

  // Fallback static serving from dist/ -> public/ -> workspace root (never serve raw unbuilt Vite entry index.html)
  const cleanFile = targetSubPath.split('?')[0].replace(/^\/+/, '') || 'index.html';
  const candidates = [
    path.join(wsDir, 'dist', cleanFile),
    path.join(wsDir, 'public', cleanFile),
    ...(hasVite ? [] : [path.join(wsDir, cleanFile)]),
    path.join(wsDir, 'dist', 'index.html'),
    path.join(wsDir, 'public', 'index.html'),
    ...(hasVite ? [] : [path.join(wsDir, 'index.html')]),
  ];
  for (const cand of candidates) {
    if (!cand.startsWith(wsDir)) continue;
    try {
      const st = await fs.stat(cand);
      if (st.isFile() && st.size > 0) {
        if (cand.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          let html = await fs.readFile(cand, 'utf-8');
          if (!html.includes('<base ')) {
            html = html.replace(/<head([^>]*)>/i, `<head$1><base href="/w/${safeId}/">`);
          }
          if (!html.includes('__nexusElementPicker')) {
            const idx = html.indexOf('</head>');
            html = idx !== -1
              ? html.slice(0, idx) + NEXUS_PREVIEW_BRIDGE_SCRIPT + html.slice(idx)
              : NEXUS_PREVIEW_BRIDGE_SCRIPT + html;
          }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(html);
          return;
        }
        res.sendFile(cand);
        return;
      }
    } catch {}
  }

  if (hasVite) {
    const errLogs = (rt?.logs || []).slice(-8).join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const isErr = rt?.status === 'error';
    res.status(isErr ? 500 : 503).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6 font-sans">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
    <h2 class="text-base font-bold text-white">${isErr ? 'Workspace Build / Server Error' : 'Workspace Preview Starting...'}</h2>
    <p class="text-xs text-slate-400">${isErr ? 'স্যান্ডবক্স সার্ভারটি চালু হতে গিয়ে নিচের সমস্যায় পড়েছে:' : 'স্যান্ডবক্স সার্ভারটি চালু হচ্ছে — স্বয়ংক্রিয়ভাবে রিলোড হবে।'}</p>
    ${errLogs ? `<pre class="text-left text-[11px] text-rose-300 bg-slate-950 border border-rose-500/30 rounded-xl p-3 overflow-x-auto max-h-40">${errLogs}</pre>` : ''}
    <button onclick="location.reload()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer">Reload Preview</button>
  </div>
  ${isErr ? '' : '<script>setTimeout(function(){ location.reload(); }, 2500);</script>'}
</body>
</html>`);
    return;
  }

  res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6 font-sans">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
    <h2 class="text-base font-bold text-white">Preview Not Generated Yet</h2>
    <p class="text-xs text-slate-400">এই ওয়ার্কস্পেসে (${safeId}) এখনো কোনো প্রিভিউ ফাইল বা সার্ভার তৈরি হয়নি। চ্যাটে যেকোনো অ্যাপ বা ওয়েবসাইট বানাতে বলুন।</p>
    <button onclick="location.reload()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer">Check Again</button>
  </div>
</body>
</html>`);
}
