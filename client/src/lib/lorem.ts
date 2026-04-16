const WORDS = [
  "the", "of", "and", "a", "to", "in", "is", "it", "that", "was",
  "for", "on", "are", "with", "as", "his", "they", "be", "at", "one",
  "have", "this", "from", "by", "had", "not", "but", "what", "all", "were",
  "when", "we", "there", "can", "an", "your", "which", "their", "said", "if",
  "do", "into", "has", "more", "her", "two", "like", "him", "see", "time",
  "could", "no", "make", "than", "first", "been", "its", "who", "now", "people",
  "my", "made", "over", "did", "down", "only", "way", "find", "use", "may",
  "long", "very", "after", "words", "called", "just", "where", "most", "know",
  "through", "back", "much", "before", "also", "around", "another", "came",
  "come", "work", "three", "word", "must", "because", "does", "part", "even",
  "place", "well", "such", "here", "take", "why", "thing", "great", "help",
  "every", "still", "should", "name", "world", "thought", "hand", "old",
  "life", "tell", "write", "become", "story", "chapter", "book", "read",
  "page", "night", "between", "never", "city", "heart", "light", "eyes",
  "room", "young", "door", "house", "morning", "voice", "moment", "face",
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

export function generatePage(pageNumber: number): string {
  const rng = seededRandom(pageNumber * 7919)
  const sentenceCount = 15 + Math.floor(rng() * 10) // 15-24 sentences per page
  const sentences: string[] = []

  for (let s = 0; s < sentenceCount; s++) {
    const wordCount = 8 + Math.floor(rng() * 15) // 8-22 words per sentence
    const words: string[] = []
    for (let w = 0; w < wordCount; w++) {
      const idx = Math.floor(rng() * WORDS.length)
      words.push(WORDS[idx])
    }
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
    sentences.push(words.join(" ") + ".")
  }

  // Group sentences into 2-4 paragraphs
  const paragraphs: string[] = []
  let start = 0
  while (start < sentences.length) {
    const size = 3 + Math.floor(rng() * 4)
    paragraphs.push(sentences.slice(start, start + size).join(" "))
    start += size
  }

  return paragraphs.join("\n\n")
}

export const TOTAL_PAGES = 300
