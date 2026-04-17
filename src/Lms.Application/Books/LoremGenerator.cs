namespace Lms.Application.Books;

internal static class LoremGenerator
{
    private const int TotalPages = 300;

    private static readonly string[] Words =
    [
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
    ];

    public static int GetTotalPages() => TotalPages;

    public static string GeneratePage(int pageNumber)
    {
        var seed = pageNumber * 7919;
        var rng = new SeededRandom(seed);

        var sentenceCount = 15 + (int)(rng.Next() * 10); // 15-24 sentences
        var sentences = new List<string>(sentenceCount);

        for (var s = 0; s < sentenceCount; s++)
        {
            var wordCount = 8 + (int)(rng.Next() * 15); // 8-22 words
            var words = new string[wordCount];

            for (var w = 0; w < wordCount; w++)
            {
                var idx = (int)(rng.Next() * Words.Length);
                words[w] = Words[idx];
            }

            words[0] = char.ToUpperInvariant(words[0][0]) + words[0][1..];
            sentences.Add(string.Join(" ", words) + ".");
        }

        // Group sentences into 2-4 paragraphs
        var paragraphs = new List<string>();
        var start = 0;

        while (start < sentences.Count)
        {
            var size = 3 + (int)(rng.Next() * 4);
            var end = Math.Min(start + size, sentences.Count);
            paragraphs.Add(string.Join(" ", sentences.GetRange(start, end - start)));
            start = end;
        }

        return string.Join("\n\n", paragraphs);
    }

    /// <summary>
    /// Matches the JS seeded PRNG: s = (s * 1103515245 + 12345) &amp; 0x7fffffff
    /// </summary>
    private sealed class SeededRandom
    {
        private int _state;

        public SeededRandom(int seed)
        {
            _state = seed;
        }

        public double Next()
        {
            _state = (_state * 1103515245 + 12345) & 0x7fffffff;
            return _state / (double)0x7fffffff;
        }
    }
}
