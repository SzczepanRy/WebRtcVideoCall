package server

import (
	"math/rand"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type User struct {
	Host bool
	Conn *websocket.Conn
}

type RoomsMap struct {
	Mutex sync.RWMutex
	Map   map[string][]User
}

func (r *RoomsMap) Init() {
	r.Map = make(map[string][]User)
	return
}

func (r *RoomsMap) CreateRoom() string {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	seed := rand.New(rand.NewSource(time.Now().UnixNano()))

	key := make([]rune, 8)
	for i := range key {
		key[i] = letters[seed.Intn(len(letters))]
	}

	RoomId := string(key)

	r.Map[RoomId] = []User{}

	return RoomId

}

func (r *RoomsMap) FindRoomById(RoomId string) []User {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()
	return r.Map[RoomId]
}

func (r *RoomsMap) InstertIntoRoom(RoomId string, Host bool, conn *websocket.Conn) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	newUser := User{Host: Host, Conn: conn}

	r.Map[RoomId] = append(r.Map[RoomId], newUser)
	return
}

func (r *RoomsMap) DeleteRoomById(RoomId string) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()
	delete(r.Map, RoomId)
	return
}

func (r *RoomsMap) ReadRooms() []string {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()
	rList := []string{}
	for RoomId := range AllRooms.Map {
		rList = append(rList, RoomId)
	}
	return rList
}
