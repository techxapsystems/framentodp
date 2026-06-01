import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from '../routers';
import type { Request, Response } from 'express';

describe('dashboard.getIdleDriversForWarning', () => {
  it('should return an array of idle drivers when authenticated', async () => {
    // Create a mock context with authenticated user
    const mockReq = {
      headers: {
        cookie: 'app_session_id=test-token',
      },
      protocol: 'https',
      hostname: 'localhost',
    } as unknown as Request;

    const mockRes = {
      cookie: () => {},
    } as unknown as Response;

    // Create context
    const ctx = {
      req: mockReq,
      res: mockRes,
      user: {
        openId: 'gabriel.ferreira',
        name: 'Gabriel Ferreira',
        email: 'gabriel.ferreira',
        role: 'admin' as const,
      },
    };

    // Create the tRPC caller
    const caller = appRouter.createCaller(ctx);

    // Call the procedure
    try {
      const result = await caller.dashboard.getIdleDriversForWarning();
      
      // Should return an array
      expect(Array.isArray(result)).toBe(true);
      console.log('Result:', result);
    } catch (error: any) {
      console.error('Error:', error.message);
      throw error;
    }
  });

  it('should reject when not authenticated', async () => {
    // Create a mock context without authenticated user
    const mockReq = {
      headers: {},
      protocol: 'https',
      hostname: 'localhost',
    } as unknown as Request;

    const mockRes = {
      cookie: () => {},
    } as unknown as Response;

    // Create context without user
    const ctx = {
      req: mockReq,
      res: mockRes,
      user: null,
    };

    // Create the tRPC caller
    const caller = appRouter.createCaller(ctx);

    // Call the procedure - should throw UNAUTHORIZED
    try {
      await caller.dashboard.getIdleDriversForWarning();
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.code).toBe('UNAUTHORIZED');
    }
  });
});
