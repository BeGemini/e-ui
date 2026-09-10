/**
 * Simple in-memory cache for performance optimization
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { data, expiresAt });
  }

  /**
   * Delete from cache
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get or set pattern
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }
}

// Global cache instance
export const cache = new Cache();

/**
 * Cache keys constants
 */
export const CACHE_KEYS = {
  EXERCISE_LIST: 'exercises:list',
  EXERCISE_DETAIL: (id: string) => `exercise:${id}`,
  SUBTITLE_CONFIG: (id: string, userId: string) => `subtitle:${id}:${userId}`,
} as const;

/**
 * Cache TTLs
 */
export const CACHE_TTL = {
  EXERCISE_LIST: 600, // 10 minutes
  EXERCISE_DETAIL: 300, // 5 minutes
  SUBTITLE_CONFIG: 300, // 5 minutes
} as const;
