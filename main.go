package main

import (
	"log"

	"project1/database"
	"project1/handlers"
	"project1/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	database.InitDB()

	r := gin.Default()

	// 1. Sajikan Frontend Web Dashboard dari folder static
	r.StaticFile("/", "./static/index.html")
	r.Static("/static", "./static")

	// 2. Routing API v1
	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.POST("/records", handlers.CreateOfferRecord)
			protected.GET("/records", handlers.GetRecords)
			protected.GET("/records/smart-match", handlers.SmartMatchRecord)
			protected.PATCH("/records/:id/attach-po", handlers.AttachPOToRecord)
			protected.PATCH("/records/:id/status", handlers.UpdateOperationalStatus)
		}
	}

	log.Println("Server berjalan di http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
