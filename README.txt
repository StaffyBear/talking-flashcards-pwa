Talking Flashcards V2

Upload all files to the root of your GitHub repository.

Before uploading:
1. Open config.js.
2. Replace REPLACE_WITH_YOUR_PUBLISHABLE_OR_ANON_KEY with your Supabase publishable/anon key.

Supabase setup:
1. Go to Supabase SQL Editor.
2. Run supabase-v2-schema.sql.
3. Go to Authentication > Providers > Email.
4. Enable Email.
5. For testing, you can temporarily disable email confirmation.

Features:
- Public starter categories.
- Logged-in users can create private categories.
- Logged-in users can upload photos/images.
- Logged-in users can record custom audio.
- Tap flashcard to play custom audio first.
- If no recording exists, it falls back to computer speech.
- Photo upload supports gallery/file picker. Some phones also offer camera capture.

Important:
This prototype uses public storage buckets for easier playback. The table rows are protected by ownership, but storage URLs are public if someone has the direct file URL. Before storing real child/family photos in production, move to private buckets with signed URLs.
