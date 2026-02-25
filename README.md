# BarBatch

**BarBatch** is a professional bar inventory and batch cocktail management system for modern bars and restaurants.
It helps you track cocktail specs, manage batched/prepped cocktails, monitor inventory, and streamline prep and shopping workflows.

---

## 🚀 Features

- **Cocktail Spec Management**
  - Add, edit, and organize cocktail recipes with detailed specs
  - Support for both service (ml) and batch (bottle) builds
  - Ingredient typeahead/autocomplete for fast entry

- **Inventory Tracking**
  - Track bottle counts for each batched cocktail
  - Set low-stock thresholds and get alerts
  - Bulk actions: multi-select, batch mark as prepped, adjust thresholds, or delete

- **Prep Sessions**
  - "New Prep Session" button auto-detects what needs prepping
  - Calculates minimum batches needed to go over threshold
  - Generates a shopping list (in bottles) for all required ingredients
  - Export or print prep/shopping lists

- **Quick Count**
  - Streamlined interface for rapid stocktaking
  - Keyboard and mobile-friendly, with swipe and tap support

- **Data & Sync**
  - Sync status indicator ("Saving...", "All changes saved", "Sync Error")
  - Import/export all data as JSON for backup or migration
  - Conflict resolution UI for sync issues

- **Analytics & Reporting**
  - Prep analytics: daily/weekly prep logs and trends
  - Usage predictions and low-stock banners

- **Mobile & Accessibility**
  - Responsive design with large tap targets
  - Mobile navigation and gestures
  - ARIA labels and keyboard navigation

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- npm

### Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/AceByte/BarBatch.git
    cd BarBatch
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Start the server:
    ```sh
    npm start
    ```
    The app will be available at [http://localhost:3000](http://localhost:3000).

---

## 📋 Usage

- **Inventory:**
  Track and update bottle counts, set thresholds, and view low-stock alerts.

- **Cocktails:**
  Add new recipes, edit specs, and define batch builds (bottles per ingredient).

- **Prep Session:**
  Click "New Prep Session" to auto-generate a prep and shopping list for all cocktails below threshold.

- **Quick Count:**
  Use the Quick Count interface for rapid inventory updates.

- **Import/Export:**
  Backup or restore your data via the Import/Export options in the menu.

---

## 📝 Feature Roadmap

See [`TODO.md`](TODO.md) for a full list of planned and requested features.

---

## 🤝 Contributing

Pull requests and feature suggestions are welcome!
Please open an issue or discussion for major changes.

---


## 👨‍💻 Author

Developed by [AceByte](https://github.com/AceByte)

---
