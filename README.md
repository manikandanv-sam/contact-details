# Contact Details IFRAME

A vanilla JS iframe that renders borrower and guarantor contact details. The host CMP communicates with it exclusively via `postMessage`.

---

## Project Structure

```
contact-details/
├── index.html                      # IFRAME entry point (loaded inside iframe)
├── CMP_Parent.html                 # Mock host app for local development
├── env.js                          # Runtime config — gitignored, never commit
├── env.example.js                  # CI/CD template with __PLACEHOLDER__ values
├── styles/
│   └── main.css                    # All IFRAME styles
└── js/
    ├── main.js                     # Entry point: postMessage setup, DOM events
    ├── config.js                   # Reads window.ENV, exports typed config values
    ├── store.js                    # Shared mutable state (appContext, uiState)
    ├── constants/
    │   ├── message-types.js        # MESSAGE_TYPES enum (frozen object)
    │   ├── mock-data.js            # Mock response for PAN flow
    │   └── customer-id-mock.js     # Mock response for customerId flow
    ├── services/
    │   ├── customer-api.js         # Flow dispatcher (customerId → or PAN →)
    │   ├── customer-id-api.js      # customerId flow: fetches LMS, maps to UI shape
    │   └── otp-service.js          # OTP send/verify (6-digit)
    ├── ui/
    │   ├── borrower.js             # Renders borrower fields into DOM
    │   ├── guarantor.js            # Guarantor dropdown render + selection
    │   ├── sheet.js                # Bottom sheet: OTP flow, update, success screen
    │   └── notifications.js        # Loader, error display
    └── utils/
        └── validators.js           # Field validation rules
```

---

## Running Locally

No build step. Serve the folder over HTTP (required for ES modules).

```bash
cd contact-details
python3 -m http.server 5500
```

- **IFRAME standalone**: http://localhost:5500/index.html
- **With mock host**: http://localhost:5500/CMP_Parent.html

Open `CMP_Parent.html` to simulate the full IFRAME flow — it sends `INIT` on load with mock customer data.

---

## Environment Setup

1. Copy the template:

   ```bash
   cp env.example.js env.js
   ```

2. Fill in `env.js` with real values:
   ```js
   window.ENV = {
     USE_MOCK: false, // true → uses local mock data
     BASE_URL: "https://api.samunnati.com", // changes per environment
     CUSTOMER_API_BASE: "http://localhost:1111",
     OTP_API_KEY: "<your-otp-api-key>",
     LMS_API_KEY: "<your-lms-api-key>",
     CLIENT_ID: "<your-client-id>",
   };
   ```

`env.js` is gitignored — never commit it. For CI/CD, use `env.example.js` as a template and substitute placeholders via `sed` in your pipeline.

### Mock vs Real API

Flip `USE_MOCK` in `env.js` to switch globally across all IFRAME services:

| `USE_MOCK` | Behaviour                                 |
| ---------- | ----------------------------------------- |
| `true`     | Returns local mock data, no network calls |
| `false`    | Calls real APIs using keys from `env.js`  |

Mock OTP code: **`123456`**

---

## postMessage Contract

The IFRAME communicates with the host CMP using `window.postMessage`. Both sides must be on known origins in production.

### Signals sent by IFRAME → CMP

| Type              | When                                                 |
| ----------------- | ---------------------------------------------------- |
| `IFRAME_READY`    | On load, IFRAME is ready to receive `INIT`           |
| `IFRAME_DOWN`     | On `beforeunload`, best-effort teardown notification |
| `CONTACT_UPDATED` | After a successful contact field update              |
| `OTP_SENT`        | After OTP is dispatched                              |
| `ERROR`           | On unrecoverable error                               |

### Signal sent by CMP → IFRAME

| Type   | Payload                                        | When                           |
| ------ | ---------------------------------------------- | ------------------------------ |
| `INIT` | `{ pan, customerId, lan, token, customerUrn }` | After receiving `IFRAME_READY` |

### Sequence

```
CMP                          IFRAME
 |                               |
 |                    IFRAME_READY sent on load
 |<------------------------------|
 |
 |  INIT { pan, customerId, ... }
 |------------------------------>|
 |                               | loadCustomerData()
 |                               | renders borrower UI
 |                               |
 |             [user navigates away]
 |                    IFRAME_DOWN sent on beforeunload
 |<------------------------------|
```

---

## Customer Data Flows

### customerId Flow (active)

When CMP sends `customerId` in `INIT`:

1. Calls `GET {BASE_URL}/lms/v1/findCustomerLoanAccounts?customerId={id}`
2. Maps `customer.customerName` + `customer.contact` → borrower shape
3. Renders via `applyBorrowerUI()`

**Headers**: `x-api-key: LMS_API_KEY`, `Authorization: Bearer {token}`

### PAN Flow (placeholder)

When CMP sends only `pan` (no `customerId`): placeholder in `customer-api.js`. To be implemented.

---

## Idempotency

If the CMP sends `INIT` multiple times with the same `pan:customerId` combination (e.g. user navigates away and back), the IFRAME skips reloading. Context is re-fetched only when the identity changes.

---

## Adding a New Environment

1. Update `env.example.js` with any new `__PLACEHOLDER__` keys.
2. Read the new key in `js/config.js` and export a named constant.
3. Use the constant in the relevant service — never read `window.ENV` outside `config.js`.
