# Content Translation System

The application supports multi-language content with Russian (ru) as the default language, and English (en) and Kazakh (kk) as additional languages.

## Architecture

### Two-Layer Translation System

1. **UI Translations** (`src/lib/i18n.ts`)
   - System messages, buttons, labels
   - Hardcoded in the application
   - Languages: Russian, English, Kazakh

2. **Content Translations** (Database)
   - Chapter titles and descriptions
   - Page titles and descriptions
   - Paragraph content and captions
   - Stored in translation tables

## Database Schema

### Translation Tables

```sql
-- ChapterTranslations
CREATE TABLE "ChapterTranslations" (
    "Id" uuid PRIMARY KEY,
    "ChapterId" uuid REFERENCES "Chapters"(Id),
    "Language" varchar(10) NOT NULL, -- 'ru', 'en', 'kk'
    "Title" varchar(500) NOT NULL,
    "Description" text,
    UNIQUE(ChapterId, Language)
);

-- PageTranslations
CREATE TABLE "PageTranslations" (
    "Id" uuid PRIMARY KEY,
    "PageId" uuid REFERENCES "Pages"(Id),
    "Language" varchar(10) NOT NULL,
    "Title" varchar(500) NOT NULL,
    "Description" text,
    UNIQUE(PageId, Language)
);

-- ParagraphTranslations
CREATE TABLE "ParagraphTranslations" (
    "Id" uuid PRIMARY KEY,
    "ParagraphId" uuid REFERENCES "Paragraphs"(Id),
    "Language" varchar(10) NOT NULL,
    "Content" text NOT NULL,
    "Caption" text,
    UNIQUE(ParagraphId, Language)
);
```

## How It Works

### Default Content (Russian)

Content is stored in the main tables:
- `Chapters.Title`, `Chapters.Description` (Russian)
- `Pages.Title`, `Pages.Description` (Russian)
- `Paragraphs.Content`, `Paragraphs.Caption` (Russian)

### Translated Content

Translations are stored in separate tables:
- `ChapterTranslations` - for English and Kazakh
- `PageTranslations` - for English and Kazakh
- `ParagraphTranslations` - for English and Kazakh

### Language Resolution

When a user requests content:
1. Check user's language preference (`Profile.Language`)
2. If language is Russian → Return content from main tables
3. If language is English/Kazakh:
   - Look for translation in translation table
   - If found → Return translated content
   - If not found → Fallback to Russian content

## Adding Translations

### Via SQL

```sql
-- Add English translation for a chapter
INSERT INTO "ChapterTranslations" (
    "Id", "ChapterId", "Language", "Title", "Description", "CreatedAt"
) VALUES (
    gen_random_uuid(),
    'chapter-id-here',
    'en',
    'IT Development Strategy',
    'Strategy for IT development in Kazakhstan',
    NOW()
);

-- Add Kazakh translation for a page
INSERT INTO "PageTranslations" (
    "Id", "PageId", "Language", "Title", "Description", "CreatedAt"
) VALUES (
    gen_random_uuid(),
    'page-id-here',
    'kk',
    'АТ дамыту стратегиясы',
    'Қазақстандағы АТ дамыту стратегиясы',
    NOW()
);

-- Add English translation for a paragraph
INSERT INTO "ParagraphTranslations" (
    "Id", "ParagraphId", "Language", "Content", "CreatedAt"
) VALUES (
    gen_random_uuid(),
    'paragraph-id-here',
    'en',
    'This is the English content of the paragraph.',
    NOW()
);
```

### Via API (Future Implementation)

```http
POST /api/chapters/{id}/translations
{
  "language": "en",
  "title": "IT Development Strategy",
  "description": "Strategy for IT development"
}

POST /api/pages/{id}/translations
{
  "language": "kk",
  "title": "АТ дамыту стратегиясы",
  "description": "Қазақстандағы АТ дамыту стратегиясы"
}

POST /api/paragraphs/{id}/translations
{
  "language": "en",
  "content": "This is the English content.",
  "caption": "Optional caption"
}
```

## Example: Querying Translated Content

```sql
-- Get chapter with English translation
SELECT
    c."Id",
    COALESCE(ct."Title", c."Title") as "Title",
    COALESCE(ct."Description", c."Description") as "Description"
FROM "Chapters" c
LEFT JOIN "ChapterTranslations" ct
    ON c."Id" = ct."ChapterId"
    AND ct."Language" = 'en'
WHERE c."Id" = 'some-chapter-id';

-- Get all pages with Kazakh translations
SELECT
    p."Id",
    p."Slug",
    COALESCE(pt."Title", p."Title") as "Title",
    COALESCE(pt."Description", p."Description") as "Description"
FROM "Pages" p
LEFT JOIN "PageTranslations" pt
    ON p."Id" = pt."PageId"
    AND pt."Language" = 'kk';
```

## Supported Languages

| Code | Language | Status |
|------|----------|--------|
| `ru` | Русский (Russian) | ✓ Default |
| `en` | English | ✓ Supported |
| `kk` | Қазақша (Kazakh) | ✓ Supported |

## Translation Workflow

1. **Create Content** (in Russian)
   - Editor creates chapter/page/paragraph
   - Content saved in main tables

2. **Add Translations**
   - Translator adds English version
   - Translator adds Kazakh version
   - Translations saved in translation tables

3. **User Views Content**
   - User selects language (UI language selector)
   - API returns content in selected language
   - Falls back to Russian if translation missing

## Best Practices

### When to Translate

- ✅ Chapter titles and descriptions
- ✅ Page titles and descriptions
- ✅ Paragraph content (main text)
- ✅ Image captions
- ❌ User-generated content (comments)
- ❌ System metadata (slugs, IDs)

### Translation Quality

- Keep the same tone and style
- Preserve formatting (markdown, lists)
- Translate technical terms accurately
- Maintain paragraph structure

### Fallback Strategy

Always provide Russian content as the default. Translations are optional but recommended for key pages.

## Future Enhancements

1. **Translation Management UI**
   - Admin panel for managing translations
   - Side-by-side editor (Russian | English | Kazakh)
   - Translation status tracking

2. **Translation API**
   - REST endpoints for CRUD operations
   - Bulk translation import/export
   - Translation versioning

3. **Translation Helpers**
   - Auto-translation suggestions (via API)
   - Translation coverage reports
   - Missing translation alerts

4. **SEO Optimization**
   - Language-specific slugs
   - hreflang tags
   - Translated meta descriptions

## Migration Notes

Existing content (before translation system):
- All existing chapters, pages, and paragraphs are in Russian
- Russian content remains in main tables
- Add translations incrementally
- No data migration needed
