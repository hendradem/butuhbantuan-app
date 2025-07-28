// // packages/vitest/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import * as path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './vitest.setup.ts',
        include: [
            '**/test/**/*.test.{ts,tsx}',
            // '**/__test__/**/*.test.{ts,tsx}',
        ],
        exclude: ['node_modules', 'dist'],
        deps: {
            inline: [/@/],
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            all: true,
            // Gunakan glob pattern yang lebih explicit
            include: [
                '../../apps/next-app/app/components/**/*.{ts,tsx}',
                '../../apps/next-app/app/pages/**/*.{ts,tsx}',
                '../../apps/next-app/app/utils/**/*.{ts,tsx}',
                '../../apps/next-app/app/*.{ts,tsx}',
                // Tambahkan path spesifik lainnya sesuai struktur
            ],
            exclude: [
                '**/__test__/**',
                '**/test/**',
                '**/*.test.*',
                '**/*.config.*',
                '**/layout.tsx',
                '**/globals.css',
                'node_modules/**',
            ],
            reportsDirectory: './coverage',
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../../apps/next-app/app'),
            app: path.resolve(__dirname, '../../apps/next-app/app'),
        },
    },
})



// packages/test/vitest.config.mjs
// import { defineConfig } from 'vitest/config'
// import react from '@vitejs/plugin-react'
// import { resolve } from 'path'
// import { fileURLToPath } from 'url'

// const __dirname = fileURLToPath(new URL('.', import.meta.url))

// export default defineConfig({
//     plugins: [react()],
//     test: {
//         globals: true,
//         environment: 'jsdom',
//         setupFiles: './vitest.setup.ts',
//         include: [
//             '**/test/**/*.test.{ts,tsx}',
//         ],
//         exclude: ['node_modules', 'dist'],
//         deps: {
//             inline: [/@/],
//         },
//         coverage: {
//             provider: 'istanbul',
//             reporter: ['text', 'json', 'html'],
//             all: true,
//             include: [
//                 resolve(__dirname, '../../apps/next-app/app/**/*.{ts,tsx}')
//             ],
//             exclude: [
//                 '**/test/**',
//                 '**/*.test.*',
//                 '**/*.config.*',
//                 '**/layout.tsx',
//                 '**/globals.css',
//             ],
//             reportsDirectory: './coverage',
//             allowExternal: true,
//         },
//     },
//     resolve: {
//         alias: {
//             '@': resolve(__dirname, '../../apps/next-app/app'),
//         },
//     },
// })