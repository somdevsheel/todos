/* eslint-disable @typescript-eslint/no-explicit-any */
/** Loose "every method is a jest mock" type for hand-rolled test doubles. Test-only. */
export type DeepMockProxy<T> = { [K in keyof T]: any };
