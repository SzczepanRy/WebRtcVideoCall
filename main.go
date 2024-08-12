package main

import (
	"WebRTC/server"
	"fmt"
	"log"
	"net/http"
)


func main() {

  router := server.Router{}
  server.AllRooms.Init()
  fmt.Println("4000")
	log.Fatal(http.ListenAndServeTLS(":4000", "./cert/server.crt" , "./cert/server.key", &router))
	//log.Fatal(http.ListenAndServe(":4000",&router))


}
