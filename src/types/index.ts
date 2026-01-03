export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
  starred: boolean;
  parentId: string | null;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  storage: string;
  transfer: string;
  speed: string;
  users: string;
  support: string;
  features: string[];
  fluxFeatures?: string[];
  popular?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  cta: string;
}

export interface ShareLink {
  id: string;
  file_id: string;
  url: string;
  has_password: boolean;
  expires_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
}

export interface ShareLinkCreate {
  file_id: string;
  password?: string;
  expires_in?: "24h" | "7d" | "30d" | null;
}

export interface ShareInfo {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  has_password: boolean;
  expires_at: string | null;
  expired: boolean;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}
