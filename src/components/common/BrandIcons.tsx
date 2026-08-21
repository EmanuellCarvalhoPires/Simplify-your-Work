import React from 'react';
import {
  Globe,
  Cloud,
  Folder,
  Briefcase,
  MessagesSquare,
  Code,
  Layout,
  ExternalLink,
  Zap,
  CheckSquare,
  Layers,
  Shield,
  Radio,
  Terminal,
  Hash,
  Star,
  Heart,
  Pin,
  Tag,
  Flag,
  Lock,
  Key,
  Compass,
  Map,
  Mail,
  Music,
  Video,
  Camera,
  Phone,
  Coffee,
  Rocket,
  Flame,
  Lightbulb,
  Target,
  Bell,
  CheckCircle,
  Trophy,
  Play,
  Sliders,
  Wrench,
  Bug,
  Database,
  Server,
  Monitor,
  Smartphone,
  Download,
  Upload,
  Link,
  Users,
  BookOpen,
  FileCode,
  Boxes,
  Cpu,
  ShieldCheck,
  HelpCircle,
  Activity,
  Wifi,
  ShoppingBag,
  Award,
  TrendingUp,
  PieChart,
  Headphones,
  Printer,
  Search,
  Share2,
  Paperclip,
  Bookmark,
  Sparkles,
  FileText,
} from 'lucide-react';

/* ==========================================================================
   1. ÍCONES OFICIAIS DE MARCAS & FERRAMENTAS FAMOSAS (SVGs VETORIAIS NATIVOS)
   ========================================================================== */

export const OneDriveIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16, color = '#0284c7' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill={color} opacity="0.2" />
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" fill={color} />
  </svg>
);

export const GitHubIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export const MicrosoftIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="9.5" height="9.5" rx="1" fill="#f25022" />
    <rect x="12.5" y="2" width="9.5" height="9.5" rx="1" fill="#7fba00" />
    <rect x="2" y="12.5" width="9.5" height="9.5" rx="1" fill="#00a4ef" />
    <rect x="12.5" y="12.5" width="9.5" height="9.5" rx="1" fill="#ffb900" />
  </svg>
);

export const JiraIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M11.53 2C11.3 3.63 10.02 5.08 8.44 5.25L4.47 5.7C2.9 5.87 1.8 7.32 2.03 8.95L3.4 18.57C3.63 20.2 5.08 21.3 6.66 21.13L10.63 20.68C12.2 20.51 13.3 19.06 13.07 17.43L11.53 2Z" fill="#0052CC" />
    <path d="M12.47 2C12.7 3.63 13.98 5.08 15.56 5.25L19.53 5.7C21.1 5.87 22.2 7.32 21.97 8.95L20.6 18.57C20.37 20.2 18.92 21.3 17.34 21.13L13.37 20.68C11.8 20.51 10.7 19.06 10.93 17.43L12.47 2Z" fill="#2684FF" />
  </svg>
);

export const TrelloIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#0079BF" />
    <rect x="4" y="4" width="6.5" height="13" rx="1.5" fill="#ffffff" />
    <rect x="13.5" y="4" width="6.5" height="8.5" rx="1.5" fill="#ffffff" />
  </svg>
);

export const NotionIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.233-.746c1.12-.093 1.306-.467 1.026-1.027L18.007 1.5c-.373-.56-.933-.84-1.773-.746L3.899 1.78c-.933.093-1.213.56-.84 1.12l1.4 1.308zm-.746 3.174v13.626c0 .933.466 1.307 1.4 1.213l13.066-.84c.933-.093 1.213-.653 1.213-1.493V6.26c0-.84-.373-1.213-1.12-1.12l-13.439.84c-.746.094-1.12.56-1.12 1.402zm11.946.934c.093.466-.093.933-.653 1.026l-.84.187v8.866c-.56.373-1.213.56-1.773.56-.84 0-1.213-.28-1.866-1.12l-3.826-5.88v5.693l1.4.28c.56.093.653.466.653.933 0 .467-.373.467-.84.467l-2.8-.093c-.466 0-.653-.374-.653-.84 0-.467.28-.747.746-.84l.84-.187V9.715c0-.467-.28-.654-.746-.747l-.933-.187c-.467-.093-.56-.466-.56-.84 0-.466.373-.466.84-.466l3.173.093 4.106 6.16V8.688l-1.12-.187c-.467-.093-.56-.466-.56-.84 0-.467.373-.467.84-.467l2.893.093c.467 0 .56.374.467.84z"/>
  </svg>
);

