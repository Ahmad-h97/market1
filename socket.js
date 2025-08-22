// socket.js
import { Server } from "socket.io";

let io; // store Socket.io instance

export const initSocketServer = (serverInstance) => {
  io = new Server(serverInstance, {
    cors: {
      origin: [
        'http://localhost:5173',
        'https://syrian-market-frontend1.vercel.app',
        'https://your-production-frontend.com'
      ],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

export const getSocketServer = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};
