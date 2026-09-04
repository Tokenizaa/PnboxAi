// Utility functions for token verification
// This is a simplified implementation - in production, you would use proper JWT verification

export function verifyToken(token: string) {
  // In a real implementation, this would verify a JWT token
  // For now, we'll check if it matches our local token format or Supabase token format
  
  // Check for local development token format
  if (token.startsWith('local_token_')) {
    const userId = token.substring('local_token_'.length);
    // In a real app, you'd look up the user in database
    return {
      id: userId,
      email: `user${userId}@example.com`,
      name: `User ${userId}`
    };
  }
  
  // Check for Supabase-like token format (simplified)
  // In reality, you'd verify the JWT signature and decode it
  if (token.length > 10) {
    // This is a placeholder - real implementation would decode and verify JWT
    return {
      id: 'user_' + Math.abs(hashCode(token)) % 10000,
      email: 'user@example.com',
      name: 'Test User'
    };
  }
  
  return null;
}

// Simple string hash function for demo purposes
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}