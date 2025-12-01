import { io } from "socket.io-client";

export const socket = io("wss://ws.royalfxs.com",{
    transports: ["websocket"],
    reconnection: true,
    autoConnect: true,
  }); // replace if backend is remote
