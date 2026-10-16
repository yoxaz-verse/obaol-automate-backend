export type OffPlatformDisclosureKind =
  | "phone"
  | "email"
  | "website"
  | "social_handle"
  | "company_name";

export type OffPlatformDisclosureViolation = { kind: OffPlatformDisclosureKind; message: string };
export type OffPlatformDisclosureOptions = { companyNames?: Array<string | null | undefined> };

export const OFF_PLATFORM_DISCLOSURE_MESSAGES: Record<OffPlatformDisclosureKind, string> = {
  phone: "Phone numbers are not allowed in this field.",
  email: "Email addresses are not allowed in this field.",
  website: "Website links are not allowed in this field.",
  social_handle: "Social media or messaging contact details are not allowed in this field.",
  company_name: "Company names are not allowed in this field.",
};

const DIGIT_PHONE_PATTERN = /(?:\+?\s*)?(?:\(?\d\)?[\s().-]*){7,}/;
const EMAIL_PATTERN = /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i;
const OBFUSCATED_EMAIL_PATTERN = /\b[a-z0-9._%+-]+\s+(?:at|\[at\]|\(at\))\s+[a-z0-9-]+(?:\s+(?:dot|\[dot\]|\(dot\))\s+[a-z]{2,})+\b/i;
const WEBSITE_PATTERN = /(?:\b(?:https?:\/\/|www\.)[^\s]+|\b(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)+(?:com|org|net|io|in|co|biz|info|app|dev|ai|me|store|online|site|website)\b)/i;
const OBFUSCATED_WEBSITE_PATTERN = /\b[a-z0-9][a-z0-9-]*(?:\s+(?:dot|\[dot\]|\(dot\))\s+(?:com|org|net|io|in|co|biz|info|app|dev|ai|me|store|online|site|website))\b/i;
const SOCIAL_HANDLE_PATTERN = /(^|\s)@[a-z][a-z0-9._-]{2,}\b/i;
const CONTACT_PLATFORM_PATTERN = /\b(?:whats?app|telegram|signal|wechat)\b.{0,32}(?:@|\b(?:me|number|username|handle|id|on|at)\b|\d)/i;
const CONTACT_PHRASE_PATTERN = /\b(?:dm|direct message|message|contact)\s+me\s+(?:on|at|via)\b/i;
const NUMBER_WORDS: Record<string, number> = { zero: 1, oh: 1, o: 1, one: 1, two: 1, three: 1, four: 1, five: 1, six: 1, seven: 1, eight: 1, nine: 1 };
const MULTIPLIERS: Record<string, number> = { double: 2, triple: 3 };
const LEGAL_SUFFIXES = new Set(["private", "pvt", "limited", "ltd", "llp", "inc", "incorporated", "corp", "corporation", "company", "co", "plc", "llc", "enterprise", "enterprises"]);

const normalize = (value: unknown) => String(value ?? "").normalize("NFKC").toLowerCase().replace(/[’']/g, "'");
const normalizedWords = (value: unknown) => normalize(value).replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

const containsWordPhoneNumber = (value: unknown): boolean => {
  const tokens = normalize(value).match(/[a-z]+|\d+/g) || [];
  let run = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (/^\d+$/.test(token)) run += token.length;
    else if (NUMBER_WORDS[token]) run += NUMBER_WORDS[token];
    else if (MULTIPLIERS[token] && NUMBER_WORDS[tokens[index + 1]]) {
      run += MULTIPLIERS[token] * NUMBER_WORDS[tokens[index + 1]];
      index += 1;
    } else run = 0;
    if (run >= 7) return true;
  }
  return false;
};

const companyVariants = (companyNames: Array<string | null | undefined>): string[] => {
  const variants = new Set<string>();
  for (const companyName of companyNames) {
    const normalized = normalizedWords(companyName);
    if (!normalized) continue;
    variants.add(normalized);
    const core = normalized.split(" ").filter((word) => !LEGAL_SUFFIXES.has(word)).join(" ").trim();
    if (core.length >= 4) variants.add(core);
  }
  return [...variants].sort((a, b) => b.length - a.length);
};

const containsCompanyName = (value: unknown, names: Array<string | null | undefined>): boolean => {
  const text = ` ${normalizedWords(value)} `;
  return companyVariants(names).some((variant) => text.includes(` ${variant} `));
};

export const detectOffPlatformDisclosure = (value: unknown, options: OffPlatformDisclosureOptions = {}): OffPlatformDisclosureViolation | null => {
  const text = normalize(value);
  if (!text.trim()) return null;
  let kind: OffPlatformDisclosureKind | null = null;
  if (EMAIL_PATTERN.test(text) || OBFUSCATED_EMAIL_PATTERN.test(text)) kind = "email";
  else if (WEBSITE_PATTERN.test(text) || OBFUSCATED_WEBSITE_PATTERN.test(text)) kind = "website";
  else if (DIGIT_PHONE_PATTERN.test(text) || containsWordPhoneNumber(text)) kind = "phone";
  else if (SOCIAL_HANDLE_PATTERN.test(text) || CONTACT_PLATFORM_PATTERN.test(text) || CONTACT_PHRASE_PATTERN.test(text)) kind = "social_handle";
  else if (containsCompanyName(text, options.companyNames || [])) kind = "company_name";
  return kind ? { kind, message: OFF_PLATFORM_DISCLOSURE_MESSAGES[kind] } : null;
};
