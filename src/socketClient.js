import { io } from "socket.io-client";

export const socket = io("wss://ws.slvgalleria.in",{
    transports: ["websocket"],
    reconnection: true,
    autoConnect: true,
  }); // replace if backend is remote
