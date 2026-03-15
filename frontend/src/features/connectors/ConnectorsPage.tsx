import { Plug } from 'lucide-react'

const ConnectorsPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
      <Plug className="h-8 w-8 text-slate-400" />
    </div>
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Connectors</h1>
      <p className="mt-1 text-sm text-slate-500">Coming soon — connect WhatsApp, Telegram, and more.</p>
    </div>
  </div>
)

export default ConnectorsPage
