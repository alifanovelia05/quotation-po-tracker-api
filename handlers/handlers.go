package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"project1/database"
	"project1/models"

	"github.com/gin-gonic/gin"
)

// 1. TAMBAH BARIS PENAWARAN BARU (Menyimpan Nama Barang + Rincian Bahan jika ada)
// POST /api/v1/records
func CreateOfferRecord(c *gin.Context) {
	var req models.CreateOfferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	offerDate, err := time.Parse("2006-01-02", req.OfferDate)
	if err != nil {
		offerDate = time.Now()
	}

	totalOffer := float64(req.OfferQty) * req.OfferPrice

	record := models.TransactionRecord{
		OfferDate:     offerDate,
		OfferQty:      req.OfferQty,
		OfferUnit:     req.OfferUnit,
		OfferItemName: req.OfferItemName,
		Materials:     req.Materials, // Kolom bahan tersimpan di database
		ClientCompany: strings.ToLower(strings.TrimSpace(req.ClientCompany)),
		ClientPIC:     strings.ToLower(strings.TrimSpace(req.ClientPIC)),
		OfferPrice:    req.OfferPrice,
		OfferTotal:    totalOffer,
		POStatus:       "belum",
		Notes:         req.Notes,
		IsDelivered:    "belum",
		IsPaid:         "belum",
	}

	if err := database.DB.Create(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan penawaran: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Baris penawaran berhasil dicatat",
		"data":    record,
	})
}

// 2. LIHAT DAFTAR TRANSAKSI
// GET /api/v1/records?po_status=belum&delivered=belum&client=aio
func GetRecords(c *gin.Context) {
	poStatus := c.Query("po_status")
	delivered := c.Query("delivered")
	paid := c.Query("paid")
	client := c.Query("client")
	pic := c.Query("pic")
	poNumber := c.Query("po_number") // Bisa filter by No PO untuk kasus 1 PO isi banyak barang

	query := database.DB.Model(&models.TransactionRecord{})

	if poStatus != "" {
		query = query.Where("po_status = ?", strings.ToLower(poStatus))
	}
	if delivered != "" {
		query = query.Where("is_delivered = ?", strings.ToLower(delivered))
	}
	if paid != "" {
		query = query.Where("is_paid = ?", strings.ToLower(paid))
	}
	if client != "" {
		query = query.Where("client_company LIKE ?", "%"+strings.ToLower(client)+"%")
	}
	if pic != "" {
		query = query.Where("client_pic LIKE ?", "%"+strings.ToLower(pic)+"%")
	}
	if poNumber != "" {
		query = query.Where("po_number = ?", poNumber)
	}

	var records []models.TransactionRecord
	query.Order("offer_date desc").Find(&records)

	c.JSON(http.StatusOK, gin.H{
		"total": len(records),
		"data":  records,
	})
}

