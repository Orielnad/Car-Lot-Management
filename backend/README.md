# Backend

שרת ה-API של המערכת (NestJS + Prisma + PostgreSQL). לתכנון המלא ראו `../docs/`.

## פקודות עיקריות
```bash
npm install              # התקנת תלויות
npm run start:dev        # הרצת שרת פיתוח עם Hot Reload
npm run build            # בנייה ל-dist/
npm test                 # בדיקות יחידה
npm run lint             # בדיקת איכות קוד

npm run prisma:migrate   # יצירה/הרצה של Migration חדש מול מסד הפיתוח
npm run prisma:seed      # יצירת נתוני דמו (ארגון, סניף, משתמש בעלים)
```

## משתני סביבה
ראו [`.env.example`](./.env.example). יש להעתיק ל-`.env` (לא מועלה ל-Git) ולמלא ערכים
אמיתיים מקומית. `JWT_ACCESS_SECRET` חייב ערך אמיתי — בלעדיו השרת לא יעלה.

## בדיקות
הבדיקות רצות מול Mock-ים ל-Prisma (לא מול מסד נתונים אמיתי) — מהירות ולא דורשות סביבה
מיוחדת. ה-CI (`../.github/workflows/backend-ci.yml`) גם מריץ Migrations אמיתיים מול
PostgreSQL זמני, כדי לוודא שהסכמה עצמה תקינה.
