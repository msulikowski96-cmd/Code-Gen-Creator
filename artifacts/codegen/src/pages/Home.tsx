import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListHistory, type HistoryItem } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Smartphone,
  Globe,
  Cpu,
  Clock,
  FileCode2,
  ChevronRight,
  Zap,
  Layers,
  Home as HomeIcon,
  Star,
  ArrowRight,
  Puzzle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Template prompts for AI ──────────────────────────────────────────────────

export const AI_TEMPLATES = [
  {
    id: "todo-rn",
    icon: <Smartphone className="w-5 h-5" />,
    color: "from-green-500/20 to-emerald-500/20",
    border: "border-green-500/30",
    iconColor: "text-green-400",
    label: "Todo App",
    sublabel: "React Native · iOS + Android",
    description: "Aplikacja do zarządzania listą zadań z ekranem listy, dodawaniem, usuwaniem i oznaczaniem jako ukończone.",
    prompt: "Stwórz aplikację mobilną na iOS i Android do zarządzania listą zadań (todo list). Powinna mieć ekran z listą zadań, możliwość dodawania i usuwania, oraz oznaczania jako ukończone. Użyj React Native z TypeScript.",
    lang: "TypeScript",
    platform: "ios+android",
  },
  {
    id: "landing-web",
    icon: <Globe className="w-5 h-5" />,
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
    iconColor: "text-blue-400",
    label: "Landing Page",
    sublabel: "React · Web",
    description: "Nowoczesny landing page dla startupu SaaS z sekcjami hero, features, pricing i footer.",
    prompt: "Zbuduj nowoczesny landing page dla startupu SaaS oferującego narzędzie do zarządzania projektami. Sekcje: hero z CTA, features (3 karty), pricing (3 plany), testimonials, footer. Użyj React + TypeScript + Tailwind CSS.",
    lang: "TypeScript",
    platform: "web",
  },
  {
    id: "weather-rn",
    icon: <Smartphone className="w-5 h-5" />,
    color: "from-yellow-500/20 to-orange-500/20",
    border: "border-yellow-500/30",
    iconColor: "text-yellow-400",
    label: "Aplikacja pogodowa",
    sublabel: "React Native · iOS + Android",
    description: "Aplikacja pogodowa z aktualną pogodą i prognozą na 7 dni. Piękny interfejs z gradientami.",
    prompt: "Stwórz aplikację pogodową na React Native (iOS + Android). Ekran główny z aktualną pogodą, temperaturą, ikonami pogodowymi i prognozą na 7 dni. Użyj gradientów i animacji. TypeScript.",
    lang: "TypeScript",
    platform: "ios+android",
  },
  {
    id: "budget-web",
    icon: <Globe className="w-5 h-5" />,
    color: "from-purple-500/20 to-violet-500/20",
    border: "border-purple-500/30",
    iconColor: "text-purple-400",
    label: "Kalkulator budżetu",
    sublabel: "React · Web",
    description: "Webowa aplikacja kalkulatora budżetu domowego z kategoriami, wykresami i podsumowaniem.",
    prompt: "Zbuduj webową aplikację kalkulatora budżetu domowego w React + TypeScript. Funkcje: dodawanie przychodów i wydatków z kategoriami, wykresy (pie chart), podsumowanie miesięczne, historia transakcji. Użyj Tailwind CSS.",
    lang: "TypeScript",
    platform: "web",
  },
  {
    id: "fitness-rn",
    icon: <Smartphone className="w-5 h-5" />,
    color: "from-orange-500/20 to-red-500/20",
    border: "border-orange-500/30",
    iconColor: "text-orange-400",
    label: "Aplikacja fitness",
    sublabel: "React Native · iOS + Android",
    description: "Dashboard z treningami, ekran dodawania ćwiczeń i historia aktywności.",
    prompt: "Zbuduj aplikację fitness na React Native. Dashboard z treningami tygodnia, ekran dodawania ćwiczeń (nazwa, serie, powtórzenia, ciężar), historia aktywności, profil użytkownika z postępami. TypeScript.",
    lang: "TypeScript",
    platform: "ios+android",
  },
  {
    id: "bluetooth-native",
    icon: <Cpu className="w-5 h-5" />,
    color: "from-primary/20 to-indigo-500/20",
    border: "border-primary/30",
    iconColor: "text-primary",
    label: "Moduł Bluetooth",
    sublabel: "TurboModule · Android + iOS",
    description: "Natywny moduł React Native do obsługi Bluetooth — skanowanie, łączenie, wysyłanie danych.",
    prompt: "Stwórz natywny moduł React Native (TurboModule) do obsługi Bluetooth — skanowanie urządzeń w pobliżu, łączenie z urządzeniem, wysyłanie i odbieranie danych. Pełna implementacja Android (Kotlin) i iOS (Swift).",
    lang: "Kotlin + Swift",
    platform: "android+ios",
  },
  {
    id: "ecommerce-web",
    icon: <Globe className="w-5 h-5" />,
    color: "from-pink-500/20 to-rose-500/20",
    border: "border-pink-500/30",
    iconColor: "text-pink-400",
    label: "Sklep internetowy",
    sublabel: "React · Web",
    description: "Mini e-commerce z listą produktów, koszykiem i podsumowaniem zamówienia.",
    prompt: "Zbuduj mini sklep internetowy w React + TypeScript. Strona główna z siatką produktów, szczegóły produktu, koszyk zakupów z licznikiem, podsumowanie zamówienia z formularzem. Tailwind CSS.",
    lang: "TypeScript",
    platform: "web",
  },
  {
    id: "camera-native",
    icon: <Cpu className="w-5 h-5" />,
    color: "from-teal-500/20 to-green-500/20",
    border: "border-teal-500/30",
    iconColor: "text-teal-400",
    label: "Moduł kamery",
    sublabel: "TurboModule · Android + iOS",
    description: "Natywny moduł do obsługi kamery — zdjęcia, wideo, wybór z galerii.",
    prompt: "Stwórz natywny moduł React Native (TurboModule) do obsługi kamery — robienie zdjęć, nagrywanie wideo, wybór z galerii, kompresja obrazu. Pełna implementacja Android (Kotlin) i iOS (Swift/Objective-C).",
    lang: "Kotlin + Swift",
    platform: "android+ios",
  },
];

