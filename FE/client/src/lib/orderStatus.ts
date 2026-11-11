import type { ServiceOrderStatus } from "@/types";

export interface StatusMeta {
  label: string;
  /** classes Tailwind para badge (borda fina, sem pill) */
  className: string;
  /** cor sólida para gráficos */
  color: string;
}

export const ORDER_STATUS: Record<ServiceOrderStatus, StatusMeta> = {
  pending: { label: "Aguardando", className: "bg-slate-100 text-slate-700 border-slate-300", color: "#94a3b8" },
  evaluating: { label: "Em avaliação", className: "bg-sky-50 text-sky-800 border-sky-200", color: "#0ea5e9" },
  approved: { label: "Aprovada", className: "bg-indigo-50 text-indigo-800 border-indigo-200", color: "#6366f1" },
  waiting_parts: { label: "Aguardando peça", className: "bg-amber-50 text-amber-800 border-amber-200", color: "#d97706" },
  in_repair: { label: "Em reparo", className: "bg-blue-50 text-blue-800 border-blue-200", color: "#3d5a78" },
  testing: { label: "Em testes", className: "bg-cyan-50 text-cyan-800 border-cyan-200", color: "#0891b2" },
  ready: { label: "Pronta", className: "bg-emerald-50 text-emerald-800 border-emerald-200", color: "#059669" },
  delivered: { label: "Entregue", className: "bg-green-100 text-green-900 border-green-300", color: "#15803d" },
  cancelled: { label: "Cancelada", className: "bg-zinc-100 text-zinc-600 border-zinc-300", color: "#71717a" },
  unrepairable: { label: "Sem conserto", className: "bg-red-50 text-red-800 border-red-200", color: "#b42318" },
};

export const ORDER_STATUS_LIST = Object.keys(ORDER_STATUS) as ServiceOrderStatus[];

/** Status que ainda exigem ação da equipe. */
export const OPEN_STATUSES: ServiceOrderStatus[] = [
  "pending",
  "evaluating",
  "approved",
  "waiting_parts",
  "in_repair",
  "testing",
  "ready",
];

/** Transições válidas (espelha models.validTransitions do backend). */
export const NEXT_STATUSES: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  pending: ["evaluating", "cancelled"],
  evaluating: ["approved", "unrepairable", "cancelled"],
  approved: ["waiting_parts", "in_repair", "cancelled"],
  waiting_parts: ["in_repair", "unrepairable", "cancelled"],
  in_repair: ["testing", "waiting_parts", "unrepairable", "cancelled"],
  testing: ["ready", "in_repair", "unrepairable", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
  unrepairable: [],
};

export function statusLabel(status: string): string {
  return ORDER_STATUS[status as ServiceOrderStatus]?.label ?? status;
}

export const SERVICE_TYPES = [
  "Troca de tela",
  "Troca de bateria",
  "Conector de carga",
  "Software / formatação",
  "Oxidação / líquido",
  "Placa / microsolda",
  "Câmera / áudio",
  "Outro",
];

export const DEVICE_TYPES = ["Smartphone", "Tablet", "Notebook", "Smartwatch", "Outro"];

export const DEFAULT_CHECKLIST = [
  "Liga",
  "Tela sem trincas",
  "Touch funcionando",
  "Câmeras funcionando",
  "Áudio / microfone",
  "Carrega",
  "Wi-Fi / Bluetooth",
  "Biometria / Face ID",
  "Sinais de oxidação",
  "Bandeja de chip presente",
];