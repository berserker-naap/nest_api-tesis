import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsInternationalPhoneConsistent(
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isInternationalPhoneConsistent',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const dto = args.object as {
            countryCode?: string;
            phone?: string;
          };

          if (
            typeof value !== 'string' ||
            typeof dto.countryCode !== 'string' ||
            typeof dto.phone !== 'string'
          ) {
            return true;
          }

          if (
            !/^\+\d{1,4}$/.test(dto.countryCode) ||
            !/^\d{6,15}$/.test(dto.phone) ||
            !/^\d{8,19}$/.test(value)
          ) {
            return true;
          }

          const expected = `${dto.countryCode.slice(1)}${dto.phone}`;
          return value === expected;
        },
      },
    });
  };
}
