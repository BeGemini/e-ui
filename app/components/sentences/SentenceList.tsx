import { Card, CardContent } from '@/components/ui/card';
import type { MySentence } from '@/lib/types';

interface SentenceListProps {
  sentences: MySentence[];
  showOriginal: boolean;
}

/** List of the learner's saved sentences, optionally with the original text below each one. */
export default function SentenceList({ sentences, showOriginal }: SentenceListProps) {
  return (
    <Card>
      <CardContent>
        <ol className="divide-y divide-gray-100">
          {sentences.map((sentence) => (
            <li key={sentence.sentenceIndex} className="py-4 first:pt-0 last:pb-0">
              {sentence.userInput ? (
                <p className="text-gray-900 whitespace-pre-wrap break-words">
                  {sentence.userInput}
                </p>
              ) : (
                <p className="italic text-gray-400">(Skipped)</p>
              )}
              {showOriginal && (
                // Color must stay in sync with ORIGINAL_BG_HEX in lib/sentence-export.
                <div className="mt-2 rounded-md bg-[#E8F5E9] px-3 py-2 text-gray-800 whitespace-pre-wrap break-words">
                  {sentence.correctAnswer}
                </div>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