export const WhatsAppIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16, color = '#25D366' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.08C8.94 7.08 8.66 7.15 8.42 7.41C8.18 7.67 7.5 8.31 7.5 9.61C7.5 10.91 8.45 12.16 8.58 12.33C8.71 12.5 10.45 15.19 13.12 16.35C13.76 16.63 14.25 16.79 14.64 16.91C15.28 17.11 15.87 17.08 16.33 17.01C16.85 16.93 17.93 16.35 18.16 15.71C18.39 15.07 18.39 14.52 18.32 14.41C18.25 14.3 18.06 14.23 17.77 14.09C17.48 13.95 16.06 13.25 15.8 13.15C15.54 13.06 15.35 13.01 15.16 13.3C14.97 13.59 14.43 14.23 14.26 14.41C14.1 14.6 13.93 14.62 13.64 14.48C13.35 14.34 12.42 14.03 11.31 13.04C10.45 12.27 9.87 11.32 9.71 11.03C9.54 10.74 9.69 10.59 9.84 10.45C9.97 10.32 10.13 10.11 10.27 9.94C10.41 9.77 10.46 9.65 10.55 9.46C10.65 9.27 10.6 9.1 10.53 8.96C10.46 8.82 9.88 7.39 9.64 6.82C9.41 6.26 9.17 6.34 9.11 7.08Z" />
  </svg>
);

export const GoogleDriveIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8.01 4.5L13.35 13.76L9.35 20.69L4.01 11.43L8.01 4.5Z" fill="#0066DA" />
    <path d="M15.99 4.5H8.01L13.35 13.76H21.33L15.99 4.5Z" fill="#00AC47" />
    <path d="M21.33 13.76L17.33 20.69H9.35L13.35 13.76H21.33Z" fill="#EA4335" />
    <path d="M15.99 4.5L21.33 13.76L17.33 20.69L11.99 11.43L15.99 4.5Z" fill="#FFBA00" />
  </svg>
);

export const FigmaIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8 12C5.79 12 4 10.21 4 8C4 5.79 5.79 4 8 4H12V12H8Z" fill="#F24E1E" />
    <path d="M12 4H16C18.21 4 20 5.79 20 8C20 10.21 18.21 12 16 12C13.79 12 12 10.21 12 8V4Z" fill="#FF7262" />
    <path d="M12 12H16C18.21 12 20 13.79 20 16C20 18.21 18.21 20 16 20C13.79 20 12 18.21 12 16V12Z" fill="#1ABCFE" />
    <path d="M8 20C5.79 20 4 18.21 4 16C4 13.79 5.79 12 8 12H12V16C12 18.21 10.21 20 8 20Z" fill="#0ACF83" />
    <circle cx="16" cy="8" r="4" fill="#FF7262" />
    <circle cx="8" cy="8" r="4" fill="#F24E1E" />
    <circle cx="8" cy="16" r="4" fill="#A259FF" />
  </svg>
);

export const SlackIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16, color = '#E01E5A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M6 15a2 2 0 1 0-2-2v2h2zm1 0a2 2 0 1 0 0-4H5v4h2zm7-9a2 2 0 1 0-2-2v2h2zm0 1a2 2 0 1 0-4 0v2h4V7zm6 7a2 2 0 1 0 2 2v-2h-2zm-1 0a2 2 0 1 0 0 4h2v-4h-2zm-7 9a2 2 0 1 0 2 2v-2h-2zm0-1a2 2 0 1 0 4 0v-2h-4v2z" />
  </svg>
);

export const GitLabIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16, color = '#FC6D26' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M22.65 14.39L20.5 7.77a.82.82 0 0 0-1.56 0l-1.63 5H6.69l-1.63-5a.82.82 0 0 0-1.56 0l-2.15 6.62a1.64 1.64 0 0 0 .6 1.83l10.05 7.3a.82.82 0 0 0 .97 0l10.05-7.3a1.64 1.64 0 0 0 .63-1.83z" />
  </svg>
);

export const ConfluenceIcon: React.FC<{ size?: number | string; color?: string; className?: string }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M2.82 17.51C1.84 15.93 2.14 13.9 3.53 12.67L9.89 7.04C11.36 5.74 13.56 5.86 14.89 7.32L17.55 10.23C16.89 10.98 15.97 11.45 14.96 11.53L8.68 12.05C7.26 12.16 6.04 13.09 5.56 14.43L2.82 17.51Z" fill="#0052CC" />
    <path d="M21.18 6.49C22.16 8.07 21.86 10.1 20.47 11.33L14.11 16.96C12.64 18.26 10.44 18.14 9.11 16.68L6.45 13.77C7.11 13.02 8.03 12.55 9.04 12.47L15.32 11.95C16.74 11.84 17.96 10.91 18.44 9.57L21.18 6.49Z" fill="#2684FF" />
  </svg>
);

