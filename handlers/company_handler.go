package handlers

import (
	"math"
	"net/http"
	"project1/database"
	"project1/models"
	"strings"

	"github.com/gin-gonic/gin"
)

func GetCompanies(c *gin.Context) {
	var companies []models.Company
	if err := database.DB.Order("name asc").Find(&companies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data perusahaan"})
		return
	}

	var records []models.TransactionRecord
	database.DB.Find(&records)

	type stats struct {
		offers     int
		offerValue float64
		poDeals    int
		poValue    float64
	}
	statsMap := make(map[string]*stats)

	for _, r := range records {
		key := strings.ToLower(strings.TrimSpace(r.ClientCompany))
		if key == "" {
			continue
		}
		if statsMap[key] == nil {
			statsMap[key] = &stats{}
		}
		s := statsMap[key]
		s.offers++
		s.offerValue += r.OfferTotal
		if r.POStatus == "sudah" {
			s.poDeals++
			if r.POGrandTotal != nil && *r.POGrandTotal > 0 {
				s.poValue += *r.POGrandTotal
			} else if r.POTotal != nil {
				s.poValue += *r.POTotal
			}
		}
	}

	result := make([]models.CompanyWithStats, 0, len(companies))
	for _, comp := range companies {
		key := strings.ToLower(strings.TrimSpace(comp.Name))
		s := statsMap[key]
		item := models.CompanyWithStats{
			ID:         comp.ID,
			Name:       comp.Name,
			DefaultPIC: comp.DefaultPIC,
			Notes:      comp.Notes,
		}
		if s != nil {
			item.TotalOffers = s.offers
			item.TotalOfferValue = s.offerValue
			item.TotalPODeals = s.poDeals
			item.TotalPOValue = s.poValue
			if s.offers > 0 {
				item.WinRate = int(math.Round(float64(s.poDeals) / float64(s.offers) * 100))
			}
		}
		result = append(result, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"total": len(result),
		"data":  result,
	})
}

func CreateCompany(c *gin.Context) {
	var req models.CompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama perusahaan wajib diisi"})
		return
	}

	name := strings.TrimSpace(req.Name)
	var existing models.Company
	if err := database.DB.Where("LOWER(name) = ?", strings.ToLower(name)).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Perusahaan sudah terdaftar"})
		return
	}

	comp := models.Company{
		Name:       name,
		DefaultPIC: strings.TrimSpace(req.DefaultPIC),
		Notes:      strings.TrimSpace(req.Notes),
	}
	if err := database.DB.Create(&comp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan perusahaan"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Perusahaan berhasil ditambahkan",
		"data":    comp,
	})
}

func UpdateCompany(c *gin.Context) {
	id := c.Param("id")
	var comp models.Company
	if err := database.DB.First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Perusahaan tidak ditemukan"})
		return
	}

	var req models.CompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama perusahaan wajib diisi"})
		return
	}

	comp.Name = strings.TrimSpace(req.Name)
	comp.DefaultPIC = strings.TrimSpace(req.DefaultPIC)
	comp.Notes = strings.TrimSpace(req.Notes)

	if err := database.DB.Save(&comp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupdate perusahaan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data perusahaan berhasil diperbarui",
		"data":    comp,
	})
}

func DeleteCompany(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Company{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus perusahaan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Perusahaan berhasil dihapus",
	})
}
