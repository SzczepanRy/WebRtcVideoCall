class Net {
  constructor() {

  }

  CreateRoom = async (e) => {
    return new Promise(async (resolve, reject) => {
      if (e) e.preventDefault();
      const res = await fetch("/create", {
        method: "get",
        headers: {
          "Content-Type": "application/json"
        }
      })
      const { RoomId } = await res.json()
      if (!RoomId) {
        console.error(" Did Not Receve RoomId")
        reject()
      }
      resolve(RoomId)
    })
  }
  async FetchRooms() {
    return new Promise(async (resolve, reject) => {
      const res = await fetch("/roomList", {
        method: "get",
        headers: {
          "Content-Type": "application/json"
        }
      })
      const { CurrentRooms } = await res.json()
      if (!CurrentRooms) {
        console.error(" did not receve roomlist")
        reject()
      }
      resolve(CurrentRooms)
    })
  }


  async DeleteRoom(RoomId) {
    return new Promise(async (resolve) => {
      const res = await fetch(`/deleteRoom?RoomId=${RoomId}`, {
        method: "get",
        headers: {
          "Content-Type": "application/json"
        }
      })

      const { CurrentRooms } = await res.json()
      if (!CurrentRooms) {
        console.error(" did not receve roomlist")
        reject()
      }
      resolve(CurrentRooms)
    })
  }

}


class Socket {

  constructor(RoomId) {
    this.RoomId = RoomId
    this.userVideo = document.querySelector(".vid1")
    this.userStream

    this.partnerVideo = document.querySelector(".vid2")
    this.partnerStream

    this.peer
    this.webSocket

    this.Init()
  }

  Init() {
    this.OpenCamera().then(async () => {
      this.webSocket = new WebSocket(`wss://localhost:4000/join?RoomId=${this.RoomId}`)
      //this.webSocket = new WebSocket(`wss://5.185.3.151:4000/join?RoomId=${this.RoomId}`)

      console.log("ws created")
      //await
      this.webSocket.addEventListener("open", () => {

        console.log("ws opened")
        this.webSocket.send(JSON.stringify({ join: true, RoomId: this.RoomId }));
      });

      //await

      this.webSocket.addEventListener("message", async (e) => {
        const message = JSON.parse(e.data);
        ////////////
        console.log(message)
        if (message.join) {
          await this.callUser();
          console.log("mesage.join ")
        }

        if (message.offer) {

          await this.HandleOffer(message.offer);
        }

        if (message.answer) {
          console.log("Receiving Answer");
          await this.peer.setRemoteDescription(
            new RTCSessionDescription(message.answer)
          );
        }

        if (message.iceCandidate) {
          console.log("Receiving and Adding ICE Candidate");
          try {
            await this.peer.addIceCandidate(
              message.iceCandidate
            );
          } catch (err) {
            console.log("error ICE CANDIDADE")
          }


        }

      })

    })

    // loop here
  }

  async OpenCamera() {
    const constraints = {
      video: true,
      audio: true,
    }
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      this.userVideo.srcObject = stream
      this.userStream = stream
    })
  }
  async callUser() {
    console.log("Calling Other User");
    this.peer = this.CreatePeer();

    // await
    this.userStream.getTracks().forEach(async (track) => {
      this.peer.addTrack(track, this.userStream);
    });


  };


  async HandleOffer(offer) {
    console.log("receverd offer")
    this.peer = this.CreatePeer()

    await this.peer.setRemoteDescription(
      new RTCSessionDescription(offer)
    )
    //await
    if (this.userStream) {
      this.userStream.getTracks().forEach(async (track) => {
        this.peer.addTrack(track, this.userStream)
      })
    }

    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);

    //await
    this.webSocket.send(
      JSON.stringify({ answer: this.peer.localDescription })
    );

  }

  CreatePeer() {
    console.log("createing peer connection")
    const Peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.1.google.com:19302" }]
    })
    Peer.onnegotiationneeded = async () => {

      console.log("Creating Offer");

      try {
        const myOffer = await this.peer.createOffer();
        await this.peer.setLocalDescription(myOffer);

        //await
        this.webSocket.send(
          JSON.stringify({ offer: this.peer.localDescription })
        );
      } catch (err) {
        throw err
      }
    };

    Peer.onicecandidate = async (e) => {
      console.log("Found Ice Candidate");
      if (e.candidate) {
        //await
        this.webSocket.send(
          JSON.stringify({ iceCandidate: e.candidate })
        );
      }
    };

    Peer.ontrack = async (e) => {
      console.log("Received Tracks");
      console.log(e.streams)
      this.partnerVideo.srcObject = e.streams[0];
    };



    return Peer
  }





}



class Main extends Net {
  constructor() {
    super()
    this.RoomId = ""
    this.Init()
  }

  async Init() {
    console.log("init")



    this.RoomId = await this.CreateRoom()
    const title = document.querySelector("h1")
    title.innerText = "Current room " + this.RoomId

    const CurrentRooms = await this.FetchRooms()
    this.MakeList(CurrentRooms)

    new Socket(this.RoomId)

    await this.BindToCreate()
    // const CurrentRooms = await this.FetchRooms()
    // this.MakeList(CurrentRooms)
  }


  async BindToCreate() {
    const createBtn = document.querySelector(".create")
    createBtn.addEventListener("click", async (e) => {
      console.log("click")
      this.RoomId = await this.CreateRoom(e)
      const title = document.querySelector("h1")
      title.innerText = "Current room " + this.RoomId

      const CurrentRooms = await this.FetchRooms()
      this.MakeList(CurrentRooms)

      new Socket(this.RoomId)
    })

  }
  BindToDelete(element) {
    element.addEventListener("click", async () => {
      const CurrentRooms = await this.DeleteRoom(element.parentElement.id)
      this.MakeList(CurrentRooms)
    })
  }
  BindToJoin(element) {
    element.addEventListener("click", async () => {
      new Socket(element.parentElement.id)
    })

  }
  BindToRefresh(element) {
    element.addEventListener("click", async () => {
      const resArr = await this.FetchRooms()
      this.MakeList(resArr)
    })

  }


  MakeList(RoomsArr) {
    console.log("Making list")
    const RoomsUl = document.querySelector(".rooms")
    RoomsUl.innerHTML = ""
    const refreshBtn = document.createElement("button")
    refreshBtn.innerText = "refresh"
    refreshBtn.className = "refresh"
    this.BindToRefresh(refreshBtn)
    RoomsUl.append(refreshBtn)
    let i = 0
    for (let val of RoomsArr) {
      if (val != this.RoomId) {
        const li = document.createElement("li")
        li.id = val
        li.innerText = val

        const btn = document.createElement("button")
        btn.innerText = "del"
        btn.className = "del"
        this.BindToDelete(btn)

        const joinBtn = document.createElement("button")
        joinBtn.innerText = "join"
        joinBtn.className = "join"
        this.BindToJoin(joinBtn)


        li.append(btn)
        li.append(joinBtn)
        RoomsUl.append(li)

      }
      i++
    }

  }




}





console.log("JsWorks")


new Main()
