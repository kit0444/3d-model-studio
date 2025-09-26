import { useState } from 'react'
import { Download, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'

interface ModelViewerProps {
  modelUrl?: string
  isLoading?: boolean
}

export default function ModelViewer({ modelUrl, isLoading }: ModelViewerProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)

  const handleRotate = () => {
    setRotation({ x: 0, y: 0 })
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5))
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">3D模型预览</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRotate}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="重置视角"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="缩小"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="放大"
          >
            <ZoomIn size={18} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="下载模型">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* 3D Viewer Area */}
      <div className="flex-1 relative bg-gray-800 rounded-b-xl overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300 text-lg font-medium">正在生成3D模型...</p>
              <p className="text-gray-500 text-sm mt-2">这可能需要几分钟时间</p>
            </div>
          </div>
        ) : modelUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* 3D Model Display Area */}
            <div 
              className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative"
              style={{ transform: `scale(${zoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
            >
              {/* Placeholder 3D Model */}
              <div className="perspective-1000">
                <div className="preserve-3d animate-spin-slow">
                  {/* 立方体框架 */}
                  <div className="relative w-32 h-32">
                    {/* 前面 */}
                    <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-400 translate-z-16"></div>
                    {/* 后面 */}
                    <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-300 translate-z-minus-16"></div>
                    {/* 右面 */}
                    <div className="absolute inset-0 bg-blue-500/15 border-2 border-blue-350 rotate-y-90"></div>
                    {/* 左面 */}
                    <div className="absolute inset-0 bg-blue-500/15 border-2 border-blue-350 rotate-y-minus-90"></div>
                    {/* 上面 */}
                    <div className="absolute inset-0 bg-blue-500/25 border-2 border-blue-450 rotate-x-90"></div>
                    {/* 下面 */}
                    <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-300 rotate-x-minus-90"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <div className="w-12 h-12 border-2 border-gray-600 border-dashed rounded"></div>
              </div>
              <p className="text-gray-400 text-lg">暂无模型</p>
              <p className="text-gray-500 text-sm mt-1">请先生成或选择一个3D模型</p>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        {modelUrl && !isLoading && (
          <div className="absolute top-4 left-4">
            <div className="flex items-center space-x-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm border border-green-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>3D预览就绪</span>
            </div>
          </div>
        )}
      </div>

      {/* Model Info Panel */}
      {modelUrl && !isLoading && (
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">顶点数:</span>
              <span className="font-mono text-white">8,192</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">面数:</span>
              <span className="font-mono text-white">16,384</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">质量评分:</span>
              <span className="text-green-400 font-semibold">85/100</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}