import type { Extension } from "@tiptap/core";

/** Plugin SDK preview — documents ADR-0002 widget registration contract */
export interface WidgetRegistration {
  id: string;
  name: string;
  dataAttribute: string;
  extension: Extension;
  exportTransform?: (html: string) => string;
}

const registry = new Map<string, WidgetRegistration>();

export function registerWidget(registration: WidgetRegistration): WidgetRegistration {
  registry.set(registration.id, registration);
  return registration;
}

export function getRegisteredWidgets(): WidgetRegistration[] {
  return [...registry.values()];
}

export function getWidgetById(id: string): WidgetRegistration | undefined {
  return registry.get(id);
}
