# Quotation to Purchase Order (PO) Matcher API

A real-world B2B backend service built with **Golang** and **SQLite** designed to solve purchase order reconciliation bottlenecks in precision fabrication and industrial manufacturing supply chains.

---

## 🎯 Background & Business Problem

In industrial manufacturing, precision fabrication workshops often submit customized job quotations (repair, tooling modification, spare part fabrication) to enterprise manufacturing clients.

However, in daily operations, a critical data reconciliation problem frequently occurs:

1. **Unlinked PO Documents:** When enterprise clients issue an official Purchase Order (PO) via email, their procurement systems frequently **omit the vendor's original quotation number**, referencing only internal purchase requisition (PR) IDs or new PO numbers.
2. **Simplified / Inconsistent Item Naming:** A quotation with detailed technical specifications (e.g., *"Fabrication Chamber Housing SUS 304 40L with Toggle Clamp & 1.5mm Plate"*) is often abbreviated in the client's PO to generic descriptions (e.g., *"Plate SUS 304 1.5mm"* or simply *"Repair Chamber"*).
3. **Price Adjustments / Negotiation:** Final PO unit prices often differ from original quotations due to negotiated commercial terms or volume discounts.
4. **Scattered Multi-item Orders:** A single consolidated client PO often bundles multiple separate quotation items that were submitted weeks apart.

Manually matching incoming POs against hundreds of quotation records in spreadsheets leads to administrative delays, lost invoice records, and shipping bottlenecks.

---

## 💡 Solution: Rule-Based Intelligent Matching Engine

This REST API provides an automated backend service with a **Heuristic Multi-Factor Scoring Engine** that instantly matches incoming client POs to active quotation drafts without relying strictly on exact item names.

### Key Architectural Highlights:
* **Separation of Concerns:** Clean architecture cleanly isolating HTTP routing (`main.go`), business controllers (`handlers/`), data persistence (`database/`), and domain transfer models (`models/`).
* **Multi-Factor Scoring Engine:** Evaluates candidates across enterprise client matching (+30), PIC alignment (+20), exact quantity parity (+25), primary item name fuzzy search (+35), material/dimension substring matching (+40), and commercial price-tolerance bounds (+15).
* **Consolidated PO Support:** Gracefully maps multiple individual quotation records to a single incoming client PO number.
* **Audit & Lifecycle Tracking:** Automates variance calculations (`unit_price_diff`, `total_price_diff`) and tracks operational fulfillment (`is_delivered`) and payment statuses (`is_paid`).

---

## 🏗️ Architecture & Technology Stack

* **Language:** Go (1.24+)
* **HTTP Framework:** [Gin Web Framework](https://github.com/gin-gonic/gin)
* **ORM & Database:** [GORM](https://gorm.io/) with pure-Go SQLite driver (`github.com/glebarez/sqlite`)
* **Data Interchange:** Clean JSON DTOs with strict binding validations

---

## 🚀 API Specification

### 1. Create New Quotation Record
* **Endpoint:** `POST /api/v1/records`
* **Request Body:**
```json
{
  "offer_date": "2026-11-20",
  "offer_qty": 2,
  "offer_unit": "unit",
  "offer_item_name": "Fabrication Cover Conveyor AL-4",
  "materials": "Plate Stainless SUS 304 tebal 2mm, Baut L M8",
  "client_company": "client-manufacturing",
  "client_pic": "budi",
  "offer_price": 1450000,
  "notes": "Custom engineering batch 1"
}
```

### 2. Smart Detective Matching (Identify Quotation from PO)
When a client sends an ambiguous PO, query the matching engine:
* **Endpoint:** `GET /api/v1/records/smart-match?client=client-manufacturing&keyword=Baut L M8&qty=2`
* **Response Sample:**
```json
{
  "message": "Hasil pencarian kecocokan penawaran dengan dokumen PO klien",
  "total": 1,
  "data": [
    {
      "match_score": 95,
      "company_matched": true,
      "qty_matched": true,
      "item_name_matched": false,
      "material_matched": true,
      "price_matched": true,
      "match_reasons": [
        "Perusahaan klien cocok (client-manufacturing)",
        "QTY cocok persis (2)",
        "Spesifikasi bahan/material cocok langsung: 'baut l m8'"
      ],
      "record": {
        "id": 1,
        "offer_item_name": "Fabrication Cover Conveyor AL-4",
        "offer_price": 1450000
      }
    }
  ]
}
```

### 3. Attach Official Client Purchase Order
Once the target quotation is identified, link the client's PO:
* **Endpoint:** `PATCH /api/v1/records/:id/attach-po`
* **Request Body:**
```json
{
  "po_date": "2026-11-23",
  "po_qty": 2,
  "po_unit": "unit",
  "po_number": "PO-IND-2026-9901",
  "po_item_name": "Plate Cover SS304 M8",
  "po_price": 1400000,
  "notes": "Discount negotiated"
}
```
* **Result:** Automatically marks `po_status: "sudah"`, calculates `unit_price_diff: 50000`, and links the official purchase order.

### 4. Operational & Delivery Tracking
* **Filter Pending Orders:** `GET /api/v1/records?po_status=sudah&delivered=belum`
* **Filter Unpaid Invoices:** `GET /api/v1/records?delivered=sudah&paid=belum`
* **Update Delivery / Payment Status:** `PATCH /api/v1/records/:id/status`

---

## 💻 Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Alifanoveliasukma/quotation-po-tracker-api.git
   cd quotation-po-tracker-api
   ```
2. **Download dependencies:**
   ```bash
   go mod download
   ```
3. **Start the API server:**
   ```bash
   go run main.go
   ```
Server runs locally at `http://localhost:8080`.
