import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './utils/authUtils.js';

// Extend Express Request interface to include user property
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

/**
 * Route-level authentication middleware that verifies JWT tokens and attaches user info to request
 * Can be used directly in route definitions: app.get('/api/protected', authMiddleware, handler)
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Access token required' 
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid or expired token' 
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Token validation failed' 
    });
  }
}

/**
 * Configures global authentication middleware for the app
 * Applies authentication to all routes except specified exclusions
 */
export function configureAuthMiddleware(app) {
  // Apply the authentication middleware to all routes except auth routes
  app.use((req, res, next) => {
    // Skip authentication for auth routes and health check
    if (req.path.startsWith('/api/auth/') || 
        req.path === '/api/health' ||
        req.path.startsWith('/api/automation/catalog') ||
        req.path.startsWith('/api/automation/templates')) {
      return next();
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Access token required' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const user = verifyToken(token);
      if (!user) {
        return res.status(401).json({ 
          status: 'error', 
          message: 'Invalid or expired token' 
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token validation failed' 
      });
    }
  });
}