// 3. SMART DETECTIVE MATCHER (Mencari di Nama Barang DAN di Kolom Material secara independen)
// GET /api/v1/records/smart-match?client=aio&keyword=kunci togel&material=sus 304&qty=31
func SmartMatchRecord(c *gin.Context) {
	client := strings.ToLower(strings.TrimSpace(c.Query("client")))
	pic := strings.ToLower(strings.TrimSpace(c.Query("pic")))
	keyword := strings.ToLower(strings.TrimSpace(c.Query("keyword")))   // Teks apa pun yang tertera di PO klien
	material := strings.ToLower(strings.TrimSpace(c.Query("material"))) // Pencarian spesifik bahan jika diinginkan
	qtyStr := strings.TrimSpace(c.Query("qty"))
	priceStr := strings.TrimSpace(c.Query("price"))

	var targetQty int
	if qtyStr != "" {
		targetQty, _ = strconv.Atoi(qtyStr)
	}

	var targetPrice float64
	if priceStr != "" {
		targetPrice, _ = strconv.ParseFloat(priceStr, 64)
	}

	var pendingList []models.TransactionRecord
	database.DB.Where("po_status = ?", "belum").Find(&pendingList)

	var results []models.SmartMatchResult

	// Jika ada parameter material khusus, gabungkan ke keyword pencarian
	searchTerm := keyword
	if searchTerm == "" && material != "" {
		searchTerm = material
	}

	cleanSearch := strings.ReplaceAll(strings.ReplaceAll(searchTerm, ".", ""), " ", "")

	for _, rec := range pendingList {
		score := 0
		var reasons []string
		companyMatched := false
		picMatched := false
		qtyMatched := false
		priceMatched := false
		itemNameMatched := false
		materialMatched := false

		// 1. Cek Perusahaan Klien
		if client != "" {
			if strings.Contains(rec.ClientCompany, client) || strings.Contains(client, rec.ClientCompany) {
				score += 30
				companyMatched = true
				reasons = append(reasons, "Perusahaan klien cocok ("+rec.ClientCompany+")")
			}
		}

		// 2. Cek PIC
		if pic != "" && rec.ClientPIC != "" {
			if strings.Contains(rec.ClientPIC, pic) || strings.Contains(pic, rec.ClientPIC) {
				score += 20
				picMatched = true
				reasons = append(reasons, "Nama PIC cocok ("+rec.ClientPIC+")")
			}
		}

		// 3. Cek Quantity
		if targetQty > 0 && rec.OfferQty == targetQty {
			score += 25
			qtyMatched = true
			reasons = append(reasons, "QTY cocok persis ("+strconv.Itoa(rec.OfferQty)+")")
		}

		// 4. Cek Pencarian di NAMA BARANG UTAMA
		if searchTerm != "" {
			combinedName := strings.ToLower(rec.OfferItemName)
			cleanName := strings.ReplaceAll(strings.ReplaceAll(combinedName, ".", ""), " ", "")

			if strings.Contains(combinedName, searchTerm) || (len(cleanSearch) >= 3 && strings.Contains(cleanName, cleanSearch)) {
				score += 35
				itemNameMatched = true
				reasons = append(reasons, "Nama barang utama cocok langsung dengan '"+searchTerm+"'")
			}
		}

		// 5. Cek Pencarian di RINCIAN MATERIAL / BAHAN (Independen dari nama barang utama!)
		if searchTerm != "" && rec.Materials != "" {
			combinedMat := strings.ToLower(rec.Materials)
			cleanMat := strings.ReplaceAll(strings.ReplaceAll(combinedMat, ".", ""), " ", "")

			// A. Cocok kalimat/frasa bahan
			if strings.Contains(combinedMat, searchTerm) || (len(cleanSearch) >= 3 && strings.Contains(cleanMat, cleanSearch)) {
				score += 40
				materialMatched = true
				reasons = append(reasons, "Spesifikasi bahan/material cocok langsung: '"+searchTerm+"'")
			} else {
				// B. Cocok pecahan kata spesifikasi (misal: "sus 304", "tebal 1.5mm", "dia 4mm")
				words := strings.Fields(searchTerm)
				matchWords := 0
				for _, w := range words {
					cleanW := strings.Trim(w, ".,-()\"")
					if len(cleanW) >= 2 && (strings.Contains(combinedMat, cleanW) || strings.Contains(cleanMat, cleanW)) {
						matchWords++
					}
				}
				if matchWords > 0 {
					score += (matchWords * 15)
					materialMatched = true
					reasons = append(reasons, strconv.Itoa(matchWords)+" kata spesifikasi bahan cocok")
				}
			}
		}

		// 6. Cek Harga & Toleransi Diskon Nego
		if targetPrice > 0 {
			if rec.OfferPrice == targetPrice || rec.OfferTotal == targetPrice {
				score += 20
				priceMatched = true
				reasons = append(reasons, "Harga penawaran sama persis")
			} else {
				selisih := rec.OfferPrice - targetPrice
				if selisih > 0 && (selisih/rec.OfferPrice) <= 0.25 {
					score += 15
					priceMatched = true
					reasons = append(reasons, "Harga PO masuk akal sebagai hasil negosiasi/diskon dari penawaran awal")
				}
			}
		}

		if score > 0 {
			results = append(results, models.SmartMatchResult{
				Record:          rec,
				MatchScore:      score,
				CompanyMatched:  companyMatched,
				PICMatched:      picMatched,
				QtyMatched:      qtyMatched,
				PriceMatched:    priceMatched,
				ItemNameMatched: itemNameMatched,
				MaterialMatched: materialMatched,
				MatchReasons:    reasons,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Hasil pencarian kecocokan penawaran dengan dokumen PO klien",
		"total":   len(results),
		"data":    results,
	})
}

// 4. ATTACH PO: Masukkan data PO klien ke baris penawaran yang sudah match
// PATCH /api/v1/records/:id/attach-po
func AttachPOToRecord(c *gin.Context) {
	id := c.Param("id")
	var req models.AttachPORequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var rec models.TransactionRecord
	if err := database.DB.First(&rec, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Baris penawaran tidak ditemukan"})
		return
	}

	poDate, err := time.Parse("2006-01-02", req.PODate)
	if err != nil {
		poDate = time.Now()
	}

	var poPrice float64
	if req.POPrice != nil {
		poPrice = *req.POPrice
	} else {
		poPrice = rec.OfferPrice
	}

	var poTotal float64
	if req.POTotal != nil {
		poTotal = *req.POTotal
	} else {
		poTotal = float64(req.POQty) * poPrice
	}

	diffUnitPrice := rec.OfferPrice - poPrice
	diffTotalPrice := rec.OfferTotal - poTotal

	rec.PODate = &poDate
	rec.POQty = &req.POQty
	rec.POUnit = &req.POUnit
	rec.POStatus = "sudah"
	rec.PONumber = &req.PONumber
	rec.POItemName = &req.POItemName
	rec.POPrice = &poPrice
	rec.POTotal = &poTotal
	rec.UnitPriceDiff = &diffUnitPrice
	rec.TotalPriceDiff = &diffTotalPrice

	if req.Notes != "" {
		rec.Notes = req.Notes
	} else if diffUnitPrice > 0 {
		rec.Notes = "Ada potongan harga / diskon"
	} else {
		rec.Notes = "Tidak ada potongan harga"
	}

	if err := database.DB.Save(&rec).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupdate data PO: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data PO klien berhasil dihubungkan ke baris penawaran!",
		"data":    rec,
	})
}

// 5. UPDATE STATUS PENGIRIMAN & PEMBAYARAN
// PATCH /api/v1/records/:id/status
func UpdateOperationalStatus(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var rec models.TransactionRecord
	if err := database.DB.First(&rec, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan"})
		return
	}

	if req.IsDelivered != nil {
		rec.IsDelivered = strings.ToLower(*req.IsDelivered)
	}
	if req.IsPaid != nil {
		rec.IsPaid = strings.ToLower(*req.IsPaid)
	}
	if req.Notes != nil {
		rec.Notes = *req.Notes
	}

	database.DB.Save(&rec)

	c.JSON(http.StatusOK, gin.H{
		"message": "Status operasional berhasil diperbarui",
		"data":    rec,
	})
}
