import { useState, useEffect } from 'react'
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
  previewUrl?: string  // 缩略图URL，用于历史记录预览
  qualityScore?: number
  downloadUrls?: { [format: string]: string }
  stage?: 'preview' | 'refined'
  task_id?: string  // 添加task_id字段用于细化
}

function App() {
  const [activeTab, setActiveTab] = useState('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentModel, setCurrentModel] = useState<GeneratedModel | null>(null)
  const [models, setModels] = useState<GeneratedModel[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // 从后端获取历史数据
  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch('/api/history')
      if (response.ok) {
        const data = await response.json()
        // 后端直接返回数组，不是包装在success和models字段中
        if (Array.isArray(data)) {
          setModels(data)
        }
      } else {
        console.error('Failed to load history:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // 组件挂载时加载历史数据
  useEffect(() => {
    loadHistory()
  }, [])

  const handleModelGenerated = (model: GeneratedModel) => {
    setModels(prev => [model, ...prev])
    setCurrentModel(model)
  }

  const handleModelRefined = (refinedModel: GeneratedModel) => {
    // 更新模型列表，替换原有的预览版本
    setModels(prev => prev.map(m => 
      m.id === refinedModel.id ? refinedModel : m
    ))
    setCurrentModel(refinedModel)
  }

  const handleModelSelect = (model: GeneratedModel) => {
    setCurrentModel(model)
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
      <main className="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
        {activeTab === 'generate' && (
          <>
            {/* Left Panel - Input */}
            <div className="w-full lg:w-[30%] lg:min-w-[350px] bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-700 p-4 lg:p-6 overflow-y-auto">
              <InputPanel 
                onModelGenerated={handleModelGenerated} 
                isGenerating={isGenerating} 
                setIsGenerating={setIsGenerating} 
              />
            </div>
            
            {/* Right Panel - Model Viewer */}
            <div className="flex-1 bg-gray-900 border-r border-gray-700 p-4 lg:p-6 overflow-y-auto">
              <ModelViewer 
                model={currentModel} 
                isLoading={isGenerating} 
                onModelRefined={handleModelRefined}
              />
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="w-full p-4 lg:p-6 overflow-y-auto">
            <HistoryPanel 
              models={models} 
              onModelSelect={handleModelSelect}
              isLoading={isLoadingHistory}
              onRefresh={loadHistory}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="w-full p-4 lg:p-6 overflow-y-auto">
            <StatsPanel models={models} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App