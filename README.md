## Recommendations by Level

This API supports recommending books to students based on their academic level (ND1, ND2, HND1, HND2).

Changes introduced:

- Book model now includes `targetLevels: string[]` where allowed values are `ND1 | ND2 | HND1 | HND2`.
- User model includes an optional `level` field with the same enum.
- New endpoint: `GET /api/books/recommended` (auth required) returns active books where `targetLevels` contains the student's level or is empty (meaning available to all).

Example response:

```
{
	"success": true,
	"count": 3,
	"data": [ /* Book[] */ ]
}
```

Notes:

- Admins can set `targetLevels` when creating/updating a book.
- If a user has no `level` set, the endpoint returns an empty list with a guidance message.
# web-based-api