import React, { useState } from 'react'
import { Download, ChevronDown, Wand2, Loader2 } from 'lucide-react'
import ThreeModelViewer from './ThreeModelViewer'

interface GeneratedModel {
  id: string
  inputContent?: string
  input_content?: string  // 兼容后端字段名
  inputType?: 'text' | 'image'
  input_type?: 'text' | 'image'  // 兼容后端字段名
  createdAt?: string
  created_at?: string  // 兼容后端字段名
  modelUrl?: string
  model_url?: string  // 兼容后端字段名
  previewUrl?: string
  preview_url?: string  // 兼容后端字段名
  qualityScore?: number
  quality_score?: number  // 兼容后端字段名
  downloadUrls?: { [format: string]: string }
  download_urls?: { [format: string]: string }  // 兼容后端字段名
  stage?: 'preview' | 'refined'
  task_id?: string  // 添加task_id字段用于细化
}

interface ModelViewerProps {
  model: GeneratedModel | null
  isLoading: boolean
  onModelRefined?: (model: GeneratedModel) => void  // 添加细化回调
}

const ModelViewer: React.FC<ModelViewerProps> = ({ model, isLoading, onModelRefined }) => {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [isRefining, setIsRefining] = useState(false)

  const handleRefine = async () => {
    if (!model?.task_id || isRefining || !onModelRefined) return

    setIsRefining(true)

    try {
      const response = await fetch('/api/generate/text/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: model.task_id
        }),
      })

      if (!response.ok) {
        throw new Error('精细化失败')
      }

      const result = await response.json()
      
      if (result.success) {
        const refinedModel = {
          id: result.model_id,
          modelUrl: result.model_url,
          previewUrl: result.thumbnail_url || result.preview_url,
          downloadUrls: result.download_urls,
          qualityScore: result.quality_score,
          inputType: model.inputType || model.input_type,
          inputContent: model.inputContent || model.input_content,
          createdAt: new Date().toISOString(),
          stage: 'refined' as const
        }
        
        onModelRefined(refinedModel)
      } else {
        throw new Error(result.message || '精细化失败')
      }
    } catch (error) {
      console.error('精细化错误:', error)
      alert(error instanceof Error ? error.message : '精细化失败，请重试')
    } finally {
      setIsRefining(false)
    }
  }

  const handleDownload = (format?: string, url?: string) => {
    if (!model) return
    
    let downloadUrl: string | undefined = url
    let filename = `model_${model.id}`
    
    if (format && url) {
      // 使用指定格式和URL
      downloadUrl = url
      filename = `${filename}.${format.toLowerCase()}`
    } else if (model?.modelUrl || model?.model_url) {
      // 使用默认模型URL (GLB格式用于显示)
      downloadUrl = model.modelUrl || model.model_url
      filename = `${filename}.glb`
    } else {
      return
    }

    if (!downloadUrl) {
      return
    }

    // 处理URL，确保是完整的HTTP URL
    let finalUrl = downloadUrl
    if (!downloadUrl.startsWith('http')) {
      finalUrl = `http://localhost:8000${downloadUrl}`
    }

    const link = document.createElement('a')
    link.href = finalUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowDownloadMenu(false)
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
    <div className="bg-gray-800 rounded-xl border border-gray-700 h-full flex flex-col p-4 lg:p-6">
      {/* 头部控制栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-white">3D模型预览</h3>
          {model?.stage && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              model.stage === 'refined' 
                ? 'bg-green-900/30 text-green-400 border border-green-600' 
                : 'bg-yellow-900/30 text-yellow-400 border border-yellow-600'
            }`}>
              {model.stage === 'refined' ? '精细化版本' : '预览版本'}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* 细化按钮 - 只在预览版本显示 */}
          {model?.stage === 'preview' && model?.task_id && onModelRefined && (
            <button
              onClick={handleRefine}
              disabled={isRefining}
              className={`flex items-center space-x-1 p-2 rounded-lg transition-colors ${
                isRefining
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
              title="精细化处理"
            >
              {isRefining ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span className="text-white text-sm hidden sm:inline">精细化中</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-white" />
                  <span className="text-white text-sm hidden sm:inline">精细化</span>
                </>
              )}
            </button>
          )}
          
          {/* 下载按钮 */}
          <div className="relative">
            {model?.downloadUrls && Object.keys(model.downloadUrls).length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center space-x-1 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  title="下载模型"
                >
                  <Download className="w-4 h-4 text-white" />
                  <ChevronDown className="w-3 h-3 text-white" />
                </button>
                
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-600">
                        选择下载格式
                      </div>
                      {Object.entries(model.downloadUrls).map(([format, url]) => (
                        <button
                          key={format}
                          onClick={() => handleDownload(format, url)}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-600 transition-colors"
                        >
                          {format.toUpperCase()} 格式
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleDownload()}
                disabled={!model?.modelUrl}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                title="下载模型"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3D模型展示区域 */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
        <ThreeModelViewer 
          modelUrl={(() => {
            const url = model?.modelUrl || model?.model_url
            if (!url) return undefined
            return url.startsWith('http') ? url : `http://localhost:8000${url}`
          })()}
          className="w-full h-full"
        />
      </div>

      {/* 模型信息 */}
      {model && (
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">输入类型:</span>
              <span className="ml-2 text-white">{(model?.inputType || model?.input_type) === 'text' ? '文本' : '图片'}</span>
            </div>
            <div>
              <span className="text-gray-400">质量评分:</span>
              <span className="ml-2 text-white">
                {(() => {
                  const score = model?.qualityScore || model?.quality_score
                  return score ? `${(score * 100).toFixed(0)}%` : 'N/A'
                })()}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">输入内容:</span>
              <p className="mt-1 text-white text-xs break-words">{model?.inputContent || model?.input_content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelViewer