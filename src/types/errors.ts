/**
 * errors.ts
 *
 * Custom error classes for the Customer Intelligence Dashboard.
 * DashboardError wraps application-level failures; WidgetError isolates
 * individual widget failures with widget name metadata for targeted recovery.
 */

export class DashboardError extends Error {
  context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DashboardError';
    this.context = context;
    // Ensure correct prototype chain for instanceof checks in transpiled code
    Object.setPrototypeOf(this, DashboardError.prototype);
  }
}

export class WidgetError extends Error {
  widgetName: string;
  context: Record<string, unknown>;

  constructor(
    message: string,
    widgetName: string,
    context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'WidgetError';
    this.widgetName = widgetName;
    this.context = context;
    Object.setPrototypeOf(this, WidgetError.prototype);
  }
}
