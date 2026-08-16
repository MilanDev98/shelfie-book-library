# AI usage

I used AI heavily and treated its output as drafts that I remained responsible for.

- **OpenAI Codex / ChatGPT:** repository planning, Django and Expo implementation assistance,
  matcher and failure-case test generation, code review, debugging, simulator QA support, and
  documentation editing. I inspected the resulting diffs, ran the code and tests, and made the
  final architecture and scope decisions.
- **Google Stitch:** early visual exploration and screen-direction references for the mobile UI.
- **LLM-assisted catalog drafting:** the initial list of popular books and ambiguity cases was
  generated with AI, then structured and reviewed into `catalog.csv`. The importer and matcher
  tests—not the LLM—define runtime behavior.

At runtime, Shelfie uses the hosted `google/gemini-2.5-flash` model through OpenRouter only to read
visible title and author text from detected spine crops. Catalog matching, confidence thresholds,
review routing, and persistence are deterministic application code.
