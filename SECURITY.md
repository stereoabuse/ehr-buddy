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
| Windows | `%APPDATA%\EHR Buddy\ehrbuddy.db`                      |
| macOS   | `~/Library/Application Support/ehr-buddy/ehrbuddy.db`   |

This file contains client names, contact information, diagnoses, session notes, fee history, and clinician details.

**Uninstalling EHR Buddy does NOT delete this file.** This is intentional -- accidental data loss is worse than leftover files. If you need to remove the database, delete it manually after confirming you have a backup.

---

## 3. Tax ID / SSN risk

The clinician profile includes a `tax_id` field. If you enter your Social Security Number here, it is stored as plain text in the SQLite database. Disk encryption is the only control protecting it.

**Recommendation:** Use an EIN (Employer Identification Number) instead of your SSN whenever possible. You can apply for an EIN from the IRS at no cost.

---

## 4. Backups

The one-click backup feature copies the database file to a location you choose. The backup is an unencrypted copy of the full database.

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

## 7. No audit log (v1 limitation)

EHR Buddy v1 does not record who accessed or modified records, or when. HIPAA requires covered entities to track access to PHI.

- Be aware of this gap when assessing your compliance posture.
- A future version may add audit logging.
- If you are subject to a compliance audit, document this limitation and your compensating controls (disk encryption, physical security, screen lock).

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
- [ ] Superbills are sent via encrypted email or secure messaging
- [ ] Tax ID field uses EIN rather than SSN
- [ ] Computer screen is not visible to unauthorized people during use

---

## Questions

This document is guidance, not legal advice. Consult a HIPAA compliance specialist or healthcare attorney if you need a formal risk assessment for your practice.
