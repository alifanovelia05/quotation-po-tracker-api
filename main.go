package main

import (
	"log"

	"project1/database"
	"project1/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	// Inisialisasi Database SQLite
	database.InitDB()

	// Inisialisasi Gin Engine
	r := gin.Default()

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"app":     "Quotation to Purchase Order (PO) Tracker API",
			"status":  "running",
			"version": "v1.0.0",
		})
	})

	v1 := r.Group("/api/v1")
	{
		// 1. Tambah baris penawaran baru
		v1.POST("/records", handlers.CreateOfferRecord)

		// 2. Lihat & filter daftar transaksi (po_status, delivered, paid, client, pic, po_number)
		v1.GET("/records", handlers.GetRecords)

		// 3. Smart Detective Matcher: Cari baris yang cocok ketika email PO klien masuk
		v1.GET("/records/smart-match", handlers.SmartMatchRecord)

		// 4. Attach PO Klien ke baris penawaran
		v1.PATCH("/records/:id/attach-po", handlers.AttachPOToRecord)

		// 5. Update Status Pengiriman & Pembayaran
		v1.PATCH("/records/:id/status", handlers.UpdateOperationalStatus)
	}

	log.Println("Server berjalan di http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
