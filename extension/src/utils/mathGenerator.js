/**
 * Progressive Math Challenge Generator
 * Generates solvable arithmetic equations with integer answers based on difficulty tier.
 * Maximum difficulty is capped to prevent accidental impossible equations.
 */

export const MAX_DIFFICULTY_LEVEL = 10;

/**
 * Returns a random integer between min and max inclusive.
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a challenge object: { expression, answer, difficulty, label }
 * @param {number} level Current website difficulty level (1 to 10)
 */
export function generateChallenge(level = 1) {
  const safeLevel = Math.max(1, Math.min(Math.floor(level), MAX_DIFFICULTY_LEVEL));

  let expression;
  let answer;
  let label = `Tier ${safeLevel}`;

  switch (safeLevel) {
    case 1: {
      // Basic addition: two 1-2 digit numbers (sum <= 50)
      const a = randomInt(5, 25);
      const b = randomInt(4, 25);
      expression = `${a} + ${b}`;
      answer = a + b;
      break;
    }

    case 2: {
      // Subtraction or simple 2-digit addition
      const isSub = Math.random() > 0.5;
      if (isSub) {
        const a = randomInt(20, 60);
        const b = randomInt(5, a - 5);
        expression = `${a} - ${b}`;
        answer = a - b;
      } else {
        const a = randomInt(20, 48);
        const b = randomInt(15, 48);
        expression = `${a} + ${b}`;
        answer = a + b;
      }
      break;
    }

    case 3: {
      // Single digit multiplication with addition
      const a = randomInt(6, 9);
      const b = randomInt(6, 9);
      const c = randomInt(5, 25);
      expression = `${a} × ${b} + ${c}`;
      answer = a * b + c;
      break;
    }

    case 4: {
      // Multiplication with subtraction
      const a = randomInt(7, 12);
      const b = randomInt(6, 9);
      const prod = a * b;
      const c = randomInt(5, prod - 5);
      expression = `${a} × ${b} - ${c}`;
      answer = prod - c;
      break;
    }

    case 5: {
      // Two-digit multiplication by single-digit plus 2-digit number
      const a = randomInt(12, 19);
      const b = randomInt(4, 8);
      const c = randomInt(20, 50);
      expression = `${a} × ${b} + ${c}`;
      answer = a * b + c;
      break;
    }

    case 6: {
      // Parenthesized addition multiplied by a number
      const a = randomInt(8, 18);
      const b = randomInt(7, 15);
      const c = randomInt(3, 6);
      expression = `(${a} + ${b}) × ${c}`;
      answer = (a + b) * c;
      break;
    }

    case 7: {
      // Division with integer result combined with addition
      const divisor = randomInt(3, 8);
      const quotient = randomInt(7, 18);
      const dividend = divisor * quotient;
      const addend = randomInt(15, 60);
      expression = `${dividend} ÷ ${divisor} + ${addend}`;
      answer = quotient + addend;
      break;
    }

    case 8: {
      // Double multiplication difference
      const a = randomInt(11, 16);
      const b = randomInt(4, 7);
      const c = randomInt(6, 9);
      const d = randomInt(3, 5);
      const prod1 = a * b;
      const prod2 = c * d;
      expression = `${a} × ${b} - ${c} × ${d}`;
      answer = prod1 - prod2;
      break;
    }

    case 9: {
      // Two-digit by two-digit multiplication or complex combo
      const a = randomInt(13, 24);
      const b = randomInt(7, 12);
      const c = randomInt(25, 75);
      expression = `${a} × ${b} - ${c}`;
      answer = a * b - c;
      break;
    }

    case 10:
    default: {
      // Mastery tier: three terms with mixed operators
      const a = randomInt(14, 25);
      const b = randomInt(6, 9);
      const c = randomInt(5, 8);
      const d = randomInt(4, 7);
      expression = `${a} × ${b} + ${c} × ${d}`;
      answer = a * b + c * d;
      label = `Mastery Tier (${MAX_DIFFICULTY_LEVEL})`;
      break;
    }
  }

  return {
    expression,
    answer,
    difficulty: safeLevel,
    label,
  };
}

/**
 * Validates a user's answer against the expected answer.
 * Accepts complete base-10 integer answers without truncation or precision loss.
 */
export function validateAnswer(userAnswer, expectedAnswer) {
  if (userAnswer === null || userAnswer === undefined) return false;
  if (typeof userAnswer !== 'string' && typeof userAnswer !== 'number') return false;
  const answer = String(userAnswer).trim();
  if (!/^-?\d+$/.test(answer)) return false;
  const parsed = Number(answer);
  return Number.isSafeInteger(parsed) && Number.isSafeInteger(expectedAnswer) && parsed === expectedAnswer;
}
