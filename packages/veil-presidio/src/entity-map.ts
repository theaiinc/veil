import type { VeilEntityType } from "@theaiinc/veil";

/** Maps Presidio Analyzer entity_type values onto Veil entity types. */
const MAP: Record<string, VeilEntityType> = {
  PERSON: "person",
  EMAIL_ADDRESS: "email",
  PHONE_NUMBER: "phone",
  LOCATION: "address",
  URL: "url",
  DOMAIN_NAME: "url",
  ORGANIZATION: "organization",
  NRP: "organization",
  IP_ADDRESS: "custom",
  CREDIT_CARD: "custom",
  IBAN_CODE: "custom",
  US_SSN: "custom",
};

export function mapPresidioType(entityType: string): VeilEntityType {
  return MAP[entityType] ?? "custom";
}
