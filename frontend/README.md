# Frontend — מערכת ניהול מגרש רכבים

React + TypeScript + Vite, בעברית ו-RTL מלא, לפי `../docs/design-system.md`.

## הרצה מקומית

```bash
npm install
cp .env.example .env   # ברירת המחדל מצביעה ל-Backend על http://localhost:3000
npm run dev
```

ה-Backend (`../backend`) חייב לרוץ במקביל — ראו `../backend/README.md`.

## סקריפטים

- `npm run dev` — שרת פיתוח עם Hot Reload.
- `npm run build` — בדיקת טיפוסים (`tsc -b`) ואז Build לייצור לתוך `dist/`.
- `npm run lint` — Oxlint.
- `npm run preview` — הרצת ה-Build המקומי.

## מבנה

- `src/lib/api.ts` — עטיפת `fetch` ל-Backend: מצרפת Token, מתרגמת שגיאות שרת להודעה ידידותית.
- `src/lib/auth.tsx` — Context להתחברות/ניתוק ולבדיקת הרשאות (`hasRole`) בצד הלקוח (תצוגה
  בלבד — כל בדיקת הרשאה אמיתית נאכפת בשרת).
- `src/lib/labels.ts` — מילון התרגום העברי היחיד לכל ה-Enum-ים והסטטוסים בממשק.
- `src/components/` — רכיבי יסוד גנריים (`DataTable`, `StatusBadge`, `Modal`, מצבי טעינה/שגיאה/ריק).
- `src/pages/` — מסך לכל פריט בניווט הראשי: דף הבית, רכבים, לקוחות, משימות, עסקאות, מסמכים.
