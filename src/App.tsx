/**
 * Nexus AI - Intelligent Builder & Orchestrator
 */
import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Globe, 
  RotateCcw, 
  Layout, 
  X,
  Zap,
  Plus,
  Sparkles,
  Code,
  Image as ImageIcon,
  Search,
  Terminal,
  Wrench,
  Github,
  Flame,
  Settings,
  Key,
  Menu,
  PanelLeft,
  RefreshCw,
  Download,
  Monitor,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  ShoppingBag,
  BarChart3,
  Gamepad2,
  CheckSquare,
  Briefcase,
  ArrowLeft,
  MoreHorizontal,
  Mic,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Square,
  ArrowUp,
  CheckCircle2,
  Flag,
  Share2,
  FolderArchive,
  ScrollText,
  Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAI, KeyMetadata, PendingFirebaseSetupRequest } from './lib/gemini';
import { cn } from './lib/utils';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ToolsModal } from './components/ToolsModal';
import { GitHubSyncModal } from './components/GitHubSyncModal';
import { FirebaseModal } from './components/FirebaseModal';
import { SettingsModal } from './components/SettingsModal';
import { SecretsModal } from './components/SecretsModal';
import { LogsModal } from './components/LogsModal';
import { AskQuestionModal, PendingQuestionPrompt } from './components/AskQuestionModal';
import { SidebarDrawer } from './components/SidebarDrawer';
import { GoogleAIStudioCoderView } from './components/GoogleAIStudioCoderView';
import { getLocalKeys } from './lib/secretsManager';
import { ActionStep } from './types/secrets';
import { 
  getAllSessions, 
  getSession, 
  saveSession, 
  generateSessionTitle,
  extractHtmlFromChatMessages,
  ChatSession
} from './lib/db';

const STARTER_PROMPTS = [
  {
    icon: Smartphone,
    title: "PWA টাস্ক ও নোটস অ্যাপ",
    badge: "PWA Offline",
    color: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-300",
    prompt: "একটি পূর্ণাঙ্গ প্রগ্রেসিভ ওয়েব অ্যাপ (PWA) টাস্ক ও নোটস ম্যানেজার বানাও যাতে অফলাইন ক্যাশ, ইনস্টল বাটন (beforeinstallprompt), ফিল্টারিং ও লোকালস্টোরেজ পারসিসটেন্স থাকে।"
  },
  {
    icon: ShoppingBag,
    title: "ই-কমার্স শপিং স্টোর",
    badge: "E-Commerce",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300",
    prompt: "একটি আধুনিক গ্যাজেট ও ফ্যাশন ই-কমার্স স্টোর ওয়েবসাইট তৈরি করো যাতে প্রোডাক্ট ফিল্টারিং, ইন্টারেক্টিভ কার্ট ড্রয়ার, কোড ভ্যালিডেশন ও চেকআউট মডাল থাকে।"
  },
  {
    icon: BarChart3,
    title: "SaaS এনালিটিক্স ড্যাশবোর্ড",
    badge: "Dashboard",
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300",
    prompt: "একটি প্রফেশনাল SaaS বিজনেস অ্যানালিটিক্স ড্যাশবোর্ড তৈরি করো যাতে ইন্টারঅ্যাক্টিভ চার্ট, মেট্রিক কেপিআই কার্ড, ডেটা টেবিল ও ডার্ক থিম থাকে।"
  },
  {
    icon: Gamepad2,
    title: "2D ক্যানভাস স্নেক গেম PWA",
    badge: "Game PWA",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300",
    prompt: "একটি রেট্রো স্নেক / আর্কেড গেম PWA তৈরি করো যাতে স্কোরবোর্ড, হাই-স্কোর লোকালস্টোরেজে সেভ, সাউন্ড ইফেক্ট এবং মোবাইল টাচ কন্ট্রোল থাকে।"
  },
  {
    icon: Briefcase,
    title: "ক্রিয়েটিভ পোর্টফোলিও",
    badge: "Portfolio",
    color: "from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30 text-fuchsia-300",
    prompt: "একটি আকর্ষণীয় গ্লাসফর্মিজম ডার্ক পোর্টফোলিও ওয়েবসাইট তৈরি করো যাতে প্রোজেক্ট ফিল্টারিং, স্কিল বার, টেস্টিমোনিয়াল ও রিয়েল-টাইম কন্টাক্ট ফর্ম থাকে।"
  },
  {
    icon: CheckSquare,
    title: "ড্র্যাগ & ড্রপ কানবান বোর্ড",
    badge: "Productivity",
    color: "from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-300",
    prompt: "একটি ইন্টারঅ্যাক্টিভ ড্র্যাগ-অ্যান্ড-ড্রপ কানবান প্রজেক্ট ম্যানেজমেন্ট ওয়েব অ্যাপ বানাও (To Do, In Progress, Done) যাতে লোকালস্টোরেজে টাস্ক সেভ থাকে।"
  }
];

