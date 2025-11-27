import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { visualizer } from "rollup-plugin-visualizer";
import copy from 'rollup-plugin-copy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }: any) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      'process.env': JSON.stringify(env)
    },
    build: {
      rollupOptions: {
        plugins: [
          copy({
            targets: [
              { src: 'public/_routes.json', dest: 'dist' }
            ]
          })
        ]
      }
    },
    plugins: [
      react(),
      visualizer({ open: true }) // 自动开启分析页面
    ],
  }
})