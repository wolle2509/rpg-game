import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: /rpg-game/,  // WICHTIG: Dein Repo-Name!
  plugins: [react()],
})
