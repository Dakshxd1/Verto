import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800, // raise limit while lazy loading takes effect
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor — always needed
          'vendor-react':    ['react', 'react-dom'],
          'vendor-motion':   ['framer-motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-xlsx':     ['xlsx'],
          'vendor-charts':   ['recharts'],
          // Page-level chunks
          'chunk-pl':        [
            './src/components/ProfitCenterPL.jsx',
            './src/components/ClientPL.jsx',
          ],
          'chunk-cost':      ['./src/components/InternalCost.jsx'],
          'chunk-bank':      ['./src/components/BankReco.jsx'],
          'chunk-modals':    [
            './src/components/AddExpenseDetailsManModal.jsx',
            './src/components/AddCNBadDebtModal.jsx',
            './src/components/AddInvoiceModal.jsx',
            './src/components/AddPaymentReceivedModal.jsx',
            './src/components/AddInternalTeamModal.jsx',
            './src/components/AddStatutoryPayoutModal.jsx',
            './src/components/AddBounceBackModal.jsx',
          ],
          'chunk-advance':   [
            './src/components/advance/Advancecreditcardlockerpage.jsx',
            './src/components/advance/Clientadvancetracker.jsx',
            './src/components/advance/Creditcardtracker.jsx',
            './src/components/advance/Employeeadvancetracker.jsx',
          ],
        },
      },
    },
  },
})