const PLATFORM_BADGE: Record<string, { label: string; color: string }> = {
  "ios+android": { label: "iOS + Android", color: "bg-green-400/15 text-green-400" },
  "android+ios": { label: "Android + iOS", color: "bg-green-400/15 text-green-400" },
  web: { label: "Web", color: "bg-blue-400/15 text-blue-400" },
  android: { label: "Android", color: "bg-[#a8ff78]/15 text-[#a8ff78]" },
  ios: { label: "iOS", color: "bg-[#78b4ff]/15 text-[#78b4ff]" },
};

const SPEC_ICONS: Record<string, React.ReactNode> = {
  NativeModule: <Cpu className="w-4 h-4 text-primary" />,
  NativeComponent: <Puzzle className="w-4 h-4 text-green-400" />,
};

// ── Sidebar nav ──────────────────────────────────────────────────────────────

function SidebarNav({ active }: { active: string }) {
  const items = [
    { id: "home", icon: <HomeIcon className="w-4 h-4" />, label: "Strona główna", href: "/" },
    { id: "templates", icon: <Layers className="w-4 h-4" />, label: "Szablony", href: "/?tab=templates" },
  ];
  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {items.map((item) => (
        <Link key={item.id} href={item.href}
          className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
            active === item.id ? "bg-[#1f2937] text-[#e6edf3] font-medium" : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]")}>
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ t, compact = false }: { t: typeof AI_TEMPLATES[0]; compact?: boolean }) {
  const badge = PLATFORM_BADGE[t.platform];
  return (
    <Link href={`/workspace?prompt=${encodeURIComponent(t.prompt)}`}>
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "group relative rounded-xl border bg-gradient-to-br cursor-pointer transition-all overflow-hidden",
          t.color, t.border,
          "hover:border-opacity-60 hover:shadow-lg hover:shadow-black/30",
          compact ? "p-3" : "p-4"
        )}
      >
        <div className={cn("flex items-center gap-2 mb-2", t.iconColor)}>
          {t.icon}
          <span className={cn("font-semibold", compact ? "text-sm" : "text-sm")}>{t.label}</span>
        </div>
        {!compact && <p className="text-xs text-[#8b949e] leading-relaxed mb-3 line-clamp-2">{t.description}</p>}
        <div className="flex items-center justify-between gap-2">
          {badge && <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", badge.color)}>{badge.label}</span>}
          <span className="text-[10px] text-[#484f58] ml-auto flex items-center gap-1 group-hover:text-[#8b949e] transition-colors">
            {t.lang} <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

// ── History card ──────────────────────────────────────────────────────────────

function HistoryCard({ item }: { item: HistoryItem }) {
  const platformLabels: Record<string, string> = { android: "Android", ios: "iOS", both: "iOS + Android" };
  return (
    <Link href="/workspace">
      <motion.div
        whileHover={{ y: -1, scale: 1.005 }}
        transition={{ duration: 0.12 }}
        className="group rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#1c2128] hover:border-[#444c56] p-4 cursor-pointer transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            {SPEC_ICONS[item.specType] ?? <FileCode2 className="w-4 h-4 text-[#8b949e]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#e6edf3] truncate">{item.moduleName}</p>
            <p className="text-[11px] text-[#8b949e] mt-0.5">{item.specType} · {platformLabels[item.platform] ?? item.platform}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#30363d] group-hover:text-[#8b949e] transition-colors mt-0.5 flex-shrink-0" />
        </div>
        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-[#21262d]">
          <span className="flex items-center gap-1 text-[10px] text-[#484f58]">
            <FileCode2 className="w-2.5 h-2.5" /> {item.fileCount} plików
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#484f58]">
            <Clock className="w-2.5 h-2.5" /> {format(parseISO(item.generatedAt), "d MMM, HH:mm")}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

// ── Main Home page ────────────────────────────────────────────────────────────

export default function Home() {
  const { data: historyData } = useListHistory();
  const recentItems = historyData?.items?.slice(0, 6) ?? [];

  return (
    <div className="flex h-screen bg-[#0d1117] text-[#e6edf3] overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-[#161b22] border-r border-[#30363d] flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#30363d]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-[#e6edf3]">CodeGen</span>
          <span className="text-[10px] text-[#484f58] font-mono ml-auto">v0.2</span>
        </div>

        {/* Nav */}
        <SidebarNav active="home" />

        {/* Recent label */}
        {recentItems.length > 0 && (
          <>
            <div className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#484f58]">Ostatnie</p>
            </div>
            <div className="flex flex-col gap-0.5 px-2 overflow-y-auto">
              {recentItems.slice(0, 5).map((item) => (
                <Link key={item.id} href="/workspace">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#8b949e] hover:bg-[#1f2937] hover:text-[#e6edf3] transition-all cursor-pointer group">
                    <FileCode2 className="w-3 h-3 flex-shrink-0" />
                    <span className="text-xs truncate">{item.moduleName}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="flex-1" />

        {/* Create button */}
        <div className="p-3 border-t border-[#30363d]">
          <Link href="/workspace">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-lg shadow-primary/20 group">
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              Nowy projekt
            </button>
          </Link>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">

        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-[#0d1117]/80 backdrop-blur-xl border-b border-[#30363d]/50">
          <div className="flex-1 flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#484f58]" />
            <span className="text-xs text-[#484f58]">Szukaj szablonów...</span>
          </div>
          <Link href="/workspace">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow shadow-primary/20">
              <Plus className="w-4 h-4" /> Nowy projekt
            </button>
          </Link>
        </div>

        <div className="px-8 py-8 max-w-6xl mx-auto">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-10"
          >
            <h2 className="text-3xl font-bold text-[#e6edf3] mb-2">
              Witaj w <span className="text-primary">CodeGen</span>
            </h2>
            <p className="text-[#8b949e] text-base">
              Opisz aplikację — AI wygeneruje kompletny projekt w kilka sekund.
            </p>
          </motion.div>

          {/* Quick create */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="mb-10"
          >
            <Link href="/workspace">
              <div className="group flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed border-[#30363d] hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[#e6edf3]">Utwórz nowy projekt</p>
                  <p className="text-sm text-[#8b949e]">Opisz co chcesz zbudować i pozwól AI to wygenerować</p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#484f58] group-hover:text-primary ml-auto transition-colors" />
              </div>
            </Link>
          </motion.div>

          {/* Recent projects */}
          {recentItems.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8b949e]" /> Ostatnie projekty
                </h3>
                <span className="text-xs text-[#484f58]">{recentItems.length} projektów</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {recentItems.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.04 }}>
                    <HistoryCard item={item} />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Templates */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" /> Szablony projektów
              </h3>
              <span className="text-xs text-[#484f58]">{AI_TEMPLATES.length} szablonów</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {AI_TEMPLATES.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.03 }}>
                  <TemplateCard t={t} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
