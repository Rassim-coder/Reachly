export const TEMPLATE_CHANNELS = ["email", "whatsapp"] as const;

export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

export const TEMPLATE_CHANNEL_LABELS: Record<TemplateChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
};

export type TemplateItem = {
  id: string;
  name: string;
  channel: TemplateChannel;
  /** Always null for WhatsApp templates. */
  subject: string | null;
  body: string;
  createdAt: string;
  updatedAt: string | null;
};

export type TemplateInput = {
  name: string;
  channel: TemplateChannel;
  subject: string;
  body: string;
};

/**
 * Real data available to personalize a template for one saved lead. A value is
 * null when Reachly does not actually have it. Nothing is guessed.
 */
export type TemplateLeadContext = {
  businessName: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  /** Reachly does not store a contact person yet, so this is always null. */
  contactName: string | null;
  yourName: string | null;
};