import { BadRequestException, PipeTransform } from "@nestjs/common";
import { z } from "zod";

// Validates a request body/query/param against a Zod schema and returns the
// parsed (typed, coerced) value. Usage: @Body(new ZodValidationPipe(schema)).
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: z.flattenError(result.error),
      });
    }
    return result.data;
  }
}
