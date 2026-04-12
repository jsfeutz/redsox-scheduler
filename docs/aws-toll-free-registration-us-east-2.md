# US toll-free SMS registration (Ohio — `us-east-2`)

Registration ID: **`registration-e1d3e513a6bc4082b451c3c6121737a4`**  
Type: **`US_TOLL_FREE_REGISTRATION`**

This doc matches the app changes (public `/business-verification`, Help Wanted SMS checkbox, `/sms-consent`).

## 1. Fill org contact in the repo

Edit **`src/config/public-org-verification.ts`** so it matches what you will submit to AWS:

- Mailing address (line1, city, state, zip)
- Authorized contact first/last name
- Support email (monitored inbox)
- Support phone in E.164 (`+1…`)
- Optional: EIN in `taxId` (+ keep `taxIdAuthority` / `taxIdCountry` if you use EIN)

Deploy the site **before** resubmitting so reviewers can open:

- **https://schedule.rubiconredsox.com/** (public home — club info, no login)
- **https://schedule.rubiconredsox.com/business-verification** (verification page)
- **https://schedule.rubiconredsox.com/help-wanted** (opt-in form with checkbox when phone entered)
- **https://schedule.rubiconredsox.com/sms-consent** (full program copy)

In the AWS form, set **Company website** to the **home page** or **business-verification** URL (both are public, no password).

## 2. Opt-in screenshot (`optInImage`)

AWS requires an attachment:

1. Open **Help Wanted** on production, click a job signup so the form shows.
2. Enter a **fake** test phone so the **SMS consent checkbox** appears.
3. Screenshot the **phone field + checkbox + surrounding context** (URL visible if possible).
4. In **AWS Console → End User Messaging → Registrations → your registration**, upload the image per the wizard, **or** use `create-registration-attachment` + `put-registration-field-value` with `--registration-attachment-id` (see AWS docs).

Use the **same** opt-in story as in `smsProgramOptInDescriptionAws` in `public-org-verification.ts`.

## 3. Set field values (CLI outline)

Profile: **`feutz-aws`**, region: **`us-east-2`**.

Replace placeholders with your real values (same as `public-org-verification.ts`).

```bash
REG=registration-e1d3e513a6bc4082b451c3c6121737a4
PROFILE=feutz-aws
REGION=us-east-2

put() { aws pinpoint-sms-voice-v2 put-registration-field-value \
  --profile "$PROFILE" --region "$REGION" \
  --registration-id "$REG" --field-path "$1" "${@:2}"; }

# Company
put companyInfo.companyName --text-value "Rubicon Redsox Baseball Club"
put companyInfo.businessType --select-choices NON_PROFIT
put companyInfo.website --text-value "https://schedule.rubiconredsox.com"
put companyInfo.address1 --text-value "YOUR_STREET_OR_PO_BOX"
put companyInfo.city --text-value "Rubicon"
put companyInfo.state --text-value "WI"
put companyInfo.zipCode --text-value "YOUR_ZIP"
put companyInfo.isoCountryCode --text-value "US"

# Optional EIN (if you use taxId, also set authority + country in console or CLI)
# put companyInfo.taxId --text-value "12-3456789"
# put companyInfo.taxIdAuthority --select-choices EIN
# put companyInfo.taxIdCountry --text-value "US"

# Contact (must match someone who can respond to carrier questions)
put contactInfo.firstName --text-value "First"
put contactInfo.lastName --text-value "Last"
put contactInfo.supportEmail --text-value "you@example.com"
put contactInfo.supportPhoneNumber --text-value "+1XXXXXXXXXX"

# Use case
put messagingUseCase.useCaseCategory --select-choices NON_PROFIT
put messagingUseCase.monthlyMessageVolume --select-choices "100"
put messagingUseCase.optInType --select-choices DIGITAL_FORM
put messagingUseCase.useCaseDetails --text-value "PASTE smsProgramUseCaseDetailsAws from public-org-verification.ts"
put messagingUseCase.optInDescription --text-value "PASTE smsProgramOptInDescriptionAws from public-org-verification.ts"
# optInImage: set via attachment ID after upload — in console is easiest

put messageSamples.messageSample1 --text-value "PASTE smsMessageSample1Aws from public-org-verification.ts"
```

## 4. New version + submit

After all required fields (including **opt-in image** attachment) are set on the **current draft**:

```bash
aws pinpoint-sms-voice-v2 create-registration-version \
  --profile feutz-aws --region us-east-2 \
  --registration-id registration-e1d3e513a6bc4082b451c3c6121737a4

aws pinpoint-sms-voice-v2 submit-registration-version \
  --profile feutz-aws --region us-east-2 \
  --registration-id registration-e1d3e513a6bc4082b451c3c6121737a4
```

Confirm the new version with `describe-registration-versions`. In the console, follow the same **Save draft → Create version → Submit** flow if you prefer UI.

## 5. Past denials (what we fixed)

- **Website behind login:** Added explicit public **business verification** page and clarified home/help-wanted/sms-consent are public.
- **Opt-in language / workflow:** Help Wanted now requires an **explicit checkbox** when a phone number is entered; copy states **frequency**, **rates**, **STOP**, and **SMS** explicitly.
- **v6 missing fields:** Complete **all** required fields in console or CLI before submitting; do not submit an empty draft.
