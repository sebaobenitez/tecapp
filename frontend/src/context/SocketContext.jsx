import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const BACKEND = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  : '';

export function SocketProvider({ children, token, negocio_id }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !negocio_id) return;

    const socket = io(BACKEND, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; setConnected(false); };
  }, [token, negocio_id]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() { return useContext(SocketContext); }

export function useSocketEvent(event, handler) {
  const { socket } = useSocket() || {};
  useEffect(() => {
    if (!socket || !event) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, event, handler]);
}
