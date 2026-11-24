package models

import "time"

type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Username  string    `json:"username" gorm:"uniqueIndex" binding:"required"`
	Password  string    `json:"-"`
	FullName  string    `json:"full_name"`
	Role      string    `json:"role" gorm:"default:'staff'"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=4"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name" binding:"required"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type TransactionRecord struct {
	ID uint `json:"id" gorm:"primaryKey"`

	OfferNumber   string    `json:"offer_number"`
	OfferDate     time.Time `json:"offer_date"`
	OfferQty      int       `json:"offer_qty" binding:"required,min=1"`
	OfferUnit     string    `json:"offer_unit" binding:"required"`
	OfferItemName string    `json:"offer_item_name" binding:"required"`
	Materials     string    `json:"materials"`
	ClientCompany string    `json:"client_company" binding:"required"`
	ClientPIC     string    `json:"client_pic"`
	OfferPrice    float64   `json:"offer_price" binding:"required"`
	OfferTotal    float64   `json:"offer_total"`

	PODate         *time.Time `json:"po_date"`
	POQty          *int       `json:"po_qty"`
	POUnit         *string    `json:"po_unit"`
	POStatus       string     `json:"po_status" gorm:"default:'belum'"`
	PONumber       *string    `json:"po_number"`
	POItemName     *string    `json:"po_item_name"`
	POPrice        *float64   `json:"po_price"`
	POTotal        *float64   `json:"po_total"`
	UnitPriceDiff  *float64   `json:"unit_price_diff"`
	TotalPriceDiff *float64   `json:"total_price_diff"`

	Notes       string `json:"notes"`
	IsDelivered string `json:"is_delivered" gorm:"default:'belum'"`
	IsPaid      string `json:"is_paid" gorm:"default:'belum'"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateOfferRequest struct {
	OfferNumber   string  `json:"offer_number"`
	OfferDate     string  `json:"offer_date"`
	OfferQty      int     `json:"offer_qty" binding:"required,min=1"`
	OfferUnit     string  `json:"offer_unit" binding:"required"`
	OfferItemName string  `json:"offer_item_name" binding:"required"`
	Materials     string  `json:"materials"`
	ClientCompany string  `json:"client_company" binding:"required"`
	ClientPIC     string  `json:"client_pic"`
	OfferPrice    float64 `json:"offer_price" binding:"required,min=0"`
	Notes         string  `json:"notes"`
}

type AttachPORequest struct {
	PODate     string   `json:"po_date" binding:"required"`
	POQty      int      `json:"po_qty" binding:"required,min=1"`
	POUnit     string   `json:"po_unit" binding:"required"`
	PONumber   string   `json:"po_number" binding:"required"`
	POItemName string   `json:"po_item_name" binding:"required"`
	POPrice    *float64 `json:"po_price"`
	POTotal    *float64 `json:"po_total"`
	Notes      string   `json:"notes"`
}

type UpdateStatusRequest struct {
	IsDelivered *string `json:"is_delivered"`
	IsPaid      *string `json:"is_paid"`
	Notes       *string `json:"notes"`
}

type SmartMatchResult struct {
	Record          TransactionRecord `json:"record"`
	MatchScore      int               `json:"match_score"`
	CompanyMatched  bool              `json:"company_matched"`
	PICMatched      bool              `json:"pic_matched"`
	QtyMatched      bool              `json:"qty_matched"`
	PriceMatched    bool              `json:"price_matched"`
	ItemNameMatched bool              `json:"item_name_matched"`
	MaterialMatched bool              `json:"material_matched"`
	MatchReasons    []string          `json:"match_reasons"`
}
