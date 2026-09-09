import { WordFeedback } from './types';

/**
 * Calculate Levenshtein distance between two strings
 * Measures the minimum number of single-character edits needed to transform one string into another
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Number of edits required
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = 1 + Math.min(
          matrix[i - 1][j],     // Deletion
          matrix[i][j - 1],     // Insertion
          matrix[i - 1][j - 1]  // Substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Tokenize text into words, handling punctuation
 * @param text - Text to tokenize
 * @returns Array of words
 */
export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * Check word accuracy with fuzzy matching
 * Uses Levenshtein distance to allow for typos
 * @param userWord - Word typed by user
 * @param correctWord - Correct word from subtitle
 * @param maxDistance - Maximum Levenshtein distance to consider "acceptable"
 * @returns "correct" | "acceptable" | "wrong"
 */
export function checkWordAccuracy(
  userWord: string,
  correctWord: string,
  maxDistance: number = 2
): 'correct' | 'acceptable' | 'wrong' {
  const user = userWord.toLowerCase().trim();
  const correct = correctWord.toLowerCase().trim();

  if (user === correct) {
    return 'correct';
  }

  const distance = levenshteinDistance(user, correct);

  if (distance > 0 && distance <= maxDistance) {
    return 'acceptable';
  }

  return 'wrong';
}

/**
 * Calculate accuracy for a sentence dictation
 * @param userInput - User's typed dictation
 * @param correctText - Correct subtitle text
 * @returns Object with accuracy percentage and word-by-word feedback
 */
export function checkAccuracy(userInput: string, correctText: string): {
  accuracy: number;
  wordFeedback: WordFeedback[];
  summary: { correct: number; acceptable: number; wrong: number; total: number };
} {
  const userTokens = tokenizeText(userInput);
  const correctTokens = tokenizeText(correctText);

  const wordFeedback: WordFeedback[] = [];
  let correctCount = 0;
  let acceptableCount = 0;
  let wrongCount = 0;

  // Compare each correct word with user's input
  for (let i = 0; i < correctTokens.length; i++) {
    const correctWord = correctTokens[i];
    const userWord = userTokens[i];

    if (!userWord) {
      // User didn't provide this word
      wordFeedback.push({
        index: i,
        userWord: '',
        correctWord,
        status: 'wrong',
      });
      wrongCount++;
    } else {
      const status = checkWordAccuracy(userWord, correctWord);
      wordFeedback.push({
        index: i,
        userWord,
        correctWord,
        status,
      });

      if (status === 'correct') {
        correctCount++;
      } else if (status === 'acceptable') {
        acceptableCount++;
      } else {
        wrongCount++;
      }
    }
  }

  // Check for extra words in user input
  if (userTokens.length > correctTokens.length) {
    for (let i = correctTokens.length; i < userTokens.length; i++) {
      wordFeedback.push({
        index: i,
        userWord: userTokens[i],
        correctWord: '',
        status: 'wrong',
      });
      wrongCount++;
    }
  }

  const total = correctTokens.length;
  const scoredWords = correctCount + acceptableCount;
  const accuracy = total > 0 ? Math.round((scoredWords / total) * 100) : 0;

  return {
    accuracy,
    wordFeedback,
    summary: {
      correct: correctCount,
      acceptable: acceptableCount,
      wrong: wrongCount,
      total,
    },
  };
}
