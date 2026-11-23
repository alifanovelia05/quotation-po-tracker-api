package database

import (
	"log"
	"project1/models"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() {
	var err error
	DB, err = gorm.Open(sqlite.Open("argra_tracker.db"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("Gagal terhubung ke database SQLite: %v", err)
	}

	err = DB.AutoMigrate(&models.TransactionRecord{})
	if err != nil {
		log.Fatalf("Gagal migrasi database: %v", err)
	}

	seedInitialData()
	log.Println("Database SQLite siap dan tersinkronisasi!")
}

// Data inisialisasi awal (disamarkan untuk demonstrasi portofolio publik)
func seedInitialData() {
	var count int64
	DB.Model(&models.TransactionRecord{}).Count(&count)
	if count > 0 {
		return
	}

	date1, _ := time.Parse("2006-01-02", "2026-10-10")
	poDateDeal, _ := time.Parse("2006-01-02", "2026-11-05")
	poQtyDeal := 10
	poUnitDeal := "unit"
	poNumberDeal := "PO-CLIENT-SAMPLE-001"
	poItemDeal := "Repair chamber housing plate SUS 304"
	poPriceDeal := 650000.0
	poTotalDeal := 6500000.0
	diffUnit := 700000.0 - 650000.0
	diffTotal := 7000000.0 - 6500000.0

	date2, _ := time.Parse("2006-01-02", "2026-10-15")

	sampleRecords := []models.TransactionRecord{
		{
			OfferDate:     date1,
			OfferQty:      10,
			OfferUnit:     "unit",
			OfferItemName: "Repair Tutup Dan Chamber Juice SUS 304 Area Produksi",
			Materials:     "Plate SUS 304 tebal 1.5mm, List Chamber, Clamp Toggle Lock 2 inch, Welder",
			ClientCompany: "client-a",
			ClientPIC:     "budi",
			OfferPrice:    700000,
			OfferTotal:    7000000,
			PODate:         &poDateDeal,
			POQty:          &poQtyDeal,
			POUnit:         &poUnitDeal,
			POStatus:       "sudah",
			PONumber:       &poNumberDeal,
			POItemName:     &poItemDeal,
			POPrice:        &poPriceDeal,
			POTotal:        &poTotalDeal,
			UnitPriceDiff:  &diffUnit,
			TotalPriceDiff: &diffTotal,
			Notes:          "Diskon volume",
			IsDelivered:    "belum",
			IsPaid:         "belum",
		},
		{
			OfferDate:     date2,
			OfferQty:      2,
			OfferUnit:     "lot",
			OfferItemName: "Repair PIN Impeller Pump & Special Tools",
			Materials:     "As Shaft SUS 304 dia 4mm, As ST.45 dia 4mm, Borring + Welder",
			ClientCompany: "client-a",
			ClientPIC:     "hendra",
			OfferPrice:    450000,
			OfferTotal:    900000,
			POStatus:       "belum",
			Notes:          "",
			IsDelivered:    "belum",
			IsPaid:         "belum",
		},
	}

	DB.Create(&sampleRecords)
}
