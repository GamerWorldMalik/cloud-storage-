# CloudVault Cloud API Integration & Expanded High-Capacity Storage

CloudVault Storage is integrating an external cloud storage provider API key (`cb_ede5e4f6d64a074b7ba88e8931f08c4686bb0396d642e06732a81e0efa195665`) to power genuine cloud file hosting, providing permanent public URLs, server-side proxy upload handling, expanded storage tiers, and seamless cross-device sharing without losing strict quota and anti-fraud protections.

## User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions were dismissed, so the following recommended production configurations are set as default:
> - **Storage Backend**: The `cb_...` token is configured as an authenticated Catbox cloud storage userhash backend. Uploads will be transmitted to Catbox's permanent storage engine via a secure server proxy (`/api/upload-cloud`) to bypass browser CORS limitations.
> - **Quota & Upload Enforcement**: All uploads will strictly enforce the **20% single-file quota limit** (e.g. 50 MB max per single file on 250 MB quota, 110 MB on 550 MB quota) and total storage ceilings.
> - **Anti-Fraud & Real Data Integrity**: No mock data or fake upgrade simulators. Upgrades (10 Tk / 100 MB and 50 Tk / 550 MB) retain authentic mobile financial service transaction validation (bKash/Nagad/Rocket/Upay) and 30-day single-purchase cooldowns.
> - **Dual-Layer Persistence**: Metadata and fallback copies remain cached in IndexedDB and LocalStorage, while actual files receive permanent cloud URLs (`https://files.catbox.moe/...`) accessible publicly without login.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades CloudVault from purely local browser storage to a real hybrid cloud storage ecosystem. User uploads are securely dispatched to the authenticated cloud storage provider (`cb_...` userhash), generating real, permanent, shareable web URLs with audio/video/image streaming and direct download capabilities.
- **Target Audience / Persona**: Personal and collaborative users in Bangladesh and worldwide who want reliable, persistent cloud drive storage in Bengali and English, with transparent quota tracking, legitimate paid upgrades, and invite bonuses.
- **Key Value**: Real cloud file hosting backed by an authenticated storage pool, preventing data loss on browser clear or device changes, while maintaining exact file names (`mojo.txt`, `video.mp4`) and authentic business rules.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **User Sign-In & API Status**: User logs in with Google or guest profile. The header and dashboard display the active storage meter, quota percentage, and a subtle "Cloud API Connected" status indicator confirming the storage pool is live.
2. **Uploading to Cloud**: User selects a file. The upload modal displays:
   - Current total storage used vs total allowed.
   - Max single-file upload limit (calculated strictly at 20% of user's total quota).
   - Real progress bar while the file is streamed through `/api/upload-cloud` to the cloud hosting provider.
   - Exact filename preservation (`mojo.txt`, `presentation.pdf`, `photo.png`).
3. **File Management & Instant Streaming**: Uploaded files display appropriate icons (image thumbnail, video badge, document icon). Clicking any file opens the full preview modal with instant media streaming from the cloud CDN.
4. **Public Unauthenticated Sharing**: Clicking "Share" generates a public URL (`?file=ID`). Any recipient can open the link in any browser without signing in to view or download the file.
5. **Authentic Upgrade & Quota Expansion**: Users needing more capacity can upgrade via 10 Tk (100 MB) or 50 Tk (550 MB) packages with real transaction verification and 30-day limits.

### Visual Identity & Theme
- **Color System (60-30-10 Rule)**:
  - 60% Canvas: Slate-950 (`#020617`) in dark mode / Clean White (`#F8FAFC`) in light mode.
  - 30% Structural: Slate-900 / Slate-100 card containers with 1px hairline borders (`border-slate-800` / `border-slate-200`).
  - 10% Accent: Vivid Sky Blue (`#0284C7`) and Emerald (`#10B981`) for active storage indicators and primary upload actions.
- **Typography & Tabular Discipline**:
  - Headings: `Plus Jakarta Sans` for clean, professional modern dashboard typography.
  - Storage Numbers & Timestamps: Strict monospace tabular numerals (`font-mono tabular-nums`) to prevent layout shifts.
- **Top Bar Contract**:
  - Zone 1: Single brand wordmark (`CloudVault`).
  - Zone 2: Navigation items (`Files`, `Shared`, `Upgrades`, `Referrals`).
  - Zone 3: Storage quota indicator + Profile/Sign-in button.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Server-Side Proxy (`/api/upload-cloud`) for API Key Storage vs Browser Direct Upload
- **Chosen Approach**: Build a lightweight Express server-side route in `server.ts` that receives multipart file uploads and streams them to Catbox's API endpoint (`https://catbox.moe/user/api.php`) with `userhash=cb_ede5e4f6d64a074b7ba88e8931f08c4686bb0396d642e06732a81e0efa195665`.
- **Why**: Catbox API blocks cross-origin browser POST requests via strict CORS headers. The server proxy solves CORS cleanly, protects the userhash from client-side scraping, and guarantees reliable multi-megabyte transfers.
- **Alternatives Considered**: Direct browser `fetch()` to Catbox was rejected because it triggers browser CORS `Access-Control-Allow-Origin` errors.

### Decision 2: Hybrid Cloud URL + IndexedDB Fallback
- **Chosen Approach**: When a file is uploaded, the cloud provider's permanent CDN link is stored in the file record. If the network is offline or the file is small, a local copy is also kept in IndexedDB for instant zero-latency preview.
- **Why**: Gives the user the best of both worlds: permanent global cloud URLs for public sharing, and instant local retrieval.
- **Alternatives Considered**: Pure cloud-only without local metadata would cause blank screens when the network flickers.

### Decision 3: Strict 20% Single-File Limit Calculation
- **Chosen Approach**: Single-file upload limit is dynamically set to `Math.floor(totalAllowedBytes * 0.20)`. For 250 MB quota $\rightarrow$ 50 MB single-file max; for 800 MB quota $\rightarrow$ 160 MB single-file max.
- **Why**: Accurately fulfills the user's explicit rule while scaling proportionally as users upgrade their storage or invite friends.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CloudVault Client                             │
│                                                                        │
│  ┌───────────────────────┐   ┌──────────────────────────────────────┐  │
│  │   FileUploadModal     │   │         PublicFileViewer             │  │
│  │  - 20% single limit   │   │  - Unauthenticated access            │  │
│  │  - Quota validation   │   │  - Cloud URL direct streaming        │  │
│  └──────────┬────────────┘   └───────────────────▲──────────────────┘  │
│             │                                    │                     │
│             ▼                                    │                     │
│  ┌───────────────────────┐                       │                     │
│  │ persistentStorage.ts  │───────────────────────┘                     │
│  │  - IndexedDB cache    │                                             │
│  │  - Cloud URL record   │                                             │
│  └──────────┬────────────┘                                             │
└─────────────┼──────────────────────────────────────────────────────────┘
              │ Multipart POST
              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Vite / Express Full-Stack Server                     │
│                              (server.ts)                               │
│                                                                        │
│  POST /api/upload-cloud                                                │
│  - Accepts file buffer                                                 │
│  - Injects cb_ede5e4f6d64a074b7ba88e8931f08c4686bb0396d642e06732a81...│
│  - Dispatches to Catbox user/api.php                                   │
│  - Returns permanent CDN URL                                           │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     External Cloud Storage Provider                    │
│                        (Catbox.moe CDN Storage)                        │
│                                                                        │
│  - Stores file permanently                                             │
│  - Serves direct URL: https://files.catbox.moe/<hash>.<ext>            │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Mapping
- **CloudFile Record**:
  ```typescript
  interface CloudFile {
    id: string;
    name: string; // Exact name (e.g. mojo.txt)
    size: number;
    mimeType: string;
    modifiedTime: string;
    createdTime: string;
    isStarred: boolean;
    fileExtension: string;
    cloudUrl?: string; // Real permanent cloud URL
    dataUrl?: string;  // Local data fallback
    textContent?: string; // Text preview content for .txt/.md/.json
    userId: string;
  }
  ```
- **Storage Quota Calculation**:
  ```typescript
  interface StorageQuota {
    baseQuotaBytes: number;     // 250 MB
    referralBonusBytes: number; // +50 MB per verified friend
    upgradeBonusBytes: number;  // +100 MB or +550 MB from verified purchases
    totalAllowedBytes: number;  // Sum of above
    usedBytes: number;          // Current sum of uploaded files
    maxSingleFileBytes: number; // Exactly 20% of totalAllowedBytes
  }
  ```
