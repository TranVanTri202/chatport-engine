import { BadRequestException, Injectable } from '@nestjs/common';

const VAR_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

@Injectable()
export class PromptRendererService {
  /**
   * Replace `{{var}}` placeholders. Missing vars resolve to '' unless the key
   * is explicitly listed in `required`, in which case we throw.
   */
  render(
    template: string,
    vars: Record<string, string>,
    required: string[] = [],
  ): string {
    const missing = required.filter((k) => !(k in vars));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required prompt vars: ${missing.join(', ')}`,
      );
    }
    return template.replace(VAR_PATTERN, (_match, name: string) => {
      return vars[name] ?? '';
    });
  }
}
