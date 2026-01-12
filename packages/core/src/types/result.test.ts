import { describe, it, expect } from 'vitest';
import { ok, err, wrapAsync, isOk, isErr } from './result.js';

describe('Result type', () => {
  describe('ok()', () => {
    it('should create a successful result', () => {
      const result = ok('success');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should preserve type information', () => {
      const result = ok({ data: 42 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toBe(42);
      }
    });
  });

  describe('err()', () => {
    it('should create an error result', () => {
      const error = new Error('failed');
      const result = err(error);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });

    it('should work with custom error types', () => {
      const result = err({ code: 'CUSTOM_ERROR', message: 'Custom error' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('CUSTOM_ERROR');
      }
    });
  });

  describe('wrapAsync()', () => {
    it('should wrap successful async operations', async () => {
      const result = await wrapAsync(async () => {
        return 'success';
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should catch errors from async operations', async () => {
      const result = await wrapAsync(async () => {
        throw new Error('async error');
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('async error');
      }
    });

    it('should convert non-Error throws to Error', async () => {
      const result = await wrapAsync(async () => {
        throw 'string error';
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      }
    });
  });

  describe('isOk()', () => {
    it('should return true for successful results', () => {
      const result = ok('success');
      expect(isOk(result)).toBe(true);
    });

    it('should return false for error results', () => {
      const result = err(new Error('failed'));
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isErr()', () => {
    it('should return true for error results', () => {
      const result = err(new Error('failed'));
      expect(isErr(result)).toBe(true);
    });

    it('should return false for successful results', () => {
      const result = ok('success');
      expect(isErr(result)).toBe(false);
    });
  });
});
