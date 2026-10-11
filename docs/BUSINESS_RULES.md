# Home Credit Loan Against Property (LAP) — Business Rules Specification

This document details the exact qualification criteria, stage transitions, and disqualification thresholds enforced by the AI Voice Agent application.

---

## 1. Product Summary & Scope
- **Offer Title**: Pre-approved Loan Against Property (LAP) preliminary qualification.
- **Audience**: Existing Home Credit customers.
- **Maximum Loan Amount**: ₹75,00,000 (₹75 Lakhs).
- **Offer Nature**: Preliminary pre-qualification check; does not constitute final sanction or legal signoff.

---

## 2. Early Call Stages

### Stage 1: Greeting & Verification
- Agent introduces themselves as calling from Home Credit India regarding the pre-approved LAP offer.
- Checks if the intended customer is available.
- If the customer is **busy**:
  1. Acknowledge politely without pressure.
  2. Ask for a convenient callback time.
  3. Record the requested time.
  4. End call cleanly with outcome: `CALLBACK_REQUESTED`.
  5. Do **not** ask eligibility questions.

### Stage 2: Offer Presentation
- State the offer up to ₹75 Lakhs.
- If customer states they are **not interested / declines**:
  1. Conclude politely.
  2. Record outcome: `DECLINED`.

### Stage 3: Loan Transfer & Existing Loan Detection
- If customer states they already have an existing loan on the property or wish to reduce an existing EMI:
  1. Stop fresh LAP eligibility flow immediately.
  2. Route to the **Loan Transfer Specialist** desk.
  3. Inform customer that a specialist will review their balance transfer.
  4. Record outcome: `LOAN_TRANSFER_SPECIALIST_REQUIRED`.
  5. *Note*: Unrelated personal or vehicle loans do not trigger this transfer.

---

## 3. The 7 Eligibility Checklist Items

| # | Item | Eligible Criteria | Immediate Disqualification / Routing |
|---|------|-------------------|---------------------------------------|
| 1 | **Property Type** | Residential, Commercial, Industrial | **Agricultural property** triggers immediate `DISQUALIFIED`. |
| 2 | **Ownership Status** | Sole ownership or Joint ownership (Both are 100% eligible). | N/A (Joint ownership is completely acceptable). |
| 3 | **Original Documents** | Original title deeds must be available for physical verification (at home, locker, etc.). | **Only photocopies / unavailable originals** triggers immediate `DISQUALIFIED`. |
| 4 | **Desired Loan Amount** | Up to ₹75,00,000 (₹75 Lakhs). | If requested amount > ₹75L, offer alternative cap of ₹75L. If customer accepts, proceed with ₹75L. If customer declines, record `MAXIMUM_AMOUNT_NOT_ACCEPTED`. |
| 5 | **Occupation & Income Mode** | Salaried or Self-employed. Income must be received through a **Bank Account**. | **Cash income** triggers immediate `DISQUALIFIED`. |
| 6 | **Property Market Value** | Estimated current market value in INR. | **No arbitrary minimum threshold**. Do not disqualify on market value. |
| 7 | **Desired Tenure** | 3 to 15 Years inclusive (e.g., 3, 5, 10, 15). | Tenures **< 3 years** or **> 15 years** trigger immediate `DISQUALIFIED`. |

---

## 4. Final Outcomes
- `QUALIFIED_FOR_HUMAN_HANDOFF`: All 7 checklist items captured and verified eligible. Senior loan expert handoff arranged.
- `DISQUALIFIED`: Fails any mandatory eligibility criterion (agricultural land, missing original deeds, cash income, tenure out of bounds).
- `LOAN_TRANSFER_SPECIALIST_REQUIRED`: Existing property loan or EMI reduction requested.
- `CALLBACK_REQUESTED`: Customer was busy and provided callback preference.
- `DECLINED`: Customer declined the loan offer.
- `MAXIMUM_AMOUNT_NOT_ACCEPTED`: Customer needed > ₹75L and declined the ₹75L maximum alternative.
- `INCOMPLETE`: Call ended by user before qualification reached a conclusion.
- `ERROR`: System exception occurred.
