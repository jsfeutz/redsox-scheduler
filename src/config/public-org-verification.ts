/**
 * Public org + contact details shown on `/business-verification` (carrier / AWS toll-free review).
 * Must match what is submitted in AWS End User Messaging (Pinpoint SMS)
 * Align with Pinpoint SMS toll-free registration in us-east-2 (e.g. `registration-0de29d4dd6f64197a3d970bddcfb29b8`): company name, address, website, contact, sole proprietor, no EIN on SP flow.
 */
export type PublicOrgVerification = {
  /** Legal name on ID / how you file as sole proprietor (must match AWS registration). */
  legalName: string;
  /** Public-facing program or registered DBA, if different from legalName. */
  doingBusinessAs?: string;
  businessTypeAws: string;
  websiteUrl: string;
  mailingAddressLine1: string;
  mailingAddressLine2: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  isoCountryCode: string;
  taxId: string;
  taxIdAuthority: string;
  taxIdCountry: string;
  authorizedContactFirstName: string;
  authorizedContactLastName: string;
  supportEmail: string;
  supportPhoneE164: string;
};

export const publicOrgVerification: PublicOrgVerification = {
  /** Match government ID / AWS `companyInfo.companyName` (no middle initial if that’s what’s on file). */
  legalName: "Jonathan Feutz",
  /** How you operate publicly when using your full professional name (DBA). */
  doingBusinessAs: "Jonathan S Feutz",
  businessTypeAws: "SOLE_PROPRIETOR",
  websiteUrl: "https://schedule.rubiconredsox.com",
  mailingAddressLine1: "W1195 Paine Rd",
  mailingAddressLine2: "",
  mailingCity: "Rubicon",
  mailingState: "WI",
  mailingZip: "53078",
  isoCountryCode: "US",
  /** Sole proprietor: leave empty on AWS; do not submit LLC/corp EIN in SP-only flow. */
  taxId: "",
  taxIdAuthority: "",
  taxIdCountry: "",
  authorizedContactFirstName: "Jonathan",
  authorizedContactLastName: "Feutz",
  supportEmail: "support@rubiconredsox.com",
  supportPhoneE164: "+19209419447",
};
