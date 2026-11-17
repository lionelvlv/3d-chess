# 3D Chess — Test Suite

## Rule Validation Tests (`tests/chess.test.js`)

Simple validation suite for board state and rule checking:

```javascript
// Example test suite structure
import { validateMove, isCheck, isCheckmate } from '../js/engine.js';

describe('Chess Rules Engine', () => {
  test('initial board setup allows valid pawn move', () => {
    const isValid = validateMove('e2', 'e4');
    expect(isValid).toBe(true);
  });

  test('illegal piece movement is rejected', () => {
    const isValid = validateMove('e2', 'e5');
    expect(isValid).toBe(false);
  });
});
```
