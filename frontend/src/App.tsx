import { useState } from 'react'
import { Upload, Wand2, History, BarChart3 } from 'lucide-react'
import InputPanel from './components/InputPanel'
import ModelViewer from './components/ModelViewer'
import StatsPanel from './components/StatsPanel'
import HistoryPanel from './components/HistoryPanel'

interface GeneratedModel {
  id: string
  inputContent: string
  inputType: 'text' | 'image'
  createdAt: string
  modelUrl?: string
  previewUrl?: string
  qualityScore?: number
}

function App() {
  const [activeTab, setActiveTab] = useState('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentModel, setCurrentModel] = useState<string | undefined>()
  const [models, setModels] = useState<GeneratedModel[]>([
    {
      id: '1',
      inputContent: '一只可爱的小猫咪，坐在草地上',
      inputType: 'text',
      createdAt: '2024-01-15T14:30:00Z',
      modelUrl: '/models/cat.obj',
      previewUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop',
      qualityScore: 0.92
    },
    {
      id: '2',
      inputContent: '现代风格的办公椅',
      inputType: 'text',
      createdAt: '2024-01-15T13:15:00Z',
      modelUrl: '/models/chair.obj',
      previewUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop',
      qualityScore: 0.88
    },
    {
      id: '3',
      inputContent: '科幻风格的宇宙飞船',
      inputType: 'image',
      createdAt: '2024-01-15T12:00:00Z',
      modelUrl: '/models/spaceship.obj',
      previewUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=200&h=200&fit=crop',
      qualityScore: 0.95
    }
  ])

  const handleModelGenerated = (model: GeneratedModel) => {
    setModels(prev => [model, ...prev])
    setCurrentModel(model.modelUrl)
  }

  const handleModelSelect = (model: GeneratedModel) => {
    setCurrentModel(model.modelUrl)
    setActiveTab('generate')
  }

  return (
    <div className="min-h-screen bg-gray-800">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI 3D Generator</h1>
                <p className="text-sm text-gray-400">智能3D模型生成平台</p>
              </div>
            </div>
            
            <nav className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('generate')}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-all duration-200 ${
                  activeTab === 'generate'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Wand2 size={18} />
                <span>生成</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <History size={18} />
                <span>历史</span>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-all duration-200 ${
                  activeTab === 'stats'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <BarChart3 size={18} />
                <span>统计</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
            {/* Input Panel */}
            <div className="space-y-6">
              <InputPanel 
                onModelGenerated={handleModelGenerated} 
                isGenerating={isGenerating} 
                setIsGenerating={setIsGenerating} 
              />
            </div>
            
            {/* Model Viewer */}
            <div className="h-full">
              <ModelViewer modelUrl={currentModel} isLoading={isGenerating} />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryPanel models={models} onModelSelect={handleModelSelect} />
        )}

        {activeTab === 'stats' && (
          <StatsPanel models={models} />
        )}
      </main>
    </div>
  )
}

export default App