import CircuitBreaker from 'opossum';
import breaker, {
  setEventLoopLagThreshold,
  getEventLoopLagThreshold,
} from '../../../src/server/utils/circuitBreaker';

describe('Circuit breaker', () => {
  it('should be an opossum circuit breaker', () => {
    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  // Tests for circuit breaker functionality can be found in
  // __tests__/server/middleware/createRequestHtmlFragment.spec.js

  describe('setEventLoopLagThreshold', () => {
    it('should set a default value of 30ms', () => {
      setEventLoopLagThreshold();
      expect(getEventLoopLagThreshold()).toBe(30);
    });

    it('should set value to 30ms if input is not a number', () => {
      setEventLoopLagThreshold('hello, world');
      expect(getEventLoopLagThreshold()).toBe(30);
    });

    it('should set the given value', () => {
      setEventLoopLagThreshold(44);
      expect(getEventLoopLagThreshold()).toBe(44);
    });

    it('should handle numbers as strings', () => {
      setEventLoopLagThreshold('55');
      expect(getEventLoopLagThreshold()).toBe(55);
    });
  });
});
