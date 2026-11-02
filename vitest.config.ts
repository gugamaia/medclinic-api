import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * RNF07 - cobertura minima de 80% (linhas/branches/funcoes/statements)
 * medida APENAS sobre os arquivos `*.service.ts`, que concentram a
 * regra de negocio. Entidades, DTOs, controllers, filtros e modulos NAO
 * entram no calculo - sao majoritariamente "cola" de framework.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.service.ts'],
      exclude: ['src/**/*.module.ts'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
