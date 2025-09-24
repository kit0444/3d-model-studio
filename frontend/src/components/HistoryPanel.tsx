import { useState } from 'react'
import { Search, Filter, Download, Eye, Trash2, Calendar, Type, Image } from 'lucide-react'

interface HistoryPanelProps {
  models: any[]
  onModelSelect: (model: any) => void
}

type FilterType = 'all' | 'text' | 'image'
type SortType = 'newest' | 'oldest' | 'quality'

export default function HistoryPanel({ models, onModelSelect }: HistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortType, setSortType] = useState<SortType>('newest')
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  // 过滤和排序模型
  const filteredModels = models
    .filter(model => {
      const matchesSearch = model.inputContent.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterType === 'all' || model.inputType === filterType
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortType) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'quality':
          return (b.qualityScore || 0) - (a.qualityScore || 0)
        default:
          return 0
      }
    })

  const handleSelectModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  const handleSelectAll = () => {
    if (selectedModels.length === filteredModels.length) {
      setSelectedModels([])
    } else {
      setSelectedModels(filteredModels.map(model => model.id))
    }
  }

  const handleBatchDownload = () => {
    if (selectedModels.length > 0) {
      console.log('批量下载:', selectedModels)
      alert(`批量下载 ${selectedModels.length} 个模型`)
    }
  }

  const handleBatchDelete = () => {
    if (selectedModels.length > 0) {
      const confirmed = confirm(`确定要删除 ${selectedModels.length} 个模型吗？`)
      if (confirmed) {
        console.log('批量删除:', selectedModels)
        setSelectedModels([])
      }
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-400'
    if (score >= 0.8) return 'text-blue-400'
    if (score >= 0.7) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getQualityLabel = (score: number) => {
    if (score >= 0.9) return '优秀'
    if (score >= 0.8) return '良好'
    if (score >= 0.7) return '一般'
    return '较差'
  }

  return (
    <div className="space-y-6">
      {/* 搜索和过滤栏 */}
      <div className="glass-effect rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索模型..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 过滤和排序 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部类型</option>
                <option value="text">文本输入</option>
                <option value="image">图片输入</option>
              </select>
            </div>

            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SortType)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">最新创建</option>
              <option value="oldest">最早创建</option>
              <option value="quality">质量排序</option>
            </select>
          </div>
        </div>

        {/* 批量操作 */}
        {selectedModels.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <span className="text-blue-400 text-sm">
              已选择 {selectedModels.length} 个模型
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBatchDownload}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                批量下载
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                批量删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 模型列表 */}
      <div className="glass-effect rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            历史记录 ({filteredModels.length})
          </h2>
          {filteredModels.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {selectedModels.length === filteredModels.length ? '取消全选' : '全选'}
            </button>
          )}
        </div>

        {filteredModels.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">暂无历史记录</h3>
            <p className="text-gray-400">
              {searchTerm || filterType !== 'all' ? '没有找到匹配的模型' : '开始生成你的第一个3D模型吧！'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map((model) => (
              <div
                key={model.id}
                className={`relative p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                  selectedModels.includes(model.id)
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
                onClick={() => onModelSelect(model)}
              >
                {/* 选择框 */}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleSelectModel(model.id)
                    }}
                    className="w-4 h-4 text-blue-600 bg-transparent border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                {/* 模型预览 */}
                <div className="aspect-square bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg mb-3 flex items-center justify-center">
                  {model.previewUrl ? (
                    <img
                      src={model.previewUrl}
                      alt="模型预览"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <Eye className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* 模型信息 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {model.inputType === 'text' ? (
                      <Type className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Image className="w-4 h-4 text-cyan-400" />
                    )}
                    <span className="text-xs text-gray-400">
                      {model.inputType === 'text' ? '文本' : '图片'}
                    </span>
                  </div>

                  <p className="text-sm text-white font-medium truncate">
                    {model.inputContent}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(model.createdAt).toLocaleDateString()}
                    </span>
                    {model.qualityScore && (
                      <span className={`text-xs font-medium ${getQualityColor(model.qualityScore)}`}>
                        {getQualityLabel(model.qualityScore)} {(model.qualityScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('下载模型:', model.id)
                    }}
                    className="p-1 bg-black/50 rounded text-white hover:bg-black/70 transition-colors"
                    title="下载"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('删除模型:', model.id)
                    }}
                    className="p-1 bg-black/50 rounded text-white hover:bg-black/70 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}