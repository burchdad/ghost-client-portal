export type LeadIdentity = {
  company: string;
  email: string | null;
  phone: string | null;
  website: string | null;
};

export function leadIdentityTokens(lead: LeadIdentity) {
  const company = lead.company
    .toLowerCase()
    .replace(/\b(?:llc|inc|incorporated|corp|corporation|company|co)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const email = lead.email?.trim().toLowerCase();
  const phone = lead.phone?.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  let website = "";
  try {
    website = new URL(
      /^https?:\/\//i.test(lead.website || "")
        ? lead.website!
        : `https://${lead.website}`,
    ).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    /* Missing website. */
  }
  if (!lead.website) website = "";
  return [
    company && `company:${company}`,
    email && `email:${email}`,
    phone && phone.length >= 10 && `phone:${phone}`,
    website && `website:${website}`,
  ].filter((value): value is string => Boolean(value));
}

export function deduplicateVegaLeads<T extends LeadIdentity>(
  candidates: T[],
  existing: LeadIdentity[] = [],
) {
  const seen = new Set(existing.flatMap(leadIdentityTokens));
  return candidates.filter((lead) => {
    const tokens = leadIdentityTokens(lead);
    if (tokens.some((token) => seen.has(token))) return false;
    tokens.forEach((token) => seen.add(token));
    return true;
  });
}
