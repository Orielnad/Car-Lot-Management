# מערכת לניהול מגרש רכבים (Car Lot Management)

## מטרת המוצר
מערכת Web לניהול מגרש רכבים לשימוש עסקי אמיתי: ניהול מלאי רכבים, לקוחות, לידים, עסקאות,
מסמכים, תשלומים, הרשאות משתמשים, אוטומציות ודוחות.

> **סטטוס נוכחי:** תחילת MVP. מודול ראשון עובד: משתמשים, הרשאות (RBAC) וסניפים, עם
> Backend רץ מקצה לקצה מול מסד נתונים אמיתי ובדיקות אוטומטיות. עדיין אין Frontend.
> ראו [`docs/architecture.md`](./docs/architecture.md) לתכנון המלא.

## מחסנית טכנולוגית
React + TypeScript (Frontend, טרם נבנה) · Node.js + TypeScript / NestJS 11 (Backend) ·
PostgreSQL + Prisma (מסד נתונים) · JWT + RBAC בצד שרת (אימות והרשאות).

## הוראות התקנה והרצה (Backend)
דרישות מקדימות: Node.js 22+, PostgreSQL 16 (מותקן מקומית או ב-Docker).

```bash
cd backend
npm install
cp .env.example .env      # ומילוי DATABASE_URL ו-JWT_ACCESS_SECRET אמיתיים מקומית
npm run prisma:migrate    # יוצר את הטבלאות במסד הנתונים
npm run prisma:seed       # יוצר ארגון, סניף ומשתמש בעלים לדוגמה (נתוני דמו בלבד)
npm run start:dev         # מריץ את השרת על http://localhost:3000
```

בדיקת תקינות מהירה: `curl http://localhost:3000/health` אמור להחזיר `{"status":"ok"}`.
פרטי ההתחברות של משתמש הבעלים לדוגמה מודפסים בסוף הרצת ה-Seed (לא נתוני אמת).

## משתני סביבה
רשימת שמות משתני הסביבה הנדרשים נמצאת בקובץ [`.env.example`](./.env.example).

**הקובץ הזה לא מכיל ואסור שיכיל ערכים אמיתיים** (סיסמאות, מפתחות, טוקנים). יש להעתיק אותו
לקובץ `.env` מקומי (שלא מועלה ל-Git) ולמלא בו ערכים אמיתיים, ובסביבת הפרסום להשתמש
במנגנון ה-Secrets של ספק האירוח.

## מבנה הפרויקט
```
.
├── README.md                          תיעוד ראשי (קובץ זה)
├── CLAUDE.md                          כללי עבודה עבור Claude Code
├── CONTRIBUTING.md                    תהליך עבודה לתורמים
├── .env.example                       שמות משתני סביבה (ללא ערכים)
├── .gitignore
├── docs/                              מסמכי ארכיטקטורה, ERD, הרשאות, API ועיצוב
├── backend/                           שרת NestJS + Prisma (API, הרשאות, יומן ביקורת)
│   ├── prisma/schema.prisma           סכמת מסד הנתונים ו-Migrations
│   └── src/                           קוד המקור, מודול לכל תחום (auth, users, branches...)
└── .github/
    ├── workflows/backend-ci.yml       בדיקות אוטומטיות ל-Backend על כל PR
    ├── pull_request_template.md       תבנית ל-Pull Request
    └── ISSUE_TEMPLATE/                תבניות לפתיחת Issues
```
תיקיית `frontend/` תתווסף במודול הבא. מבנה זה מתעדכן עם כל מודול חדש.

## בדיקות ופרסום
- כל PR שנוגע ב-`backend/` מריץ אוטומטית Lint, בדיקת טיפוסים, Migrations ובדיקות יחידה
  מול מסד PostgreSQL אמיתי (ראו `.github/workflows/backend-ci.yml`) — חובה שיעברו לפני מיזוג.
- להרצה מקומית של הבדיקות: `cd backend && npm test`.
- אין לפרסם לסביבת ייצור לפני הרצת בדיקת אבטחה (ראו כללי אבטחה ב-`CLAUDE.md`).
- הוראות פרסום לסביבת ייצור יתווספו לאחר בחירת ספק האירוח.

## איך תורמים
ראו [`CONTRIBUTING.md`](./CONTRIBUTING.md) לתהליך העבודה המלא: ענפים, Commit, Pull Request
וסקירה, כולל טיפול בהתנגשויות.
