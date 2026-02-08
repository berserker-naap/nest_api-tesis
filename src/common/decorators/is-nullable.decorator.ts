import { ValidateIf, ValidationOptions } from 'class-validator';

/**
 * Decorador que permite valores null.
 * Solo ejecuta las validaciones siguientes si el valor NO es null.
 * 
 * @example
 * @IsNullable()
 * @IsString()
 * valor!: string | null;
 */
export function IsNullable(validationOptions?: ValidationOptions) {
  return ValidateIf((obj, value) => value !== null, validationOptions);
}
