import { getDb } from '../connection'
import type { Clinician, ClinicianInput } from '../../../shared/types'

export function get(): Clinician | undefined {
  return getDb().prepare("SELECT * FROM clinician WHERE id = 'singleton'").get() as
    | Clinician
    | undefined
}

export function upsert(input: ClinicianInput): Clinician {
  const now = new Date().toISOString()
  const row = {
    id: 'singleton',
    full_name: input.full_name,
    credentials: input.credentials ?? null,
    npi: input.npi ?? null,
    license_number: input.license_number ?? null,
    tax_id: input.tax_id ?? null,
    practice_name: input.practice_name ?? null,
    address_line1: input.address_line1 ?? null,
    address_line2: input.address_line2 ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postal_code: input.postal_code ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    default_fees_json:
      input.default_fees && Object.keys(input.default_fees).length > 0
        ? JSON.stringify(input.default_fees)
        : null,
    updated_at: now
  }

  const existing = get()
  if (existing) {
    getDb()
      .prepare(
        `UPDATE clinician SET
          full_name = @full_name, credentials = @credentials, npi = @npi,
          license_number = @license_number, tax_id = @tax_id,
          practice_name = @practice_name,
          address_line1 = @address_line1, address_line2 = @address_line2,
          city = @city, state = @state, postal_code = @postal_code,
          phone = @phone, email = @email,
          default_fees_json = @default_fees_json,
          updated_at = @updated_at
        WHERE id = 'singleton'`
      )
      .run(row)
  } else {
    getDb()
      .prepare(
        `INSERT INTO clinician (
          id, full_name, credentials, npi, license_number, tax_id,
          practice_name,
          address_line1, address_line2, city, state, postal_code,
          phone, email,
          default_fees_json, updated_at
        ) VALUES (
          @id, @full_name, @credentials, @npi, @license_number, @tax_id,
          @practice_name,
          @address_line1, @address_line2, @city, @state, @postal_code,
          @phone, @email,
          @default_fees_json, @updated_at
        )`
      )
      .run(row)
  }

  return get()!
}
