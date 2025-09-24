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
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700">
      {/* 3D Scene Container */}
      <div className="w-full h-full flex items-center justify-center perspective-1000 p-8">
        <div 
          className="relative preserve-3d transition-transform duration-300"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})`,
          }}
        >
          {/* 3D Cube Demo */}
          <div className="relative w-32 h-32 preserve-3d animate-spin-slow">
            {/* Front face */}
            <div className="absolute w-32 h-32 bg-blue-500/80 border border-blue-300 flex items-center justify-center text-white font-bold translate-z-16">
              <div className="text-center">
                <div className="text-2xl">🎯</div>
                <div className="text-xs">Front</div>
              </div>
            </div>
            
            {/* Back face */}
            <div className="absolute w-32 h-32 bg-purple-500/80 border border-purple-300 flex items-center justify-center text-white font-bold translate-z-minus-16 rotate-y-180">
              <div className="text-center">
                <div className="text-2xl">🔮</div>
                <div className="text-xs">Back</div>
              </div>
            </div>
            
            {/* Right face */}
            <div className="absolute w-32 h-32 bg-green-500/80 border border-green-300 flex items-center justify-center text-white font-bold rotate-y-90">
              <div className="text-center">
                <div className="text-2xl">🌟</div>
                <div className="text-xs">Right</div>
              </div>
            </div>
            
            {/* Left face */}
            <div className="absolute w-32 h-32 bg-red-500/80 border border-red-300 flex items-center justify-center text-white font-bold rotate-y-minus-90">
              <div className="text-center">
                <div className="text-2xl">⚡</div>
                <div className="text-xs">Left</div>
              </div>
            </div>
            
            {/* Top face */}
            <div className="absolute w-32 h-32 bg-yellow-500/80 border border-yellow-300 flex items-center justify-center text-white font-bold rotate-x-90">
              <div className="text-center">
                <div className="text-2xl">☀️</div>
                <div className="text-xs">Top</div>
              </div>
            </div>
            
            {/* Bottom face */}
            <div className="absolute w-32 h-32 bg-indigo-500/80 border border-indigo-300 flex items-center justify-center text-white font-bold rotate-x-minus-90">
              <div className="text-center">
                <div className="text-2xl">🌙</div>
                <div className="text-xs">Bottom</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg font-semibold">生成3D模型中...</p>
            <p className="text-sm text-gray-300 mt-2">预计需要30-60秒</p>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
        <div className="flex space-x-2">
          <button 
            onClick={handleRotate}
            className="bg-white/10 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={handleZoomIn}
            className="bg-white/10 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
          >
            <ZoomIn size={20} />
          </button>
          <button 
            onClick={handleZoomOut}
            className="bg-white/10 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
          >
            <ZoomOut size={20} />
          </button>
        </div>
        
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg">
          <Download size={20} />
          <span>下载模型</span>
        </button>
      </div>

      {/* Info Panel */}
      <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm text-white p-3 rounded-lg border border-white/20">
        <div className="text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-300">顶点数:</span>
            <span className="font-mono">8,192</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-300">面数:</span>
            <span className="font-mono">16,384</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">质量评分:</span>
            <span className="text-green-400 font-semibold">85/100</span>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-4 left-4">
        <div className="flex items-center space-x-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm border border-green-500/30">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>3D预览就绪</span>
        </div>
      </div>
    </div>
  )
}