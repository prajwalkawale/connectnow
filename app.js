require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
});

const connectDB = require('./config/db');
const indexRouter = require('./routes/index');

// Add rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting
app.use(limiter);

// Database connection
connectDB();

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', indexRouter);

// Room user tracking
const roomUsers = new Map();

// Socket.IO connections
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    let currentRoom = null;
    let currentUserId = null;
  
    socket.on('join-room', (roomId, userId) => {
      // Validate room ID format
      if (!/^[a-z0-9-]+$/.test(roomId)) {
        socket.emit('error', 'Invalid room ID format');
        return;
      }

      // Leave previous room if any
      if (currentRoom) {
        // Remove from room users list
        const users = roomUsers.get(currentRoom) || new Set();
        users.delete(currentUserId);
        
        if (users.size === 0) {
          roomUsers.delete(currentRoom);
        } else {
          roomUsers.set(currentRoom, users);
        }
        
        socket.to(currentRoom).emit('user-disconnected', currentUserId);
        socket.leave(currentRoom);
      }

      // Join new room
      currentRoom = roomId;
      currentUserId = userId;
      socket.join(roomId);
      
      // Add to room users list
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId).add(userId);
      
      console.log(`User ${userId} joined room ${roomId}`);
      console.log(`Room ${roomId} has ${roomUsers.get(roomId).size} users`);
      
      // Broadcast to other users in the room
      socket.to(roomId).emit('user-connected', userId);
  
      // Handle disconnection
      socket.on('disconnect', () => {
        handleUserLeaving();
      });

      // Handle room leaving
      socket.on('leave-room', () => {
        handleUserLeaving();
      });
  
      // Signaling handlers with error handling
      socket.on('offer', async (data, roomId) => {
        try {
          if (roomId === currentRoom) {
            console.log(`Relaying offer from ${socket.id} in room ${roomId}`);
            socket.to(roomId).emit('offer', {
              offer: data.offer,
              senderId: socket.id
            });
          }
        } catch (error) {
          console.error('Error handling offer:', error);
          socket.emit('error', 'Failed to process offer');
        }
      });
  
      socket.on('answer', async (data, roomId) => {
        try {
          if (roomId === currentRoom) {
            console.log(`Relaying answer from ${socket.id} to ${data.targetUserId} in room ${roomId}`);
            socket.to(data.targetUserId).emit('answer', {
              answer: data.answer,
              senderId: socket.id
            });
          }
        } catch (error) {
          console.error('Error handling answer:', error);
          socket.emit('error', 'Failed to process answer');
        }
      });
  
      socket.on('ice-candidate', async (data, roomId) => {
        try {
          if (roomId === currentRoom) {
            console.log(`Relaying ICE candidate from ${socket.id} to ${data.targetUserId} in room ${roomId}`);
            socket.to(data.targetUserId).emit('ice-candidate', {
              candidate: data.candidate,
              senderId: socket.id
            });
          }
        } catch (error) {
          console.error('Error handling ICE candidate:', error);
          socket.emit('error', 'Failed to process ICE candidate');
        }
      });

      // Handle audio state changes
      socket.on('audio-state-change', (data) => {
        if (data.roomId === currentRoom) {
          console.log(`Broadcasting audio state change from ${socket.id} in room ${data.roomId}`);
          socket.to(data.roomId).emit('audio-state-change', {
            userId: socket.id,
            isAudioEnabled: data.isAudioEnabled
          });
        }
      });
    });
    
    // Handle user leaving helper function
    function handleUserLeaving() {
      if (currentRoom && currentUserId) {
        console.log(`User ${currentUserId} left room ${currentRoom}`);
        
        // Update room users list
        const users = roomUsers.get(currentRoom);
        if (users) {
          users.delete(currentUserId);
          
          if (users.size === 0) {
            roomUsers.delete(currentRoom);
            console.log(`Room ${currentRoom} is now empty and removed`);
          } else {
            roomUsers.set(currentRoom, users);
            console.log(`Room ${currentRoom} has ${users.size} users remaining`);
          }
        }
        
        // Notify other users in the room
        socket.to(currentRoom).emit('user-disconnected', currentUserId);
        socket.leave(currentRoom);
        
        currentRoom = null;
        currentUserId = null;
      }
    }
});
  
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));