/* ==========================================================================
   2. DICIONÁRIO CENTRAL DE TODOS OS ÍCONES DISPONÍVEIS
   ========================================================================== */

export const ALL_BRAND_AND_LUCIDE_ICONS: Record<string, React.ComponentType<{ size?: number | string; color?: string; className?: string }>> = {
  // Marcas
  onedrive: OneDriveIcon,
  github: GitHubIcon,
  microsoft: MicrosoftIcon,
  jira: JiraIcon,
  trello: TrelloIcon,
  notion: NotionIcon,
  whatsapp: WhatsAppIcon,
  googledrive: GoogleDriveIcon,
  figma: FigmaIcon,
  slack: SlackIcon,
  gitlab: GitLabIcon,
  confluence: ConfluenceIcon,

  // Geral & Web
  globe: Globe,
  cloud: Cloud,
  folder: Folder,
  briefcase: Briefcase,
  messagesquare: MessagesSquare,
  code: Code,
  layout: Layout,
  link: Link,
  external: ExternalLink,
  zap: Zap,
  checksquare: CheckSquare,
  layers: Layers,
  shield: Shield,
  shieldcheck: ShieldCheck,
  radio: Radio,
  terminal: Terminal,
  hash: Hash,
  star: Star,
  heart: Heart,
  pin: Pin,
  tag: Tag,
  flag: Flag,
  lock: Lock,
  key: Key,
  compass: Compass,
  map: Map,
  mail: Mail,
  music: Music,
  video: Video,
  camera: Camera,
  phone: Phone,
  coffee: Coffee,
  rocket: Rocket,
  flame: Flame,
  lightbulb: Lightbulb,
  target: Target,
  bell: Bell,
  checkcircle: CheckCircle,
  trophy: Trophy,
  play: Play,
  sliders: Sliders,
  wrench: Wrench,
  bug: Bug,
  database: Database,
  server: Server,
  monitor: Monitor,
  smartphone: Smartphone,
  download: Download,
  upload: Upload,
  users: Users,
  bookopen: BookOpen,
  filecode: FileCode,
  filetext: FileText,
  boxes: Boxes,
  cpu: Cpu,
  helpcircle: HelpCircle,
  activity: Activity,
  wifi: Wifi,
  shoppingbag: ShoppingBag,
  award: Award,
  trendingup: TrendingUp,
  piechart: PieChart,
  headphones: Headphones,
  printer: Printer,
  search: Search,
  share: Share2,
  paperclip: Paperclip,
  bookmark: Bookmark,
  sparkles: Sparkles,
};

/* ==========================================================================
   3. COMPONENTE UNIVERSAL: RENDERIZA SVG, LUCIDE OU EMOJI LIVRE DO TECLADO
   ========================================================================== */

