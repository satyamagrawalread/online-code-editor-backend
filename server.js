// import ACTIONS from './src/Actions.js';
// import express from 'express';
// // import cors from 'cors';
// import http from 'http';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { Server } from 'socket.io';
// import ACTIONS from './src/actions';

const ACTIONS = require('./Actions');
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
// app.use(cors());

const server = http.createServer(app);


const io = new Server(server, {
    cors: {
        // origin: "http://127.0.0.1:5173"
    }
});

// app.use(express.static('dist'));
// app.use((req, res, next) => {
//     res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// })

const userSocketMap = {}

function getAllConnectedClients(roomId) {
    // console.log(io.sockets.adapter.rooms.get(roomId));
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            username: userSocketMap[socketId]
        }
    });
}

io.on('connection', socket => {
    console.log('socket connected', socket.id);
    socket.on(ACTIONS.JOIN, ({roomId, username}) => {
        console.log('Inside join', roomId, username);
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        console.log(clients);
        clients.forEach(({socketId}) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            })
        })
    });
    socket.on(ACTIONS.CODE_CHANGE, ({mode, code, roomId}) => {
        // console.log('line49', mode, code, roomId)
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {
            socketId: socket.id,
            mode,
            code,
        });
    })
    socket.on(ACTIONS.SYNC_CODE, ({mode, code, socketId}) => {
        // console.log(mode, code);
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, {
            socketId,
            mode,
            code
        })
    })
    //On disconnection
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id]
            })
        })
        delete userSocketMap[socket.id];
        socket.leave();
    })
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Listening on port http://localhost:${PORT}`);
});
