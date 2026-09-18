import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Hebrew display names for DTO field names used across the app. Source code
 * keeps English identifiers (per CLAUDE.md); this map is the one place that
 * translates them for the friendly, non-technical validation messages users
 * actually see (per docs/design-system.md: no technical text in errors).
 */
const FIELD_LABELS_HE: Record<string, string> = {
  email: 'אימייל',
  password: 'סיסמה',
  branchId: 'סניף',
  licensePlate: 'מספר רישוי',
  vin: 'מספר שלדה (VIN)',
  manufacturer: 'יצרן',
  model: 'דגם',
  year: 'שנת ייצור',
  mileageKm: 'קילומטראז׳',
  color: 'צבע',
  bodyType: 'סוג מרכב',
  gearbox: 'תיבת הילוכים',
  fuelType: 'סוג דלק',
  purchasePrice: 'מחיר רכישה',
  status: 'סטטוס',
  version: 'גרסת רשומה',
  fullName: 'שם מלא',
  phone: 'טלפון',
  city: 'עיר',
  marketingConsent: 'הסכמה לשיווק',
  customerId: 'לקוח',
  source: 'מקור הפנייה',
  ownerUserId: 'איש מכירות אחראי',
  preferences: 'העדפות',
  nextActionDate: 'תאריך פעולה הבאה',
  lossReason: 'סיבת אובדן',
  entityType: 'סוג ישות מקושרת',
  entityId: 'ישות מקושרת',
  type: 'סוג',
  priority: 'עדיפות',
  dueAt: 'תאריך יעד',
  notes: 'הערות',
  quoteId: 'הצעת מחיר',
  amount: 'סכום',
  method: 'אמצעי תשלום',
  reference: 'אסמכתא',
  vehicleId: 'רכב',
  price: 'מחיר',
  discount: 'הנחה',
  validUntil: 'בתוקף עד',
  name: 'שם',
  address: 'כתובת',
};

function labelFor(property: string): string {
  return FIELD_LABELS_HE[property] ?? property;
}

const CONSTRAINT_MESSAGES_HE: Record<string, (label: string) => string> = {
  isNotEmpty: (label) => `יש למלא ${label}.`,
  isDefined: (label) => `יש למלא ${label}.`,
  isString: (label) => `${label} חייב להיות טקסט.`,
  minLength: (label) => `${label} קצר מדי.`,
  maxLength: (label) => `${label} ארוך מדי.`,
  isEmail: () => `כתובת האימייל אינה תקינה.`,
  isInt: (label) => `${label} חייב להיות מספר שלם.`,
  isPositive: (label) => `${label} חייב להיות גדול מאפס.`,
  min: (label) => `${label} קטן מהמותר.`,
  max: (label) => `${label} גדול מהמותר.`,
  isEnum: (label) => `${label} אינו ערך תקין.`,
  isIn: (label) => `${label} אינו ערך תקין.`,
  isDateString: (label) => `${label} אינו תאריך תקין.`,
  isBoolean: (label) => `${label} חייב להיות כן/לא.`,
  isObject: (label) => `${label} אינו תקין.`,
  isNumber: (label) => `${label} חייב להיות מספר.`,
  whitelistValidation: () => `נשלח שדה לא מוכר לשרת.`,
};

function translateOne(error: ValidationError): string[] {
  const label = labelFor(error.property);
  const ownMessages = Object.keys(error.constraints ?? {}).map((constraintKey) => {
    const translate = CONSTRAINT_MESSAGES_HE[constraintKey];
    return translate ? translate(label) : `${label} אינו תקין.`;
  });
  const childMessages = (error.children ?? []).flatMap((child) => translateOne(child));
  return [...ownMessages, ...childMessages];
}

export function translateValidationErrors(errors: ValidationError[]): string[] {
  const messages = errors.flatMap((error) => translateOne(error));
  return messages.length > 0 ? messages : ['הנתונים שנשלחו אינם תקינים.'];
}

export function hebrewValidationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException(translateValidationErrors(errors));
}