export const DynamicCustomIcon: React.FC<{
  iconKey?: string;
  size?: number | string;
  color?: string;
  className?: string;
}> = ({ iconKey = 'globe', size = 16, color = 'currentColor', className }) => {
  try {
    if (!iconKey || typeof iconKey !== 'string') {
      return <Globe size={size} color={color} className={className} />;
    }

    // Se for um emoji (prefixado com 'emoji:' ou caractere unicode)
    if (iconKey.startsWith('emoji:')) {
      const emojiChar = iconKey.replace('emoji:', '');
      return (
        <span
          style={{
            fontSize: typeof size === 'number' ? `${size}px` : size,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
          className={className}
        >
          {emojiChar}
        </span>
      );
    }

    // Verifica se é um emoji direto (ex: '🚀', '⭐', etc.)
    try {
      if (/\p{Extended_Pictographic}/u.test(iconKey)) {
        return (
          <span
            style={{
              fontSize: typeof size === 'number' ? `${size}px` : size,
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
            }}
            className={className}
          >
            {iconKey}
          </span>
        );
      }
    } catch {
      // Ignora erro de regex se o runtime não suportar Unicode property escapes
    }

    const normalized = iconKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const IconComponent = ALL_BRAND_AND_LUCIDE_ICONS[normalized] || ALL_BRAND_AND_LUCIDE_ICONS[iconKey.toLowerCase()] || Globe;

    return <IconComponent size={size} color={color} className={className} />;
  } catch {
    return <Globe size={size} color={color} className={className} />;
  }
};

/* ==========================================================================
   4. PRESETS CATEGORIZADOS PARA SELEÇÃO NO MODAL DE SITES
   ========================================================================== */

export const BRAND_ICON_PRESETS = [
  { id: 'onedrive', label: 'OneDrive', icon: OneDriveIcon },
  { id: 'github', label: 'GitHub', icon: GitHubIcon },
  { id: 'microsoft', label: 'Microsoft / 365', icon: MicrosoftIcon },
  { id: 'jira', label: 'Jira / Atlassian', icon: JiraIcon },
  { id: 'trello', label: 'Trello', icon: TrelloIcon },
  { id: 'notion', label: 'Notion', icon: NotionIcon },
  { id: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon },
  { id: 'googledrive', label: 'Google Drive', icon: GoogleDriveIcon },
  { id: 'figma', label: 'Figma', icon: FigmaIcon },
  { id: 'slack', label: 'Slack', icon: SlackIcon },
  { id: 'gitlab', label: 'GitLab', icon: GitLabIcon },
  { id: 'confluence', label: 'Confluence', icon: ConfluenceIcon },
];

export const SYSTEM_ICON_PRESETS = [
  { id: 'globe', label: 'Globo / Web', icon: Globe },
  { id: 'terminal', label: 'Terminal / Prompt', icon: Terminal },
  { id: 'code', label: 'Código / Dev', icon: Code },
  { id: 'rocket', label: 'Foguete', icon: Rocket },
  { id: 'star', label: 'Estrela', icon: Star },
  { id: 'heart', label: 'Coração', icon: Heart },
  { id: 'flame', label: 'Fogo / Destaque', icon: Flame },
  { id: 'coffee', label: 'Café', icon: Coffee },
  { id: 'target', label: 'Alvo / Metas', icon: Target },
  { id: 'trophy', label: 'Troféu / Prêmio', icon: Trophy },
  { id: 'lightbulb', label: 'Ideia / Lâmpada', icon: Lightbulb },
  { id: 'bug', label: 'Bug / Testes', icon: Bug },
  { id: 'database', label: 'Banco de Dados', icon: Database },
  { id: 'server', label: 'Servidor / Cloud', icon: Server },
  { id: 'monitor', label: 'Monitor / Desktop', icon: Monitor },
  { id: 'smartphone', label: 'Mobile / App', icon: Smartphone },
  { id: 'briefcase', label: 'Trabalho / Clientes', icon: Briefcase },
  { id: 'users', label: 'Equipe / Usuários', icon: Users },
  { id: 'messagesquare', label: 'Chat / Mensagens', icon: MessagesSquare },
  { id: 'mail', label: 'Email', icon: Mail },
  { id: 'folder', label: 'Pasta / Arquivos', icon: Folder },
  { id: 'filetext', label: 'Documento / Docs', icon: FileText },
  { id: 'checksquare', label: 'Tarefas / Checklist', icon: CheckSquare },
  { id: 'layout', label: 'Quadro / Kanban', icon: Layout },
  { id: 'layers', label: 'Camadas / Projetos', icon: Layers },
  { id: 'lock', label: 'Cadeado / Seguro', icon: Lock },
  { id: 'key', label: 'Chave / Acesso', icon: Key },
  { id: 'tag', label: 'Tag / Etiqueta', icon: Tag },
  { id: 'flag', label: 'Bandeira', icon: Flag },
  { id: 'pin', label: 'Pin / Fixado', icon: Pin },
  { id: 'link', label: 'Link / Externo', icon: ExternalLink },
  { id: 'zap', label: 'Raio / Rápido', icon: Zap },
  { id: 'shield', label: 'Segurança', icon: Shield },
  { id: 'search', label: 'Pesquisa', icon: Search },
  { id: 'music', label: 'Música / Áudio', icon: Music },
  { id: 'video', label: 'Vídeo / Gravação', icon: Video },
  { id: 'camera', label: 'Câmera', icon: Camera },
  { id: 'phone', label: 'Telefone', icon: Phone },
  { id: 'wrench', label: 'Ferramenta', icon: Wrench },
  { id: 'sliders', label: 'Ajustes', icon: Sliders },
  { id: 'sparkles', label: 'IA / Inovação', icon: Sparkles },
];

export const EMOJI_KEYBOARD_PRESETS = [
  '🚀', '⭐', '🔥', '⚡', '💼', '💻', '📊', '📝',
  '🧠', '🎯', '🛠️', '☕', '🤖', '👑', '💎', '📦',
  '🎨', '🎵', '🎧', '🏆', '💡', '📈', '🏢', '🌐',
  '🔔', '🔒', '🔑', '🏷️', '🚩', '📌', '❤️', '💬'
];
