'use client';

import { io } from 'socket.io-client';

// Initialize the socket connection to the server
// Use the environment variable for split deployment (Render URL)
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const socket = io(SOCKET_URL, {
    autoConnect: false, // We'll manually connect in the component
    reconnection: true,
});
