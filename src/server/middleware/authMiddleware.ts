import { Request, Response, NextFunction } from 'express';
import { authMiddleware, optionalAuthMiddleware, getUserFromToken } from '../services/authStore';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        [key: string]: any;
      };
    }
  }
}

export { authMiddleware, optionalAuthMiddleware, getUserFromToken };
