import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

export default function useSocket(restaurantId) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!restaurantId) return;

    const socket = io("/", {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Socket connected");
      socket.emit("join:restaurant", restaurantId);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [restaurantId]);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef.current, on, off };
}
