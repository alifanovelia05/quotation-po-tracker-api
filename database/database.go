package database

import (
	"log"
	"project1/models"
	"time"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
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

	err = DB.AutoMigrate(
		&models.User{},
		&models.TransactionRecord{},
	)
	if err != nil {
		log.Fatalf("Gagal migrasi database: %v", err)
	}

	seedInitialData()
	log.Println("Database SQLite siap dan tersinkronisasi!")
}

func seedInitialData() {
	var userCount int64
	DB.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		defaultAdmin := models.User{
			Username: "admin",
			Password: string(hashedPassword),
			FullName: "Administrator Kantor",
			Role:     "admin",
		}
		DB.Create(&defaultAdmin)
	}

	var recordCount int64
	DB.Model(&models.TransactionRecord{}).Count(&recordCount)
	if recordCount > 0 {
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
	}

	DB.Create(&sampleRecords)
}
