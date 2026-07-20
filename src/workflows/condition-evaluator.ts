export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than';

export interface WorkflowCondition {
  field: string; // soporta dot-notation simple, ej: "contact.source"
  operator: ConditionOperator;
  value: unknown;
}

function getField(payload: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      payload,
    );
}

export function evaluateConditions(
  conditions: WorkflowCondition[] | undefined,
  payload: Record<string, unknown>,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true; // sin condiciones = siempre matchea (workflow "para todos")
  }

  return conditions.every((condition) => {
    const actual = getField(payload, condition.field);

    switch (condition.operator) {
      case 'equals':
        return actual === condition.value;
      case 'not_equals':
        return actual !== condition.value;
      case 'contains':
        if (Array.isArray(actual)) return actual.includes(condition.value);
        if (typeof actual === 'string' && typeof condition.value === 'string') {
          return actual.includes(condition.value);
        }
        return false;
      case 'greater_than':
        return typeof actual === 'number' && actual > (condition.value as number);
      case 'less_than':
        return typeof actual === 'number' && actual < (condition.value as number);
      default:
        return false;
    }
  });
}
