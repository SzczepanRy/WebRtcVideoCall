package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Router struct{
  mtx sync.RWMutex
}

type brodcastMsg struct {
	Message map[string]interface{}
	RoomID  string
	Client  *websocket.Conn
}

var AllRooms RoomsMap

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var brodcast = make(chan brodcastMsg)

func (router *Router)brodcaster() {
  fmt.Println("Bordcast")
	for {
		msg := <-brodcast
		for _, user := range AllRooms.Map[msg.RoomID] {
      router.mtx.Lock()
			if user.Conn != msg.Client {
        fmt.Println(msg.Message)

				err := user.Conn.WriteJSON( msg.Message )

				if err != nil {
					log.Println(errors.New("Could not write to a user"))
					log.Println(err)
					user.Conn.Close()


				}
			}
      router.mtx.Unlock()
		}
	}
}

func (router *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	switch r.URL.Path {
	case "/":
		http.ServeFile(w, r, "./client/index.html")
		return
	case "/style.css":
		http.ServeFile(w, r, "./client/style.css")
		return
	case "/index.js":
		http.ServeFile(w, r, "./client/index.js")
		return
	case "/create":
		w.Header().Add("Access-Control-Allow-Origin", "*")

		RoomId := AllRooms.CreateRoom()

		type res struct {
			RoomID string `json:"RoomId"`
		}
		fmt.Println("Created room with id ", RoomId)

		json.NewEncoder(w).Encode(res{RoomID: RoomId})
		return
	case "/join":

		RoomId := r.URL.Query().Get("RoomId")
		if RoomId == "" {
			log.Fatal(errors.New("Room not given in query params"))
			return
		}

		/// Important
		ws, err := upgrader.Upgrade(w, r, nil)


    fmt.Println("socket conn was sucessful for "  , RoomId)
		if err != nil {
			log.Fatal(errors.New("Could not upgrade connection"))
		}

		AllRooms.InstertIntoRoom(RoomId, false, ws)

		go  router.brodcaster()

		for {
			var msg brodcastMsg

			err := ws.ReadJSON(&msg.Message)
			if err != nil {
        //on refresh in browser
				log.Println(errors.New("Could not parse brodcast msg"))
        http.ServeFile(w,r,"./client/index.html")
				return
			}

			msg.Client = ws
			msg.RoomID = RoomId

			fmt.Println(msg.Message)
			brodcast <- msg
		}
		///
	case "/roomList":
		type roomList struct {
			CurrentRooms []string `json:"CurrentRooms"`
		}

		json.NewEncoder(w).Encode(roomList{CurrentRooms: AllRooms.ReadRooms()})
		return
	case "/deleteRoom":
		RoomId := r.URL.Query().Get("RoomId")
		if RoomId == "" {
			log.Fatal(errors.New("Id not given in query param"))
			return
		}
		AllRooms.DeleteRoomById(RoomId)
		type roomList struct {
			CurrentRooms []string `json:"CurrentRooms"`
		}

		json.NewEncoder(w).Encode(roomList{CurrentRooms: AllRooms.ReadRooms()})

		return
	}

}
