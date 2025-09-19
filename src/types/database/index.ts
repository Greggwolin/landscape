// Re-export all database types from their respective modules

export * from './base';
export * from './glossary';
export * from './projects';
export * from './landuse';
export * from './budget';
export * from './planning';

// Keep the original database.ts export for backward compatibility
export * from '../database';