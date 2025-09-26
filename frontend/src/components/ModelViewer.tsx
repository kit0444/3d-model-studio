import React from 'react'
import { Download } from 'lucide-react'
import ThreeModelViewer from './ThreeModelViewer'

interface GeneratedModel {
  id: string
  inputContent: string
  inputType: 'text' | 'image'
  createdAt: string
  modelUrl?: string
  previewUrl?: string
  qualityScore?: number
}

interface ModelViewerProps {
  model: GeneratedModel | null
  isLoading: boolean
}

const ModelViewer: React.FC<ModelViewerProps> = ({ model, isLoading }) => {
  const handleDownload = () => {
    if (model?.modelUrl) {
      const link = document.createElement('a')
      link.href = `http://localhost:8000${model.modelUrl}`
      link.download = `model_${model.id}.obj`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-full">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-300">正在生成3D模型...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 h-full flex flex-col p-6">{/* 重新添加p-6内边距 */}
      {/* 头部控制栏 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">3D模型预览</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleDownload}
            disabled={!model?.modelUrl}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="下载模型"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* 3D模型展示区域 */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
        <ThreeModelViewer 
          modelUrl={model?.modelUrl ? `http://localhost:8000${model.modelUrl}` : undefined}
          className="w-full h-full"
        />
      </div>

      {/* 模型信息 */}
      {model && (
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">输入类型:</span>
              <span className="ml-2 text-white">{model.inputType === 'text' ? '文本' : '图片'}</span>
            </div>
            <div>
              <span className="text-gray-400">质量评分:</span>
              <span className="ml-2 text-white">{model.qualityScore ? `${(model.qualityScore * 100).toFixed(0)}%` : 'N/A'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">输入内容:</span>
              <p className="mt-1 text-white text-xs break-words">{model.inputContent}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelViewer