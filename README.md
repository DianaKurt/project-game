 # TicTac — Real-Time Multiplayer Game
## Description
- TicTac is a real-time multiplayer web application that allows two remote users to play Tic-Tac-Toe simultaneously.
- The application supports multiple parallel game sessions and preserves user statistics (wins, losses, draws).
- There is no registration or authentication — users only enter their name to start playing.

# Tech Stack
## Backend
- Node.js
- Express
- Socket.IO (real-time communication)
## Frontend
- Vanilla JavaScript
- HTML5
- Pure CSS (no frameworks)
## Storage
- JSON file persistence for user statistics
## Features
- Real-time gameplay using WebSocket (Socket.IO)
- Multiple games running simultaneously
- Lobby system (create & join sessions)
- Server-side move validation
- Win/draw detection
- Persistent user statistics
- Clean, modern UI
## Architecture Overview
The application follows a layered architecture:
1. Socket Layer – handles real-time events
2. Game Service Layer – contains business logic
3. Store Layer – manages in-memory game sessions
4. Repository Layer – persists user statistics
Each game session runs in an isolated Socket.IO room to ensure independent gameplay.
## How to Run Locally
npm install
npm start

Open:
http://localhost:4000
To test multiplayer, open another browser window or incognito mode.
## Project Highlights
- Real-time bi-directional communication
- Server-side authority model (client cannot cheat)
- Clean separation of concerns
- Scalable session-based architecture