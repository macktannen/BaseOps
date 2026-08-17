# BaseOps — Aviation Operations & Fleet Management System

BaseOps is a real-time, multi-platform aviation fleet management and flight operations web application designed for charter operators, flight departments, pilots, and operations coordinators.

**Version:** `1.0.1`  
**Deployment:** Production (Vercel + Google Firebase / Firestore / Cloud Storage)

---

## Key Features

### 1. Flight Planning & Calendar View
- **Multi-view Calendar**: Interactive month, day, and schedule grid views for all operations.
- **Flight Planning Modal (`EventModal`)**:
  - Multi-leg route planning with accurate Great Circle nautical mile distances and automatic flight time calculations.
  - Interactive airport and custom landing zone (LZ) search with usage frequency tracking.
  - Multi-pilot assignments, passenger manifest tracking, and account linking.
  - Automated scheduling conflict detection for pilots and aircraft.
  - Numeric auto-incrementing Mission / Flight numbers.
  - Document & file attachment uploads (PDFs, images, GPX, KML).
  - Modal lifecycle management ensuring seamless saves and state preservation.

### 2. Digital Flight Log & Atomic Meter Commits
- Digital pilot signature locking with timestamp and audit logs.
- Automatic atomic meter synchronization (Hobbs, Total Airframe, Engine 1/2 Hours & Cycles).
- Meter rollback and audit tracking when signatures are cleared or aircraft assignments change.

### 3. Personnel & Duty Scheduling Grid
- Bidirectional duty scheduling (Available, Standby, Flight, Off, Training, Vacation, Maintenance).
- Real-time synchronization between Calendar View status pills and Schedules Grid.
- Multi-day and recurring duty schedule generator.

### 4. Fleet Management & Maintenance Tracking
- Total Airframe, Hobbs, Engine Hours, and Cycle tracking.
- Next maintenance interval tracking with visual alerts and dual-engine support.

### 5. AI-Powered Expense Management & Invoicing
- Direct expense tracking per flight with receipt image/PDF attachments.
- Gemini AI-powered OCR invoice/receipt parser.
- Vendor invoice categorization and department expense summaries.

### 6. Role-Based Access Control & Multi-Platform Layouts
- Administrative, pilot, coordinator, and view-only roles.
- Dedicated desktop calendar and mobile-optimized layouts with swipe navigation.
- Cloud Firestore synchronization with offline IndexedDB backup.

---

## Tech Stack

- **Frontend**: React 19, React Router v7, Lucide Icons, Recharts, Leaflet / React-Leaflet
- **Build Tool**: Vite 8, Oxlint
- **Time & Timezones**: `date-fns`, `date-fns-tz`, `tz-lookup`
- **Cloud & Storage**: Google Firebase (Firestore, Firebase Authentication, Firebase Cloud Storage), `localforage`
- **AI Processing**: Google Gemini API via `@google/genai`
- **Deployment**: Vercel (CI/CD connected via GitHub `main` branch)

---

## Environment Variables

Configure the following environment variables in your `.env` file or Vercel Project Settings:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

## Development & Build Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```
