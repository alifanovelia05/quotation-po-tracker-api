package database

import (
	"log"
	"os"
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
	// 1. Akun Demo Publik (Untuk Pengunjung LinkedIn / Uji Coba)
	var demoUser models.User
	if err := DB.Where("username = ?", "demo").First(&demoUser).Error; err != nil {
		hashDemo, _ := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)
		demoAccount := models.User{
			Username: "demo",
			Password: string(hashDemo),
			FullName: "Demo Visitor",
			Role:     "demo",
		}
		DB.Create(&demoAccount)
	}

	// 2. Akun Admin Pribadi (Diambil dari Environment Variables Render/.env)
	adminUser := os.Getenv("ADMIN_USERNAME")
	adminPass := os.Getenv("ADMIN_PASSWORD")
	if adminUser != "" && adminPass != "" {
		var existingAdmin models.User
		if err := DB.Where("username = ?", adminUser).First(&existingAdmin).Error; err != nil {
			hashAdmin, _ := bcrypt.GenerateFromPassword([]byte(adminPass), bcrypt.DefaultCost)
			customAdmin := models.User{
				Username: adminUser,
				Password: string(hashAdmin),
				FullName: "Administrator Argra",
				Role:     "admin",
			}
			DB.Create(&customAdmin)
		} else {
			// Update password jika ENV diubah
			hashAdmin, _ := bcrypt.GenerateFromPassword([]byte(adminPass), bcrypt.DefaultCost)
			existingAdmin.Password = string(hashAdmin)
			DB.Save(&existingAdmin)
		}
	} else {
		// Fallback admin default jika ENV belum diisi
		var adminUserDefault models.User
		if err := DB.Where("username = ?", "admin").First(&adminUserDefault).Error; err != nil {
			hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
			defaultAdmin := models.User{
				Username: "admin",
				Password: string(hashedPassword),
				FullName: "Administrator Kantor",
				Role:     "admin",
			}
			DB.Create(&defaultAdmin)
		}
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
