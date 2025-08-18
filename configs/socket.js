import { Server } from 'socket.io';

let ioInstance = null;

export function initSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  ioInstance.on('connection', (socket) => {
    // Unirse a una sala por plan
    socket.on('join-plan', ({ idPlan }) => {
      if (!idPlan) return;
      socket.join(`plan-${idPlan}`);
    });

    socket.on('leave-plan', ({ idPlan }) => {
      if (!idPlan) return;
      socket.leave(`plan-${idPlan}`);
    });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}


