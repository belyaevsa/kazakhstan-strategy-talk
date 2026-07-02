import {
  BookOpen, Book, BookMarked, FileText, Files, Folder, FolderOpen, Newspaper, ScrollText, NotebookPen,
  Code, Code2, Terminal, Cpu, Database, Server, HardDrive, Cloud, CloudCog, Network, Wifi, GitBranch,
  Shield, ShieldCheck, Lock, Key, Fingerprint, ScanFace, Bug, Radar,
  Users, User, UserCog, Building, Building2, Landmark, Factory, Briefcase, GraduationCap, School,
  Lightbulb, Rocket, Target, Compass, Map, MapPin, Globe, Globe2, Flag, Milestone, Route,
  BarChart, BarChart3, LineChart, PieChart, TrendingUp, Activity, Gauge, Table2, Layers, Boxes, Box, Package,
  Settings, Wrench, Cog, Hammer, Zap, Plug, Wand2, Sparkles,
  DollarSign, Coins, Banknote, HandCoins, Handshake, Scale, Gavel, Wallet,
  Mail, MailOpen, Phone, Megaphone, MessageSquare, Bell, Calendar, Clock, Star, Heart, Award, Trophy, Medal,
  Smartphone, Monitor, Laptop, Tablet, Cctv, Camera, Video, Mic, Radio, Satellite,
  Plane, Train, TruckIcon, Car, Ship, Factory as Industry,
  Home, Info, HelpCircle, AlertTriangle, CheckCircle, Eye, Search, Filter, ListChecks, ClipboardList,
  Leaf, Sprout, Recycle, Sun, Droplet, Flame, Mountain, TreePine,
  type LucideIcon,
} from "lucide-react";

// Curated set of icons a chapter may use. Editors pick names from lucide.dev
// (kebab-case); anything outside this set falls back to BookOpen. Keeping a
// finite map lets the bundler tree-shake instead of pulling the whole library
// (~760KB) via `import * as LucideIcons`.
const ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen, book: Book, "book-marked": BookMarked, "file-text": FileText, files: Files,
  folder: Folder, "folder-open": FolderOpen, newspaper: Newspaper, "scroll-text": ScrollText, "notebook-pen": NotebookPen,
  code: Code, "code-2": Code2, terminal: Terminal, cpu: Cpu, database: Database, server: Server,
  "hard-drive": HardDrive, cloud: Cloud, "cloud-cog": CloudCog, network: Network, wifi: Wifi, "git-branch": GitBranch,
  shield: Shield, "shield-check": ShieldCheck, lock: Lock, key: Key, fingerprint: Fingerprint, "scan-face": ScanFace, bug: Bug, radar: Radar,
  users: Users, user: User, "user-cog": UserCog, building: Building, "building-2": Building2, landmark: Landmark, factory: Factory,
  briefcase: Briefcase, "graduation-cap": GraduationCap, school: School,
  lightbulb: Lightbulb, rocket: Rocket, target: Target, compass: Compass, map: Map, "map-pin": MapPin,
  globe: Globe, "globe-2": Globe2, flag: Flag, milestone: Milestone, route: Route,
  "bar-chart": BarChart, "bar-chart-3": BarChart3, "line-chart": LineChart, "pie-chart": PieChart,
  "trending-up": TrendingUp, activity: Activity, gauge: Gauge, "table-2": Table2, layers: Layers, boxes: Boxes, box: Box, package: Package,
  settings: Settings, wrench: Wrench, cog: Cog, hammer: Hammer, zap: Zap, plug: Plug, "wand-2": Wand2, sparkles: Sparkles,
  "dollar-sign": DollarSign, coins: Coins, banknote: Banknote, "hand-coins": HandCoins, handshake: Handshake, scale: Scale, gavel: Gavel, wallet: Wallet,
  mail: Mail, "mail-open": MailOpen, phone: Phone, megaphone: Megaphone, "message-square": MessageSquare, bell: Bell,
  calendar: Calendar, clock: Clock, star: Star, heart: Heart, award: Award, trophy: Trophy, medal: Medal,
  smartphone: Smartphone, monitor: Monitor, laptop: Laptop, tablet: Tablet, cctv: Cctv, camera: Camera, video: Video, mic: Mic, radio: Radio, satellite: Satellite,
  plane: Plane, train: Train, truck: TruckIcon, car: Car, ship: Ship, industry: Industry,
  home: Home, info: Info, "help-circle": HelpCircle, "alert-triangle": AlertTriangle, "check-circle": CheckCircle,
  eye: Eye, search: Search, filter: Filter, "list-checks": ListChecks, "clipboard-list": ClipboardList,
  leaf: Leaf, sprout: Sprout, recycle: Recycle, sun: Sun, droplet: Droplet, flame: Flame, mountain: Mountain, "tree-pine": TreePine,
};

/** Resolve a chapter's kebab-case icon name to a Lucide component (BookOpen fallback). */
export function getChapterIcon(iconName?: string): LucideIcon {
  if (!iconName) return BookOpen;
  return ICONS[iconName.trim().toLowerCase()] || BookOpen;
}
