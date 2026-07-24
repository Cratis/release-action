import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['Source/**/for_*/**/*.ts'],
        exclude: ['**/given/**'],
        setupFiles: ['./vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            include: ['Source/**/*.ts'],
            // Composition roots (`main`/`post`) are wiring, exercised by the end-to-end smoke test rather than
            // unit specs; specs and their helpers are not themselves under test.
            exclude: ['Source/for_*/**', 'Source/specs/**', 'Source/main.ts', 'Source/post.ts', '**/*.d.ts'],
            reporter: ['text', 'text-summary'],
            thresholds: {
                statements: 88,
                branches: 82,
                functions: 88,
                lines: 88
            }
        }
    }
});
