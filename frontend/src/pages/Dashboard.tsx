import { Link } from 'react-router-dom'
import { Zap, Activity, Gauge, Brain, Settings, ArrowRight, Sparkles } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

const quickActions = [
  { 
    to: '/test/connectivity', 
    icon: Activity, 
    title: 'Connectivity Test', 
    desc: 'Test API connections',
    color: 'cyan'
  },
  { 
    to: '/test/performance', 
    icon: Gauge, 
    title: 'Performance Test', 
    desc: 'Benchmark response times',
    color: 'purple'
  },
  { 
    to: '/test/context', 
    icon: Brain, 
    title: 'Context Test', 
    desc: 'Test context handling',
    color: 'pink'
  },
  { 
    to: '/config', 
    icon: Settings, 
    title: 'Configuration', 
    desc: 'Manage API keys',
    color: 'blue'
  },
]

const steps = [
  { num: 1, title: 'Configure your providers', desc: 'Add your API keys in the Configuration page' },
  { num: 2, title: 'Run a connectivity test', desc: 'Verify your API keys and model availability' },
  { num: 3, title: 'Run performance tests', desc: 'Benchmark response times and token speeds' },
]

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white font-['Orbitron'] mb-3">
          <span className="text-[#00f0ff] glow-text-cyan">LLM</span> Tester
        </h1>
        <p className="text-gray-400 text-lg">Test and benchmark LLM APIs with precision</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          const colorMap: Record<string, string> = {
            cyan: 'from-[#00f0ff]/20 to-[#00f0ff]/5 border-[#00f0ff]/30 hover:border-[#00f0ff] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]',
            purple: 'from-[#bf00ff]/20 to-[#bf00ff]/5 border-[#bf00ff]/30 hover:border-[#bf00ff] hover:shadow-[0_0_20px_rgba(191,0,255,0.2)]',
            pink: 'from-[#ff00aa]/20 to-[#ff00aa]/5 border-[#ff00aa]/30 hover:border-[#ff00aa] hover:shadow-[0_0_20px_rgba(255,0,170,0.2)]',
            blue: 'from-[#0066ff]/20 to-[#0066ff]/5 border-[#0066ff]/30 hover:border-[#0066ff] hover:shadow-[0_0_20px_rgba(0,102,255,0.2)]',
          }
          const iconColorMap: Record<string, string> = {
            cyan: 'text-[#00f0ff]',
            purple: 'text-[#bf00ff]',
            pink: 'text-[#ff00aa]',
            blue: 'text-[#0066ff]',
          }
          
          return (
            <Link key={action.to} to={action.to} className="block group">
              <div className={`h-full p-4 rounded-xl bg-gradient-to-br border transition-all duration-300 ${colorMap[action.color]}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-black/30 ${iconColorMap[action.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white font-['Rajdhani']">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.desc}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Getting Started */}
      <Card glow>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-[#00f0ff]" />
          <h2 className="text-xl font-semibold text-white font-['Rajdhani']">Getting Started</h2>
        </div>
        
        <p className="text-gray-400 mb-6">
          Welcome to LLM Tester! This tool helps you test and benchmark LLM APIs with comprehensive metrics and real-time analysis.
        </p>
        
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.num} className="flex items-start gap-4 group">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0ff]/20 to-[#bf00ff]/20 border border-[rgba(0,240,255,0.3)] text-[#00f0ff] text-sm font-bold font-['Orbitron']">
                {step.num}
              </span>
              <div className="flex-1">
                <h4 className="font-medium text-white group-hover:text-[#00f0ff] transition-colors">{step.title}</h4>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 mt-6 border-t border-[rgba(0,240,255,0.1)]">
          <Link to="/config">
            <Button glow>
              <Zap className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          </Link>
        </div>
      </Card>

      {/* Stats Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 text-center">
          <p className="text-3xl font-bold text-[#00f0ff] font-['Orbitron']">0</p>
          <p className="text-gray-500 mt-1">Tests Run</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-3xl font-bold text-[#bf00ff] font-['Orbitron']">0</p>
          <p className="text-gray-500 mt-1">Models Configured</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-3xl font-bold text-[#ff00aa] font-['Orbitron']">0</p>
          <p className="text-gray-500 mt-1">Reports Generated</p>
        </div>
      </div>
    </div>
  )
}