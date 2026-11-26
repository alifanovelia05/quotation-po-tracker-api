package main

import (
	"log"
	"os"

	"project1/database"
	"project1/handlers"
	"project1/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	database.InitDB()

	r := gin.Default()

	r.StaticFile("/", "./static/index.html")
	r.Static("/static", "./static")

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
			protected.PUT("/records/:id", handlers.UpdateOfferRecord)
			protected.DELETE("/records/:id", handlers.DeleteRecord)
			protected.GET("/records/smart-match", handlers.SmartMatchRecord)
			protected.PATCH("/records/:id/attach-po", handlers.AttachPOToRecord)
			protected.DELETE("/records/:id/po", handlers.DeletePORecord)
			protected.PATCH("/records/:id/status", handlers.UpdateOperationalStatus)
			protected.GET("/logs", handlers.GetActivityLogs)
			protected.POST("/records/extract-po-ai", handlers.ExtractPOAI)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server berjalan di port :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
