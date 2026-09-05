/**
 * Single source of truth for the legal/registration identity of the
 * business. Previously "Vikas Maurya" / "vikasmaurya@shopka.in" was
 * hardcoded separately in Footer.tsx, terms/page.tsx and privacy/page.tsx —
 * three copies that only stayed in sync by luck. That is exactly the kind of
 * drift that made different pages disagree before. Update it here once.
 *
 * Registration reference: Udyam Registration Number UDYAM-UP-31-0053970
 * (Micro enterprise, NIC 47912 — retail sale via e-commerce), registered
 * 06/02/2026 under the Ministry of MSME, Government of India.
 */
export const COMPANY = {
  legalName: "Shopka",
  operatorName: "Vikas Maurya",
  operatorEmail: "vikasmaurya@shopka.in",
  udyamNumber: "UDYAM-UP-31-0053970",
} as const;

/** Named point of contact required by the Consumer Protection (E-Commerce)
 *  Rules, 2020 and reused for the DPDP Act, 2023 grievance contact. */
export const GRIEVANCE_OFFICER = {
  name: COMPANY.operatorName,
  email: COMPANY.operatorEmail,
} as const;
