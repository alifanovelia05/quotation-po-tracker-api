package models

import "time"

// TransactionRecord merepresentasikan 1 baris transaksi penawaran hingga menjadi PO
type TransactionRecord struct {
	ID uint `json:"id" gorm:"primaryKey"`

	// --- KELOMPOK 1: DATA PENAWARAN AWAL ---
	OfferDate     time.Time `json:"offer_date"`                          // Tanggal penawaran dibuat
	OfferQty      int       `json:"offer_qty" binding:"required,min=1"`  // QTY penawaran
	OfferUnit     string    `json:"offer_unit" binding:"required"`       // Satuan (unit, pcs, lot, set, btg)
	OfferItemName string    `json:"offer_item_name" binding:"required"`  // Nama Penawaran / Judul Barang Utama
	Materials     string    `json:"materials"`                           // Rincian spek bahan/material (opsional, untuk pencarian presisi)
	ClientCompany string    `json:"client_company" binding:"required"`   // Perusahaan Klien (aio, formosa, megacare, dll)
	ClientPIC     string    `json:"client_pic"`                          // PIC Klien (agus, bunyamin, albert, tatang, dll)
	OfferPrice    float64   `json:"offer_price" binding:"required"`      // Harga Satuan Penawaran
	OfferTotal    float64   `json:"offer_total"`                         // Total Harga Penawaran (Qty * Harga Satuan)

	// --- KELOMPOK 2: DATA PURCHASE ORDER (PO) KLIEN ---
	PODate         *time.Time `json:"po_date"`          // Tanggal PO Turun
	POQty          *int       `json:"po_qty"`           // QTY versi PO klien
	POUnit         *string    `json:"po_unit"`          // Satuan versi PO klien
	POStatus       string     `json:"po_status" gorm:"default:'belum'"` // "belum" atau "sudah"
	PONumber       *string    `json:"po_number"`        // Nomor PO klien (misal: 4212034243)
	POItemName     *string    `json:"po_item_name"`     // Nama barang versi PO klien (sering disingkat)
	POPrice        *float64   `json:"po_price"`         // Harga Satuan PO (setelah nego)
	POTotal        *float64   `json:"po_total"`         // Total Harga PO (POQty * POPrice)
	UnitPriceDiff  *float64   `json:"unit_price_diff"`  // Selisih Harga Satuan (OfferPrice - POPrice)
	TotalPriceDiff *float64   `json:"total_price_diff"` // Selisih Total Harga (OfferTotal - POTotal)

	// --- KELOMPOK 3: MONITORING OPERASIONAL ---
	Notes          string `json:"notes"`                              // Keterangan (ada diskon, tanpa potongan, dll)
	IsDelivered    string `json:"is_delivered" gorm:"default:'belum'"` // Status Kirim: "belum" atau "sudah"
	IsPaid         string `json:"is_paid" gorm:"default:'belum'"`      // Status Bayar: "belum" atau "sudah"

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DTO Payload Input Penawaran Baru
type CreateOfferRequest struct {
	OfferDate     string  `json:"offer_date"` // YYYY-MM-DD
	OfferQty      int     `json:"offer_qty" binding:"required,min=1"`
	OfferUnit     string  `json:"offer_unit" binding:"required"`
	OfferItemName string  `json:"offer_item_name" binding:"required"`
	Materials     string  `json:"materials"` // Rincian bahan dari surat penawaran (bisa kosong jika tidak ada)
	ClientCompany string  `json:"client_company" binding:"required"`
	ClientPIC     string  `json:"client_pic"`
	OfferPrice    float64 `json:"offer_price" binding:"required,min=0"`
	Notes         string  `json:"notes"`
}

// DTO Payload Pasang PO Klien (Attach PO)
type AttachPORequest struct {
	PODate     string   `json:"po_date" binding:"required"` // Format: YYYY-MM-DD
	POQty      int      `json:"po_qty" binding:"required,min=1"`
	POUnit     string   `json:"po_unit" binding:"required"`
	PONumber   string   `json:"po_number" binding:"required"`
	POItemName string   `json:"po_item_name" binding:"required"`
	POPrice    *float64 `json:"po_price"` // Harga satuan di PO (bisa nego)
	POTotal    *float64 `json:"po_total"` // Total di PO
	Notes      string   `json:"notes"`
}

// DTO Update Status Pengiriman atau Pembayaran
type UpdateStatusRequest struct {
	IsDelivered *string `json:"is_delivered"` // "belum" / "sudah"
	IsPaid      *string `json:"is_paid"`      // "belum" / "sudah"
	Notes       *string `json:"notes"`
}

// DTO Smart Match Candidate
type SmartMatchResult struct {
	Record          TransactionRecord `json:"record"`
	MatchScore      int               `json:"match_score"`       // 0 - 100
	CompanyMatched  bool              `json:"company_matched"`   // Apakah klien sama
	PICMatched      bool              `json:"pic_matched"`       // Apakah PIC sama
	QtyMatched      bool              `json:"qty_matched"`       // Apakah QTY sama persis
	PriceMatched    bool              `json:"price_matched"`     // Apakah harga satuan / total mendekati
	ItemNameMatched bool              `json:"item_name_matched"` // Apakah nama barang cocok
	MaterialMatched bool              `json:"material_matched"`  // Apakah bahan/spesifikasi cocok
	MatchReasons    []string          `json:"match_reasons"`     // Rincian detektif kenapa dicurigai cocok
}
