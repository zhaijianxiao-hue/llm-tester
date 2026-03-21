import { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Zap,
  Activity,
  Gauge,
  Brain,
  Settings,
  FileText,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  to: string
  icon: ReactNode
  label: string
}

const navItems: NavItem[] = [
  { to: '/', icon: <Zap className="w-5 h-5" />, label: 'Dashboard' },
  { to: '/chat', icon: <MessageSquare className="w-5 h-5" />, label: 'Chat' },
  { to: '/test/connectivity', icon: <Activity className="w-5 h-5" />, label: 'Connectivity' },
  { to: '/test/performance', icon: <Gauge className="w-5 h-5" />, label: 'Performance' },
  { to: '/test/context', icon: <Brain className="w-5 h-5" />, label: 'Context' },
  { to: '/config', icon: <Settings className="w-5 h-5" />, label: 'Configuration' },
  { to: '/reports', icon: <FileText className="w-5 h-5" />, label: 'Reports' },
]

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f] cyber-grid-bg">
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg glass-card border border-[rgba(0,240,255,0.2)] text-[#00f0ff]"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 glass-card border-r border-[rgba(0,240,255,0.1)]`}
      >
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#00f0ff]/20 to-[#bf00ff]/20 border border-[rgba(0,240,255,0.3)]">
              <Zap className="w-6 h-6 text-[#00f0ff]" />
            </div>
            <div>
              <span className="text-lg font-bold text-white font-['Orbitron']">LLM</span>
              <span className="text-lg font-light text-[#00f0ff] font-['Orbitron']"> Tester</span>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#00f0ff]/10 to-[#bf00ff]/10 text-[#00f0ff] border border-[rgba(0,240,255,0.3)] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="absolute bottom-4 left-3 right-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-[#00f0ff]/5 to-[#bf00ff]/5 border border-[rgba(0,240,255,0.1)]">
              <p className="text-xs text-gray-500 font-['JetBrains_Mono']">v0.1.0</p>
              <p className="text-xs text-gray-600 mt-1">Powered by Neural Networks</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="p-4 lg:p-8 min-h-screen">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}