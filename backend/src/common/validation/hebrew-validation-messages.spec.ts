import { ValidationError } from 'class-validator';
import {
  hebrewValidationExceptionFactory,
  translateValidationErrors,
} from './hebrew-validation-messages';

function makeError(
  property: string,
  constraints: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError {
  const error = new ValidationError();
  error.property = property;
  error.constraints = constraints;
  error.children = children;
  return error;
}

describe('translateValidationErrors', () => {
  it('translates a known field and constraint into a Hebrew sentence', () => {
    const messages = translateValidationErrors([
      makeError('manufacturer', { isNotEmpty: 'manufacturer should not be empty' }),
    ]);
    expect(messages).toEqual(['יש למלא יצרן.']);
  });

  it('falls back to the raw property name for an unmapped field', () => {
    const messages = translateValidationErrors([
      makeError('someNewField', { isString: 'someNewField must be a string' }),
    ]);
    expect(messages).toEqual(['someNewField חייב להיות טקסט.']);
  });

  it('collects messages from nested (children) validation errors', () => {
    const messages = translateValidationErrors([
      makeError('preferences', {}, [makeError('color', { isString: 'must be a string' })]),
    ]);
    expect(messages).toEqual(['צבע חייב להיות טקסט.']);
  });

  it('never returns an empty array, even for an error with no constraints', () => {
    const messages = translateValidationErrors([makeError('email', {})]);
    expect(messages).toEqual(['הנתונים שנשלחו אינם תקינים.']);
  });
});

describe('hebrewValidationExceptionFactory', () => {
  it('wraps the translated messages in a BadRequestException', () => {
    const exception = hebrewValidationExceptionFactory([
      makeError('phone', { minLength: 'phone is too short' }),
    ]);
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toMatchObject({
      message: ['טלפון קצר מדי.'],
    });
  });
});
