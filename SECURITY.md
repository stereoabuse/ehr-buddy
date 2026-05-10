# Security and HIPAA Guidance

EHR Buddy stores Protected Health Information (PHI) on your computer. As a mental health clinician, you are a HIPAA covered entity. This document explains what the app does and does not protect, and what steps you need to take yourself.

**Read this before using the app with real patient data.**

---

## The short version

EHR Buddy keeps everything local -- no cloud, no internet, no third-party servers. That removes many common attack surfaces, but it does NOT remove your HIPAA obligations. The biggest risk is someone gaining physical access to your computer or its hard drive. Disk encryption is the single most important thing you can do.

---

## 1. Encrypt your disk (required)

If your laptop is lost or stolen and the disk is not encrypted, anyone can read your patient records. Under HIPAA, this is a reportable breach.

**Turn on disk encryption now if you have not already.**

### Windows

- **Windows Pro/Enterprise:** Enable BitLocker. Go to Settings > Privacy & Security > Device encryption, or search "BitLocker" in the Start menu.
- **Windows Home:** Enable Device Encryption. Go to Settings > Privacy & Security > Device encryption. (Requires a Microsoft account and TPM hardware, which most modern laptops have.)

### macOS

- Enable FileVault. Go to System Settings > Privacy & Security > FileVault > Turn On.

Verify encryption is active. Do not assume it is on by default.

---

## 2. Where PHI is stored

All data lives in a single SQLite database file:

| OS      | Path                                                    |
|---------|---------------------------------------------------------|
| Windows | `%APPDATA%\EHR Buddy\ehrbuddy.db`                       |
| macOS   | `~/Library/Application Support/EHR Buddy/ehrbuddy.db`   |

This file contains client names, contact information, diagnoses, session notes, fee history, and clinician details.

**Uninstalling EHR Buddy does NOT delete this file.** This is intentional -- accidental data loss is worse than leftover files. If you need to remove the database, delete it manually after confirming you have a backup.

---

## 3. Tax ID / SSN risk

The clinician profile includes a `tax_id` field. If you enter your Social Security Number here, it is stored as plain text in the SQLite database. Disk encryption is the only control protecting it.

**Recommendation:** Use an EIN (Employer Identification Number) instead of your SSN whenever possible. You can apply for an EIN from the IRS at no cost.

---

## 4. Backups

The **Back up now** feature copies the database file to a location you choose. The backup is an unencrypted copy of the full database.

The **Export full archive** feature creates a ZIP file containing:

- `ehrbuddy.db` -- the SQLite database
- `documents/` -- uploaded document files
- `exports/` -- CSV exports for clients, sessions, notes, amendments, documents, and audit log
- `manifest.json` -- export timestamp, app version, platform, and row counts

- Store backups on an encrypted external drive or encrypted cloud storage.
- Do not leave backup copies on unencrypted USB drives, shared network folders, or desktop folders on unencrypted machines.
- Treat every backup copy with the same care as the original database.

---

## 5. Superbill PDFs and email

Superbill PDFs contain PHI: client name, diagnosis codes, dates of service, fees, and your clinician details. The moment you email a superbill, PHI has left your machine and is subject to the security of your email provider.

- **Standard email (Gmail, Outlook, Yahoo) is not HIPAA-compliant** for sending PHI without a Business Associate Agreement.
- **Recommended:** Use an encrypted email service such as ProtonMail, or send the PDF through a HIPAA-compliant secure messaging platform.
- A future version may add password-protected PDF export. Until then, treat every superbill PDF as unprotected PHI.

---

## 6. No user authentication (v1 limitation)

EHR Buddy v1 does not have a login screen, password, or PIN. Anyone who can open the app on your computer has full access to all patient records.

- Lock your computer whenever you step away (Win+L on Windows, Control+Command+Q on macOS).
- Use a strong login password for your operating system account.
- Do not share your user account with other people.

---

## 7. Audit log

EHR Buddy records every read, edit, and export of patient data to satisfy HIPAA §164.312(b) (audit controls). The log captures:

- Timestamp (ISO 8601)
- OS user account that ran the app
- Action (e.g. `client_view`, `session_update`, `superbill_generate`, `backup_run`)
- Entity type and ID
- A small JSON details blob (e.g. fee, paid status, output path)

The log lives in the same SQLite database as your other data, in a table called `audit_log`. The table has database triggers that block any UPDATE or DELETE — entries can only be appended. SQLite cannot enforce this against an attacker who edits the file directly with another tool, so disk security still matters, but the app itself cannot tamper with past entries.

You can browse the log under **Activity** in the app and export the full history to CSV for record keeping or a compliance audit.

---

## 8. Physical security

Because all data is local and unprotected by a login, physical security of your device is critical.

- Do not leave your laptop unattended in public places.
- Use a privacy screen in clinical settings if your monitor faces a waiting area.
- When disposing of or selling your computer, securely wipe the drive or physically destroy it.

---

## 9. Summary checklist

- [ ] Disk encryption is enabled and verified (BitLocker / Device Encryption / FileVault)
- [ ] OS user account has a strong password
- [ ] Computer locks automatically after a short idle period
- [ ] Backups are stored on encrypted media only
- [ ] Full archives or database/document backups are stored on encrypted media only
- [ ] Superbills are sent via encrypted email or secure messaging
- [ ] Tax ID field uses EIN rather than SSN
- [ ] Computer screen is not visible to unauthorized people during use

---

## 10. Uploaded documents and backups

When you upload a consent form (or any document) for a client, the file is copied into a folder next to the database:

| OS      | Path                                                              |
|---------|-------------------------------------------------------------------|
| Windows | `%APPDATA%\EHR Buddy\documents\`                                  |
| macOS   | `~/Library/Application Support/EHR Buddy/documents/`              |

Files are stored unencrypted on disk, with the same threat model as the SQLite database — disk encryption is your control. Only metadata (label, type, size, original filename) lives in the database; the bytes live in this folder, named with a random UUID + the original extension.

**Back up now** copies only the database file. **Export full archive** includes both the database and the documents folder, along with human-readable CSV exports. If you use the database-only backup, back up the documents folder separately.

If you delete a document from inside EHR Buddy, the file is removed from disk and the database row is removed. Archiving a client does not delete their documents. Permanently deleting a client removes their uploaded document files and database records.

---

## Questions

This document is guidance, not legal advice. Consult a HIPAA compliance specialist or healthcare attorney if you need a formal risk assessment for your practice.
