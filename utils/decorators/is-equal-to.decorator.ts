import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export const IsEqualTo =
  (property: string, options?: ValidationOptions) =>
  (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isEqualTo',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: { message: `${propertyName} must match ${property}`, ...options },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const related = (args.object as Record<string, unknown>)[args.constraints[0]];
          return value === related;
        },
      },
    });
  };
