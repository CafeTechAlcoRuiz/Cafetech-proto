declare module 'uuid' {
  /**
   * Minimal type declarations used in the project.
   * This silences TS errors during build on the cloud where devDependencies
   * (like @types/uuid) may not be installed.
   */
  export function v1(): string;
  export function v3(name: string, namespace: string): string;
  export function v4(): string;
  export function v5(name: string, namespace: string): string;
}
