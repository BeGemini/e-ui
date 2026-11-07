export type WordFeedbackStatus = 'correct' | 'typo' | 'wrong';

export interface WordFeedback {
  word: string;
  userWord: string;
  status: WordFeedbackStatus;
}

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

/** Align words using the minimum number of insertions, deletions, and substitutions. */
function alignTokens(userTokens: string[], correctTokens: string[]) {
  const distances: number[][] = Array(correctTokens.length + 1)
    .fill(null)
    .map(() => Array(userTokens.length + 1).fill(0));

  for (let i = 0; i <= correctTokens.length; i++) {
    distances[i][0] = i;
  }
  for (let j = 0; j <= userTokens.length; j++) {
    distances[0][j] = j;
  }

  for (let i = 1; i <= correctTokens.length; i++) {
    for (let j = 1; j <= userTokens.length; j++) {
      const substitutionCost = correctTokens[i - 1] === userTokens[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j - 1] + substitutionCost,
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1
      );
    }
  }

  const aligned: Array<{ word: string; userWord: string }> = [];
  let i = correctTokens.length;
  let j = userTokens.length;

  while (i > 0 || j > 0) {
    const substitutionCost = i > 0 && j > 0 && correctTokens[i - 1] !== userTokens[j - 1] ? 1 : 0;

    if (i > 0 && j > 0 && distances[i][j] === distances[i - 1][j - 1] + substitutionCost) {
      aligned.push({ word: correctTokens[i - 1], userWord: userTokens[j - 1] });
      i--;
      j--;
    } else if (i > 0 && distances[i][j] === distances[i - 1][j] + 1) {
      aligned.push({ word: correctTokens[i - 1], userWord: '' });
      i--;
    } else {
      aligned.push({ word: '', userWord: userTokens[j - 1] });
      j--;
    }
  }

  return aligned.reverse();
}

export function checkAccuracy(userInput: string, correctText: string): {
  accuracy: number;
  wordFeedback: WordFeedback[];
  summary: { correct: number; typo: number; wrong: number; total: number };
} {
  const userTokens = tokenizeText(userInput);
  const correctTokens = tokenizeText(correctText);
  const alignedTokens = alignTokens(userTokens, correctTokens);

  const wordFeedback: WordFeedback[] = [];
  let correctCount = 0;
  let typoCount = 0;
  let wrongCount = 0;

  for (const { word, userWord } of alignedTokens) {
    let status: WordFeedbackStatus = 'wrong';

    if (word && userWord) {
      const rawStatus = checkWordAccuracy(userWord, word);
      status = rawStatus === 'acceptable' ? 'typo' : rawStatus;
    }

    wordFeedback.push({ word, userWord, status });

    if (status === 'correct') {
      correctCount++;
    } else if (status === 'typo') {
      typoCount++;
    } else {
      wrongCount++;
    }
  }

  const total = correctTokens.length;
  const scoredWords = correctCount + typoCount;
  const accuracy = total > 0 ? Math.round((scoredWords / total) * 100) : 0;

  return {
    accuracy,
    wordFeedback,
    summary: {
      correct: correctCount,
      typo: typoCount,
      wrong: wrongCount,
      total,
    },
  };
}