export default function App() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLog, setActionLog] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [actionSteps, setActionSteps] = useState<ActionStep[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<string[]>([]);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSecretsModal, setShowSecretsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [activeKeysCount, setActiveKeysCount] = useState(0);
  const [currentActiveKeyInfo, setCurrentActiveKeyInfo] = useState<KeyMetadata | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionTitle, setCurrentSessionTitle] = useState('Live Canvas');
  const [currentSessionHtml, setCurrentSessionHtml] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewTab, setPreviewTab] = useState<'canvas' | 'code'>('canvas');
  const [copiedCode, setCopiedCode] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('/projects/index.html');
  const [activeMode, setActiveMode] = useState<'general' | 'coding' | 'image' | 'search'>('coding');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [activeCoderTab, setActiveCoderTab] = useState<'chat' | 'preview' | 'artifacts'>('chat');
  const [isWorkingExpanded, setIsWorkingExpanded] = useState(false);
  const [executionDuration, setExecutionDuration] = useState<number>(0);
  const [lastRunDuration, setLastRunDuration] = useState<number>(156);
  const [selectedModelLabel, setSelectedModelLabel] = useState<string>('Default');
  const [selectedModel, setSelectedModel] = useState<string>('Default');
  const [developerPersona, setDeveloperPersona] = useState<string>('');
  const [customSystemInstruction, setCustomSystemInstruction] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<'auto' | 'markdown' | 'json'>('auto');
  const [multiAgent, setMultiAgent] = useState<boolean>(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<string>('projects/index.html');
  const [checkpointToast, setCheckpointToast] = useState<string | null>(null);
  const [previewReadySignal, setPreviewReadySignal] = useState(0);
  const executionTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const actionStepsRef = useRef<ActionStep[]>([]);
  const modifiedFilesRef = useRef<string[]>([]);
  const executionDurationRef = useRef<number>(0);
  const latestPreviewUrlRef = useRef<string>('/projects/index.html');
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestionPrompt | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [pendingFirebaseSetup, setPendingFirebaseSetup] = useState<PendingFirebaseSetupRequest | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ dataUrl: string; mimeType: string; name: string } | null>(null);

  const isWorkspacePreviewUrl = (url?: string | null) =>
    Boolean(url && /(?:^|\/)w\/[^/]+/.test(url));

  const updatePreviewUrl = (nextUrl: string) => {
    latestPreviewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  };

  const handleSubmitQuestionAnswers = async (answers: Record<string, string[]>, notes: string) => {
    if (!pendingQuestion) return;
    setIsSubmittingAnswer(true);
    try {
      await fetch('/api/gemini/answer-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: pendingQuestion.questionId,
          answers,
          notes,
          skipped: false,
        }),
      });
    } catch (err) {
      console.warn('Failed to submit answer-question response:', err);
    } finally {
      setIsSubmittingAnswer(false);
      setPendingQuestion(null);
    }
  };

  const handleSkipQuestion = async () => {
    if (!pendingQuestion) return;
    setIsSubmittingAnswer(true);
    try {
      await fetch('/api/gemini/answer-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: pendingQuestion.questionId,
          answers: {},
          skipped: true,
        }),
      });
    } catch (err) {
      console.warn('Failed to skip question:', err);
    } finally {
      setIsSubmittingAnswer(false);
      setPendingQuestion(null);
    }
  };

  const handleResolveFirebaseSetup = async (payload: {
    action: 'connect' | 'scaffold' | 'cancel';
    configSnippet?: string;
    projectId?: string;
    apiKey?: string;
    authDomain?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    firestoreDatabaseId?: string;
    serviceAccountJson?: string;
    firebaseToken?: string;
    saveToGlobalProfile?: boolean;
  }) => {
    if (!pendingFirebaseSetup) return;
    try {
      await fetch('/api/firebase/setup-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: pendingFirebaseSetup.requestId,
          ...payload,
        }),
      });
    } catch (err) {
      console.warn('Failed to submit Firebase setup response:', err);
    } finally {
      setPendingFirebaseSetup(null);
    }
  };

  const syncSessionWorkspaceFiles = async (sessId: string, mergeExisting = false) => {
    try {
      const safeId = sessId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
      if (!safeId) return;
      const res = await fetch(`/api/workspaces/${encodeURIComponent(safeId)}/files`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.files)) {
        const nextFiles: string[] = mergeExisting
          ? Array.from(new Set([...modifiedFilesRef.current, ...data.files]))
          : data.files;
        modifiedFilesRef.current = nextFiles;
        setModifiedFiles(nextFiles);
      }
    } catch {}
  };

  // Load latest chat session from IndexedDB on startup
  useEffect(() => {
    getAllSessions().then(async sessions => {
      if (sessions.length > 0) {
        const latest = sessions[0];
        setCurrentSessionId(latest.id);
        setCurrentSessionTitle(latest.title || 'Live Canvas');
        setMessages(latest.messages || []);
        setActiveMode((latest.mode as any) || 'coding');

        const safeId = latest.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        let restoredPath = latest.previewUrl || '';
        const wsStatus = await fetch(`/api/workspaces/${encodeURIComponent(safeId)}/status`)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null);

        if (wsStatus?.exists && wsStatus?.proxyUrl) {
          restoredPath = wsStatus.proxyUrl;
          setCurrentSessionHtml(null);
        } else {
          if (isWorkspacePreviewUrl(restoredPath)) {
            restoredPath = `/projects/${latest.id}/index.html`;
          }
          const html = latest.generatedHtml || extractHtmlFromChatMessages(latest.messages || []);
          setCurrentSessionHtml(html || null);
        }

        void syncSessionWorkspaceFiles(latest.id, false);

        const normalizedPath = restoredPath
          ? (restoredPath.startsWith('http')
              ? restoredPath
              : restoredPath.startsWith('/') ? restoredPath : `/${restoredPath}`)
          : `/projects/${latest.id}/index.html`;
        updatePreviewUrl(normalizedPath);
      } else {
        updatePreviewUrl('/projects/index.html');
      }
    }).catch(err => console.warn("Failed to load initial session from IndexedDB:", err));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const keys = getLocalKeys();
    setActiveKeysCount(keys.filter(k => k.isActive).length);
  }, [showSecretsModal, showSettingsModal]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (isLoading) {
      const startTime = Date.now();
      setExecutionDuration(0);
      executionDurationRef.current = 0;
      executionTimerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        executionDurationRef.current = secs;
        setExecutionDuration(secs);
      }, 1000);
    } else {
      if (executionTimerRef.current) {
        clearInterval(executionTimerRef.current);
        executionTimerRef.current = null;
      }
      if (executionDurationRef.current > 0) {
        setLastRunDuration(executionDurationRef.current);
      }
    }
    return () => {
      if (executionTimerRef.current) clearInterval(executionTimerRef.current);
    };
  }, [isLoading]);

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("ভয়েস টাইপিংয়ের জন্য Chrome ব্রাউজার ব্যবহার করুন।");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.interimResults = false;
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleCheckpoint = () => {
    setCheckpointToast("✓ Checkpoint saved at this step");
    setTimeout(() => setCheckpointToast(null), 3000);
  };

  const handleDownloadZip = () => {
    if (currentSessionId) {
      const params = new URLSearchParams({
        sessionId: currentSessionId,
        title: currentSessionTitle || 'website',
      });
      window.location.href = `/api/project/download?${params.toString()}`;
      return;
    }
    window.location.href = '/api/project/download';
  };

  const handleCopyCode = () => {
    if (!currentSessionHtml) return;
    navigator.clipboard.writeText(currentSessionHtml);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSend = async (overrideText?: string | React.MouseEvent) => {
    const isDirectOverride = typeof overrideText === 'string';
    const rawText = isDirectOverride ? overrideText : input;
    const imageToAttach = !isDirectOverride ? attachedImage : null;
    if ((!rawText.trim() && !imageToAttach) || isLoading || cooldown > 0) return;

    const textToSend = rawText.trim() || 'অনুগ্রহ করে সংযুক্ত স্ক্রিনশট/ছবিটি বিশ্লেষণ করে সেই অনুযায়ী UI বা বাগ ফিক্স তৈরি করো।';
    const messageParts: any[] = [{ text: textToSend }];
    if (imageToAttach) {
      const base64Data = imageToAttach.dataUrl.includes(',')
        ? imageToAttach.dataUrl.split(',')[1]
        : imageToAttach.dataUrl;
      messageParts.push({
        inlineData: {
          mimeType: imageToAttach.mimeType || 'image/png',
          data: base64Data,
        },
      });
    }

    const userMessage: any = {
      role: 'user',
      parts: messageParts,
      ...(imageToAttach ? { imageDataUrl: imageToAttach.dataUrl, imageName: imageToAttach.name } : {}),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!isDirectOverride) {
      setInput('');
      setAttachedImage(null);
    }
    setIsLoading(true);
    setError(null);
    setActionLog("Nexus AI: এজেন্ট পাইপলাইন ও টুলস প্রস্তুত হচ্ছে...");
    setActivityLogs([]);
    actionStepsRef.current = [];
    modifiedFilesRef.current = [];
    setActionSteps([]);
    setModifiedFiles([]);

    // Determine or create session in IndexedDB
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = `session_${Date.now()}`;
      const title = generateSessionTitle(textToSend);
      setCurrentSessionId(sessionId);
      setCurrentSessionTitle(title);
      saveSession({
        id: sessionId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: newMessages,
        mode: activeMode,
      }).catch(err => console.warn("IndexedDB save error:", err));
    } else {
      getSession(sessionId).then(sess => {
        if (sess) {
          saveSession({ ...sess, messages: newMessages, updatedAt: Date.now() });
        }
      }).catch(() => {});
    }

    const upsertActionStep = (step: ActionStep) => {
      const current = actionStepsRef.current;
      const idx = current.findIndex(s => s.id === step.id);
      const next = idx >= 0
        ? current.map((s, i) => (i === idx ? { ...s, ...step } : s))
        : [...current, step];
      actionStepsRef.current = next;
      setActionSteps(next);
    };

    const recordModifiedFile = (filePath: string) => {
      const clean = filePath.replace(/^\/+/, '').trim();
      if (!clean) return;
      if (!modifiedFilesRef.current.includes(clean)) {
        const next = [...modifiedFilesRef.current, clean];
        modifiedFilesRef.current = next;
        setModifiedFiles(next);
      }
    };

    try {
      await chatWithAI(
        newMessages,
        (text, imageUrl) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            let updated;
            if (last?.role === 'model') {
              updated = [...prev.slice(0, -1), { 
                ...last, 
                parts: [{ text }], 
                imageUrl: imageUrl || last.imageUrl,
                actionSteps: actionStepsRef.current,
                modifiedFiles: modifiedFilesRef.current,
              }];
            } else {
              updated = [...prev, { 
                role: 'model', 
                parts: [{ text }], 
                imageUrl,
                actionSteps: actionStepsRef.current,
                modifiedFiles: modifiedFilesRef.current,
              }];
            }
            // Real-time update to IndexedDB
            if (sessionId) {
              getSession(sessionId).then(sess => {
                if (sess) {
                  saveSession({ ...sess, messages: updated, updatedAt: Date.now() });
                }
              }).catch(() => {});
            }
            return updated;
          });
        },
        (action) => {
          setActionLog(action);
          setActivityLogs(prev => [...prev, action]);
        },
        activeMode,
        (keyId, cooldownSec) => {
          setActionLog(`Rate limit detected on key. Auto-rotated to backup key (${cooldownSec}s cooldown).`);
        },
        (url, html, sessId) => {
          const targetUrl = url.startsWith('/') ? url : `/${url}`;
          const sep = targetUrl.includes('?') ? '&' : '?';
          const isWs = isWorkspacePreviewUrl(targetUrl);
          if (html) {
            setCurrentSessionHtml(html);
          } else if (isWs) {
            setCurrentSessionHtml(null);
          }
          updatePreviewUrl(`${targetUrl}${sep}t=${Date.now()}`);
          recordModifiedFile(targetUrl);
          setShowCodePreview(true);
          setPreviewKey(k => k + 1);
          setPreviewReadySignal(s => s + 1);

          const sid = sessId || sessionId;
          if (sid) {
            getSession(sid).then(sess => {
              if (sess) {
                saveSession({
                  ...sess,
                  generatedHtml: html ? html : (isWs ? undefined : sess.generatedHtml),
                  previewUrl: targetUrl,
                  updatedAt: Date.now()
                }).catch(() => {});
              }
            });
          }
        },
        sessionId,
        (keyInfo) => {
          setCurrentActiveKeyInfo(keyInfo);
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'model') {
              return [...prev.slice(0, -1), { ...last, keyInfo }];
            }
            return prev;
          });
        },
        (step: ActionStep) => {
          upsertActionStep(step);
        },
        {
          selectedModel,
          developerPersona,
          customSystemInstruction,
          outputFormat,
          multiAgent,
        },
        ({ filePath }) => {
          recordModifiedFile(filePath);
        },
        (questionPayload) => {
          setPendingQuestion(questionPayload);
        },
        (fbReq) => {
          setPendingFirebaseSetup(fbReq);
        }
      );
    } catch (err: any) {
      const errMsg = err?.message || String(err) || '';
      const isRateLimit = errMsg.includes('429') || /rate limit|free-models-per-day|quota/i.test(errMsg);
      const isAuthFailure = Boolean(err?.isAuthError) && !isRateLimit;

      if (isRateLimit) {
        setError(errMsg || "ফ্রি মডেলের দৈনিক লিমিট (Rate Limit) পূর্ণ হয়েছে। অনুগ্রহ করে একটু অপেক্ষা করুন অথবা 🔑 মেনুতে নতুন API কী যুক্ত করুন।");
        setCooldown(30);
      } else if (isAuthFailure || errMsg.includes('কার্যকর API Key') || errMsg.includes('UNAUTHENTICATED')) {
        setError(errMsg || "বৈধ API Key প্রয়োজন। অনুগ্রহ করে 🔑 API Keys মেনুতে আপনার Google AI Studio বা OpenRouter API Key যুক্ত করুন।");
        setShowSecretsModal(true);
      } else {
        setError(errMsg || "একটি সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }
    } finally {
      setIsLoading(false);
      setPendingQuestion(null);
      setPendingFirebaseSetup(null);
      setActionLog(null);
      const finalSteps = actionStepsRef.current;
      const finalFiles = modifiedFilesRef.current;
      const finalDuration = executionDurationRef.current || 1;
      // Persist real completed steps, modified files, and duration onto the model message
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model') {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              actionSteps: finalSteps,
              modifiedFiles: finalFiles,
              runDuration: finalDuration,
              isFinished: true
            }
          ];
        }
        return prev;
      });
      // Final sync to IndexedDB & HTML auto-extraction check (skip overwriting workspace URLs with chat snippets)
      if (sessionId) {
        void syncSessionWorkspaceFiles(sessionId, true);
        const touchedWorkspace = finalFiles.some(f => f.startsWith('workspaces/') || f.includes('/w/'));
        const alreadyWorkspaceUrl = isWorkspacePreviewUrl(latestPreviewUrlRef.current);

        if (touchedWorkspace && !alreadyWorkspaceUrl) {
          const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
          fetch(`/api/workspaces/${encodeURIComponent(safeId)}/status`)
            .then(r => (r.ok ? r.json() : null))
            .then(wsStatus => {
              if (wsStatus?.exists && wsStatus?.proxyUrl) {
                setCurrentSessionHtml(null);
                updatePreviewUrl(`${wsStatus.proxyUrl}?t=${Date.now()}`);
                setShowCodePreview(true);
                setPreviewKey(k => k + 1);
                setPreviewReadySignal(s => s + 1);
                getSession(sessionId!).then(sess => {
                  if (sess) {
                    saveSession({ ...sess, generatedHtml: undefined, previewUrl: wsStatus.proxyUrl, updatedAt: Date.now() }).catch(() => {});
                  }
                }).catch(() => {});
              }
            })
            .catch(() => {});
        }

        setMessages(finalMsgs => {
          const allowHtmlExtract = !touchedWorkspace && !alreadyWorkspaceUrl;
          const extractedHtml = allowHtmlExtract ? extractHtmlFromChatMessages(finalMsgs) : null;
          if (extractedHtml) {
            setCurrentSessionHtml(extractedHtml);
          }
          getSession(sessionId!).then(sess => {
            if (sess) {
              saveSession({ 
                ...sess, 
                messages: finalMsgs, 
                generatedHtml: allowHtmlExtract ? (extractedHtml || sess.generatedHtml) : undefined,
                updatedAt: Date.now() 
              });
            }
          }).catch(() => {});
          return finalMsgs;
        });
      }
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setCurrentSessionTitle('New Canvas');
    setCurrentSessionHtml(null);
    updatePreviewUrl(`/projects/index.html?t=${Date.now()}`);
    setMessages([]);
    setError(null);
    setActivityLogs([]);
    setActionSteps([]);
    setModifiedFiles([]);
    setPreviewReadySignal(0);
    setPreviewKey(k => k + 1);
  };

  const handleSelectSession = async (id: string) => {
    try {
      const session = await getSession(id);
      if (session) {
        setCurrentSessionId(session.id);
        setCurrentSessionTitle(session.title || 'Live Canvas');
        setMessages(session.messages || []);
        setActiveMode((session.mode as any) || 'coding');
        setError(null);
        setActivityLogs([]);
        setActionSteps([]);
        modifiedFilesRef.current = [];
        setModifiedFiles([]);

        const safeId = session.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        const wsStatus = await fetch(`/api/workspaces/${encodeURIComponent(safeId)}/status`)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null);

        void syncSessionWorkspaceFiles(session.id, false);

        let sessionUrl = session.previewUrl || `/projects/${session.id}/index.html`;
        if (wsStatus?.exists && wsStatus?.proxyUrl) {
          sessionUrl = wsStatus.proxyUrl;
          setCurrentSessionHtml(null);
        } else {
          if (isWorkspacePreviewUrl(sessionUrl)) {
            sessionUrl = `/projects/${session.id}/index.html`;
          }
          // Extract or load this session's specific generated website
          let html = session.generatedHtml;
          if (!html && session.messages?.length) {
            html = extractHtmlFromChatMessages(session.messages) || undefined;
            if (html) {
              saveSession({ ...session, generatedHtml: html, updatedAt: Date.now() }).catch(() => {});
            }
          }
          setCurrentSessionHtml(html || null);
        }

        const sep = sessionUrl.includes('?') ? '&' : '?';
        updatePreviewUrl(`${sessionUrl}${sep}t=${Date.now()}`);
        setPreviewKey(k => k + 1);
      }
    } catch (err) {
      console.warn("Failed to switch session:", err);
    }
  };

  const handleDownloadHtml = () => {
    const html = currentSessionHtml;
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(currentSessionTitle || 'nexus-website').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAnalyzeError = (errText: string) => {
    const promptText = `নিচের এরর/বাগটি debug_error_analysis ও read_skill('debugging-error-analysis') ব্যবহার করে বিশ্লেষণ করো, রুট-কজ বের করো এবং ফিক্সড কোড দাও:\n\n\`\`\`\n${errText}\n\`\`\``;
    handleSend(promptText);
  };

  if (activeMode === 'coding') {
    return (
      <>
        <GoogleAIStudioCoderView
          messages={messages}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          actionLog={actionLog}
          activityLogs={activityLogs}
          actionSteps={actionSteps}
          modifiedFiles={modifiedFiles}
          currentSessionId={currentSessionId}
          currentSessionTitle={currentSessionTitle}
          currentSessionHtml={currentSessionHtml}
          previewUrl={previewUrl}
          previewDevice={previewDevice}
          setPreviewDevice={setPreviewDevice}
          previewKey={previewKey}
          setPreviewKey={setPreviewKey}
          error={error}
          cooldown={cooldown}
          handleSend={handleSend}
          handleNewChat={handleNewChat}
          handleDownloadHtml={handleDownloadHtml}
          handleCopyCode={handleCopyCode}
          copiedCode={copiedCode}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenTools={() => setShowToolsModal(true)}
          onOpenSecrets={() => setShowSecretsModal(true)}
          onOpenLogs={() => setShowLogsModal(true)}
          onOpenGitHubDeploy={() => setShowGitHubModal(true)}
          onOpenFirebase={() => setShowFirebaseModal(true)}
          activeKeysCount={activeKeysCount}
          currentActiveKeyInfo={currentActiveKeyInfo}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          selectedModel={selectedModel}
          setSelectedModel={(m: string) => {
            setSelectedModel(m);
            setSelectedModelLabel(m);
          }}
          developerPersona={developerPersona}
          setDeveloperPersona={setDeveloperPersona}
          customSystemInstruction={customSystemInstruction}
          setCustomSystemInstruction={setCustomSystemInstruction}
          outputFormat={outputFormat}
          setOutputFormat={setOutputFormat}
          multiAgent={multiAgent}
          setMultiAgent={setMultiAgent}
          onAnalyzeError={handleAnalyzeError}
          attachedImage={attachedImage}
          setAttachedImage={setAttachedImage}
          previewReadySignal={previewReadySignal}
        />

        <SidebarDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenSecrets={() => setShowSecretsModal(true)}
          onOpenGitHub={() => setShowGitHubModal(true)}
          onOpenFirebase={() => setShowFirebaseModal(true)}
          onOpenTools={() => setShowToolsModal(true)}
          onOpenLogs={() => setShowLogsModal(true)}
          onTogglePreview={() => setShowCodePreview(!showCodePreview)}
          activeKeysCount={activeKeysCount}
        />

        <ToolsModal 
          isOpen={showToolsModal} 
          onClose={() => setShowToolsModal(false)} 
        />

        <GitHubSyncModal 
          isOpen={showGitHubModal} 
          onClose={() => setShowGitHubModal(false)}
          sessionId={currentSessionId}
          sessionTitle={currentSessionTitle}
          currentSessionHtml={currentSessionHtml}
        />

        <FirebaseModal
          isOpen={showFirebaseModal}
          onClose={() => setShowFirebaseModal(false)}
          sessionId={currentSessionId}
          pendingRequest={pendingFirebaseSetup}
          onResolvePendingRequest={handleResolveFirebaseSetup}
        />

        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onOpenSecrets={() => setShowSecretsModal(true)}
          onOpenGitHub={() => setShowGitHubModal(true)}
          onOpenFirebase={() => setShowFirebaseModal(true)}
        />

        <SecretsModal
          isOpen={showSecretsModal}
          onClose={() => setShowSecretsModal(false)}
          onKeysUpdated={() => {
            const keys = getLocalKeys();
            setActiveKeysCount(keys.filter(k => k.isActive).length);
          }}
        />

        <LogsModal
          isOpen={showLogsModal}
          onClose={() => setShowLogsModal(false)}
          onOpenSecrets={() => setShowSecretsModal(true)}
        />

        <AskQuestionModal
          pendingQuestion={pendingQuestion}
          isSubmitting={isSubmittingAnswer}
          onSubmit={handleSubmitQuestionAnswers}
          onSkip={handleSkipQuestion}
        />

        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="flex h-full w-full min-h-0 bg-[#020617] text-slate-200 font-sans overflow-hidden">
      {/* Main Chat Area */}
      <div className={cn(
        "flex flex-col flex-1 min-h-0 transition-all duration-500",
        showCodePreview ? "hidden md:flex md:w-1/2" : "w-full"
      )}>
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-[#020617]/90 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Left Hamburger Button matching screenshot */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center justify-center transition-all shadow-sm focus:outline-none"
              title="Open Navigation Menu (মেনু খুলুন)"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-100 tracking-tight text-sm sm:text-base leading-none">
                  Nexus AI
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    IndexedDB Offline Ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick New Chat Button */}
            <button
              onClick={handleNewChat}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all border border-slate-800"
              title="Start New Chat Session"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>New Chat</span>
            </button>

            {/* Settings button */}
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-100 bg-slate-900 hover:bg-slate-800 rounded-lg transition-all border border-indigo-500/40 hover:border-indigo-500 shadow-sm"
              title="Settings (সেটিংস: এপিআই সিক্রেটস ও গিটহাব)"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xs:inline">সেটিংস</span>
              {activeKeysCount > 0 && (
                <span className="flex items-center gap-1 ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeKeysCount}
                </span>
              )}
            </button>

            {/* Logs Button */}
            <button 
              onClick={() => setShowLogsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-slate-900 hover:bg-rose-950/40 rounded-lg transition-all border border-rose-500/30 hover:border-rose-500/60 shadow-sm"
              title="সিস্টেম সমস্যা ও এরর লগ"
            >
              <ScrollText className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xs:inline">লগ</span>
            </button>

            {/* Preview Toggle */}
            <button 
              onClick={() => setShowCodePreview(!showCodePreview)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-600/20"
              title="Toggle Live Website Canvas Preview"
            >
              <Layout className="w-3.5 h-3.5" />
              <span>{showCodePreview ? 'Hide' : 'Preview'}</span>
            </button>
            <PWAInstallButton />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto py-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-600/30">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 text-white tracking-tight text-center">
                Nexus AI Studio • PWA ও ফুল-স্ট্যাক ওয়েবসাইট বিল্ডার
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mb-8 text-center max-w-xl leading-relaxed">
                Google AI Studio-এর মতো যেকোনো PWA মোবাইল অ্যাপ, ই-কমার্স, ড্যাশবোর্ড, পোর্টফোলিও বা আর্কেড গেম এক ক্লিকে তৈরি করুন।
              </p>

              {/* Starter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group shadow-lg flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br border", item.color)}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {item.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 opacity-80 group-hover:opacity-100 transition-opacity">
                      <span>তৈরি করুন (Build Now)</span>
                      <span>→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "flex gap-4 max-w-4xl mx-auto w-full",
              m.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                m.role === 'user' ? "bg-slate-700" : "bg-indigo-600"
              )}>
                {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "flex flex-col gap-2 max-w-[80%]",
                m.role === 'user' ? "items-end" : "items-start"
              )}>
                {m.role === 'model' && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mb-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 font-medium border border-sky-500/25">
                      🔑 {m.keyInfo?.keyName || (m.keyInfo?.isCustomKey ? 'Custom Secret Key' : 'Primary Studio Engine')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono border border-slate-700/60">
                      ⚡ {m.keyInfo?.model || 'gemini-3.1-flash-lite'}
                    </span>
                    {m.keyInfo?.isCustomKey && (
                      <span className="text-emerald-400 font-medium text-[10px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        কাস্টম কী
                      </span>
                    )}
                  </div>
                )}
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  m.role === 'user' ? "bg-slate-800 text-white rounded-tr-none" : "bg-slate-900 border border-slate-800 rounded-tl-none"
                )}>
                  {m.parts[0].text}
                </div>
                {m.imageUrl && (
                  <img src={m.imageUrl} className="rounded-xl w-full max-w-sm border border-slate-800 shadow-2xl" alt="Generated" />
                )}
                {/* Instant Live Preview Button inside message when website code is generated */}
                {m.role === 'model' && (
                  m.parts[0].text.includes('```html') ||
                  m.parts[0].text.includes('<!DOCTYPE') ||
                  m.parts[0].text.includes('projects/index.html') ||
                  (Array.isArray(m.modifiedFiles) && m.modifiedFiles.some((f: string) => f.endsWith('.html') || f.startsWith('workspaces/') || f.includes('/w/')))
                ) && (
                  <button
                    onClick={() => {
                      const hasWs = Array.isArray(m.modifiedFiles) && m.modifiedFiles.some((f: string) => f.startsWith('workspaces/') || f.includes('/w/'));
                      if (hasWs && currentSessionId) {
                        const safeId = currentSessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
                        setCurrentSessionHtml(null);
                        updatePreviewUrl(`${window.location.origin}/w/${safeId}/?t=${Date.now()}`);
                      } else {
                        const extracted = extractHtmlFromChatMessages([m]);
                        if (extracted) {
                          setCurrentSessionHtml(extracted);
                        }
                        if (currentSessionId) {
                          updatePreviewUrl(`${window.location.origin}/projects/${currentSessionId}/index.html?t=${Date.now()}`);
                        } else {
                          updatePreviewUrl(`${window.location.origin}/projects/index.html?t=${Date.now()}`);
                        }
                      }
                      setShowCodePreview(true);
                      setPreviewKey(k => k + 1);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 mt-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-all shadow-sm group w-fit cursor-pointer"
                  >
                    <Layout className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span>এই চ্যাটের ওয়েবসাইট প্রিভিউ দেখুন (Open Live Preview)</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {/* Error Message */}
          {error && (
            <div className="max-w-4xl mx-auto w-full px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-shake">
              <X className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto w-full">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center animate-pulse flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-3 flex-1">
                {/* Dynamic Tool and Action Status Bar replacing generic Processing... */}
                <div className="bg-[#0f172a] border border-indigo-500/40 px-4 py-2.5 rounded-2xl rounded-tl-none inline-flex items-center gap-3 shadow-lg shadow-indigo-600/15 max-w-xl">
                  <div className="flex gap-1.5 items-center flex-shrink-0">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                  <div className="w-px h-4 bg-slate-800 flex-shrink-0" />
                  <div className="flex items-center gap-2 overflow-hidden text-xs font-mono">
                    <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
                    <span className="font-semibold text-slate-100 truncate">
                      {actionLog || "Thinking & Executing Tools..."}
                    </span>
                  </div>
                </div>
                
                {/* Real-time Activity and Tool Call Log */}
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/70 border border-slate-800/70 rounded-2xl p-4 max-w-xl shadow-xl backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Live Tool & Task Execution
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                      Active Orchestration
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none font-mono text-xs">
                    {activityLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-slate-400">
                        <span className="text-indigo-400 mt-0.5 text-[11px] font-bold flex-shrink-0">[{idx + 1}]</span>
                        <span className="leading-relaxed">{log}</span>
                      </div>
                    ))}
                    {actionLog && (
                      <div className="flex items-start gap-2.5 text-indigo-300 font-semibold bg-indigo-950/40 p-2 rounded-xl border border-indigo-500/30 animate-pulse">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">▶</span>
                        <span className="leading-relaxed">{actionLog}</span>
                      </div>
                    )}
                  </div>

                  {modifiedFiles.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Code className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Modified Files:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {modifiedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[11px] text-emerald-400 font-mono">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span>{file}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-6 -mb-2 max-w-4xl mx-auto w-full">
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg">
              <div className="flex-1 whitespace-pre-wrap">{error}</div>
              <button
                onClick={() => setShowLogsModal(true)}
                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded-lg font-bold text-[11px] flex-shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ScrollText className="w-3.5 h-3.5 text-rose-400" />
                <span>লগ দেখুন</span>
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent">
          <div className="max-w-4xl mx-auto relative flex flex-col gap-2">
            <div className="relative flex items-center bg-slate-900/80 border border-slate-800 rounded-2xl focus-within:border-indigo-500 transition-all shadow-xl">
              <div className="flex items-center gap-1 px-3 py-2 border-r border-slate-800">
                <button 
                  className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all group/upload"
                  title="Upload File"
                >
                  <Plus className="w-5 h-5 group-hover/upload:scale-110 transition-transform" />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowModeMenu(!showModeMenu)}
                    className={cn(
                      "p-2 rounded-xl transition-all flex items-center gap-2",
                      activeMode === 'general' 
                        ? "text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10" 
                        : "bg-indigo-600/20 text-indigo-400"
                    )}
                    title="Select Mode"
                  >
                    {(activeMode as string) === 'coding' && <Code className="w-5 h-5" />}
                    {activeMode === 'image' && <ImageIcon className="w-5 h-5" />}
                    {activeMode === 'search' && <Search className="w-5 h-5" />}
                    {activeMode === 'general' && <Sparkles className="w-5 h-5" />}
                    <span className="text-xs font-bold hidden sm:block capitalize">{activeMode}</span>
                  </button>
                  
                  <AnimatePresence>
                    {showModeMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        className="absolute bottom-full left-0 mb-3 w-56 bg-[#0f172a] border border-slate-800 rounded-2xl p-2 shadow-2xl z-50"
                      >
                        <div className="px-3 py-2 mb-1 border-b border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Agent Mode</span>
                        </div>
                        {[
                          { id: 'coding', icon: Code, label: 'PWA & Web Builder', desc: 'PWAs, Stores, Dashboards & Games' },
                          { id: 'general', icon: Sparkles, label: 'General Assistant', desc: 'Chat & guidance' },
                          { id: 'image', icon: ImageIcon, label: 'Image Artist', desc: 'Generate visuals' },
                          { id: 'search', icon: Search, label: 'Web Explorer', desc: 'Live search' },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => {
                              setActiveMode(mode.id as any);
                              setShowModeMenu(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group/item",
                              (activeMode as string) === mode.id 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            )}
                          >
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              (activeMode as string) === mode.id ? "bg-white/20" : "bg-slate-800 group-hover/item:bg-slate-700"
                            )}>
                              <mode.icon className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{mode.label}</span>
                              <span className="text-[10px] opacity-60">{mode.desc}</span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={
                  (activeMode as string) === 'coding' ? "যেকোনো ওয়েবসাইটের লিংক (URL) অথবা অ্যাপের আইডিয়া লিখুন..." :
                  activeMode === 'image' ? "ছবির বিস্তারিত ডেসক্রিপশন লিখুন..." :
                  activeMode === 'search' ? "ওয়েব বা ডকস সার্চ করতে লিখুন..." :
                  "ওয়েবসাইট লিংক, বার্তা বা প্রম্পট লিখুন..."
                }
                className="flex-1 bg-transparent px-4 py-4 focus:outline-none text-slate-200 placeholder:text-slate-500"
              />
              
              <div className="px-3">
                <button 
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim() || cooldown > 0}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center min-w-[44px]"
                >
                  {cooldown > 0 ? (
                    <span className="text-xs font-bold text-white">{cooldown}s</span>
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-center">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                Nexus AI v4 • {activeMode} mode
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Panel - Dynamic Per-Chat Website Rendering */}
      <AnimatePresence>
        {showCodePreview && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full md:w-1/2 min-h-0 border-l border-slate-800 bg-slate-950 flex flex-col z-20 shadow-2xl"
          >
            {/* Live Preview Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-slate-900/80 backdrop-blur-md flex-shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden mr-2">
                <Globe className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Live Preview
                  </span>
                  <span className="text-slate-600 font-mono text-xs">•</span>
                  <span className="text-xs font-medium text-slate-400 truncate max-w-[150px]" title={currentSessionTitle}>
                    {currentSessionTitle}
                  </span>
                </div>
                <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  চ্যাট নির্দিষ্ট লাইভ
                </span>
              </div>

              {/* Viewport & Action Controls */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                {/* Canvas vs Code View Mode Toggle */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-semibold">
                  <button
                    onClick={() => setPreviewTab('canvas')}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      previewTab === 'canvas' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    ক্যানভাস
                  </button>
                  <button
                    onClick={() => setPreviewTab('code')}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all flex items-center gap-1",
                      previewTab === 'code' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <FileCode className="w-3 h-3" />
                    <span>কোড</span>
                  </button>
                </div>

                <div className="w-px h-4 bg-slate-800 mx-0.5" />

                {/* Desktop Viewport Button */}
                <button
                  onClick={() => {
                    setPreviewDevice('desktop');
                    setPreviewTab('canvas');
                  }}
                  className={cn(
                    "p-1.5 rounded-lg text-xs transition-all",
                    previewDevice === 'desktop' && previewTab === 'canvas'
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                  title="Desktop View (ডেস্কটপ ভিউ)"
                >
                  <Monitor className="w-4 h-4" />
                </button>

                {/* Mobile Viewport Button */}
                <button
                  onClick={() => {
                    setPreviewDevice('mobile');
                    setPreviewTab('canvas');
                  }}
                  className={cn(
                    "p-1.5 rounded-lg text-xs transition-all",
                    previewDevice === 'mobile' && previewTab === 'canvas'
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                  title="Mobile View (মোবাইল ভিউ)"
                >
                  <Smartphone className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-slate-800 mx-0.5" />

                {/* Copy Code Button */}
                {currentSessionHtml && (
                  <button
                    onClick={handleCopyCode}
                    className={cn(
                      "p-1.5 rounded-lg text-xs transition-all flex items-center gap-1",
                      copiedCode 
                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" 
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                    title="Copy Source Code (কোড কপি)"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}

                {/* Reload Preview Button */}
                <button
                  onClick={() => setPreviewKey(k => k + 1)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  title="Reload Website Preview (রিফ্রেশ)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* Download HTML or Per-Chat Website ZIP */}
                {currentSessionHtml && !isWorkspacePreviewUrl(previewUrl) && (
                  <button
                    onClick={handleDownloadHtml}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-all"
                    title="Download this Website HTML & PWA (ডাউনলোড)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                {(isWorkspacePreviewUrl(previewUrl) || modifiedFiles.some(f => f.startsWith('workspaces/') || f.startsWith('projects/session_'))) && (
                  <button
                    onClick={handleDownloadZip}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-all"
                    title="এই চ্যাটের ওয়েবসাইট ডাউনলোড করুন (ZIP)"
                  >
                    <FolderArchive className="w-4 h-4" />
                  </button>
                )}

                {/* Deploy to GitHub Pages Button */}
                <button
                  onClick={() => setShowGitHubModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  title="Deploy current session project to GitHub Pages"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Deploy Pages</span>
                </button>

                {/* Open in New Tab Button */}
                <button
                  onClick={() => {
                    const useSrcDoc = Boolean(currentSessionHtml && !isWorkspacePreviewUrl(previewUrl));
                    let href = previewUrl || '/projects/index.html';
                    let revokeLater = false;
                    if (useSrcDoc && currentSessionHtml) {
                      const blob = new Blob([currentSessionHtml], { type: 'text/html' });
                      href = URL.createObjectURL(blob);
                      revokeLater = true;
                    }
                    const a = document.createElement('a');
                    a.href = href;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    if (revokeLater) setTimeout(() => URL.revokeObjectURL(href), 15000);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  title="Open Website in New Tab (নতুন ট্যাবে খুলুন)"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                {/* Close Preview */}
                <button 
                  onClick={() => setShowCodePreview(false)} 
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all ml-1"
                  title="Close Preview (প্রিভিউ বন্ধ করুন)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preview Frame Body */}
            <div className={cn(
              "relative flex-1 min-h-0 transition-all",
              previewTab === 'code'
                ? "overflow-auto flex items-center justify-center bg-[#0d1117] p-4"
                : previewDevice === 'mobile'
                  ? "overflow-auto flex items-center justify-center bg-slate-900/60 p-3 sm:p-6"
                  : "overflow-hidden bg-white"
            )}>
              {previewTab === 'code' ? (
                <div className="w-full h-full bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-4 font-mono text-xs overflow-auto select-text shadow-inner flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-slate-200">
                        {currentSessionTitle}.html (PWA Standalone)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        PWA Ready
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'কপি হয়েছে!' : 'কোড কপি করুন'}</span>
                    </button>
                  </div>
                  <pre className="flex-1 whitespace-pre-wrap break-all text-slate-300 leading-relaxed font-mono overflow-auto">
                    {currentSessionHtml || "<!-- এখনো কোনো ওয়েবসাইট বা PWA কোড জেনারেট হয়নি -->"}
                  </pre>
                </div>
              ) : previewDevice === 'mobile' ? (
                <div className="w-full max-w-[375px] h-full max-h-[720px] min-h-0 rounded-[28px] sm:rounded-[38px] border-[6px] sm:border-[8px] border-slate-700 bg-white shadow-2xl flex flex-col overflow-hidden relative">
                  {/* Phone Speaker Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-700 rounded-b-xl z-30 flex items-center justify-center">
                    <div className="w-12 h-1 bg-slate-600 rounded-full" />
                  </div>
                  {currentSessionHtml && !isWorkspacePreviewUrl(previewUrl) ? (
                    <iframe 
                      key={`mob-${previewKey}`}
                      srcDoc={currentSessionHtml} 
                      className="flex-1 min-h-0 w-full h-full border-none bg-white pt-5 block" 
                      title={`Mobile Preview - ${currentSessionTitle}`}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                    />
                  ) : (
                    <iframe 
                      key={`mob-url-${previewKey}-${previewUrl}`}
                      src={previewUrl || '/projects/index.html'} 
                      className="flex-1 min-h-0 w-full h-full border-none bg-white pt-5 block" 
                      title={`Mobile Preview - ${currentSessionTitle}`}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                    />
                  )}
                </div>
              ) : (
                currentSessionHtml && !isWorkspacePreviewUrl(previewUrl) ? (
                  <iframe 
                    key={`desk-${previewKey}`}
                    srcDoc={currentSessionHtml} 
                    className="absolute inset-0 w-full h-full border-none bg-white block" 
                    title={`Live Preview - ${currentSessionTitle}`}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                  />
                ) : (
                  <iframe 
                    key={`desk-url-${previewKey}-${previewUrl}`}
                    src={previewUrl || '/projects/index.html'} 
                    className="absolute inset-0 w-full h-full border-none bg-white block" 
                    title={`Live Preview - ${currentSessionTitle}`}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                  />
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left-side Hamburger Drawer matching Google AI Studio screenshot */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenSecrets={() => setShowSecretsModal(true)}
        onOpenGitHub={() => setShowGitHubModal(true)}
        onOpenFirebase={() => setShowFirebaseModal(true)}
        onOpenTools={() => setShowToolsModal(true)}
        onOpenLogs={() => setShowLogsModal(true)}
        onTogglePreview={() => setShowCodePreview(!showCodePreview)}
        activeKeysCount={activeKeysCount}
      />

      <ToolsModal 
        isOpen={showToolsModal} 
        onClose={() => setShowToolsModal(false)} 
      />

      <GitHubSyncModal 
        isOpen={showGitHubModal} 
        onClose={() => setShowGitHubModal(false)}
        sessionId={currentSessionId}
        sessionTitle={currentSessionTitle}
        currentSessionHtml={currentSessionHtml}
      />

      <FirebaseModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
        sessionId={currentSessionId}
        pendingRequest={pendingFirebaseSetup}
        onResolvePendingRequest={handleResolveFirebaseSetup}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onOpenSecrets={() => setShowSecretsModal(true)}
        onOpenGitHub={() => setShowGitHubModal(true)}
        onOpenFirebase={() => setShowFirebaseModal(true)}
      />

      <SecretsModal
        isOpen={showSecretsModal}
        onClose={() => setShowSecretsModal(false)}
        onKeysUpdated={() => {
          const keys = getLocalKeys();
          setActiveKeysCount(keys.filter(k => k.isActive).length);
        }}
      />

      <LogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        onOpenSecrets={() => setShowSecretsModal(true)}
      />

      <AskQuestionModal
        pendingQuestion={pendingQuestion}
        isSubmitting={isSubmittingAnswer}
        onSubmit={handleSubmitQuestionAnswers}
        onSkip={handleSkipQuestion}
      />

      <OfflineIndicator />
    </div>
  );
}
