import { useState, useRef } from 'react'
import { Upload, Type, Send, Loader2, Image, FileText } from 'lucide-react'

interface InputPanelProps {
  onModelGenerated: (model: any) => void
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
}

type InputMode = 'text' | 'image'

export default function InputPanel({ onModelGenerated, isGenerating, setIsGenerating }: InputPanelProps) {
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [textInput, setTextInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [complexity, setComplexity] = useState('medium')
  const [format, setFormat] = useState('gltf')
  const [previewResult, setPreviewResult] = useState<any>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleGenerate = async () => {
    if (isGenerating) return
    
    // 清除之前的错误
    setError('')
    
    if (inputMode === 'text' && !textInput.trim()) {
      setError('请输入文本描述')
      return
    }
    
    if (inputMode === 'image' && !selectedFile) {
      setError('请选择图片文件')
      return
    }

    setIsGenerating(true)
    setPreviewResult(null)

    try {
      let response
      
      if (inputMode === 'text') {
        // 第一阶段：生成预览
        response = await fetch('/api/generate/text/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: textInput,
            complexity: complexity,
            format: format
          }),
        })
      } else {
        const formData = new FormData()
        formData.append('file', selectedFile!)
        
        response = await fetch('/api/generate/image', {
          method: 'POST',
          body: formData,
        })
      }

      if (!response.ok) {
        throw new Error('生成失败')
      }

      const result = await response.json()
      
      if (result.success) {
        if (inputMode === 'text') {
          // 保存预览结果，等待用户选择是否精细化
          setPreviewResult(result)
        } else {
          // 图片生成直接完成
          const model = {
            id: result.model_id,
            modelUrl: result.model_url,
            previewUrl: result.thumbnail_url || result.preview_url,  // 使用缩略图作为预览
            qualityScore: result.quality_score,
            inputType: inputMode,
            inputContent: selectedFile?.name || '',
            createdAt: new Date().toISOString(),
          }
          
          onModelGenerated(model)
        }
      } else {
        throw new Error(result.message || '生成失败')
      }
    } catch (error) {
      console.error('生成错误:', error)
      setError(error instanceof Error ? error.message : '生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRefine = async () => {
    if (!previewResult || isRefining) return

    setIsRefining(true)

    try {
      const response = await fetch('/api/generate/text/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: previewResult.task_id
        }),
      })

      if (!response.ok) {
        throw new Error('精细化失败')
      }

      const result = await response.json()
      
      if (result.success) {
        const model = {
          id: result.model_id,
          modelUrl: result.model_url,
          previewUrl: result.thumbnail_url || result.preview_url,  // 使用缩略图作为预览
          downloadUrls: result.download_urls,
          qualityScore: result.quality_score,
          inputType: inputMode,
          inputContent: textInput,
          createdAt: new Date().toISOString(),
          stage: 'refined'
        }
        
        onModelGenerated(model)
        setPreviewResult(null)
      } else {
        throw new Error(result.message || '精细化失败')
      }
    } catch (error) {
      console.error('精细化错误:', error)
      setError(error instanceof Error ? error.message : '精细化失败，请重试')
    } finally {
      setIsRefining(false)
    }
  }

  const handleUsePreview = () => {
    if (!previewResult) return

    const model = {
      id: previewResult.task_id,
      modelUrl: previewResult.preview_url,  // GLB模型文件用于3D显示
      previewUrl: previewResult.thumbnail_url || previewResult.preview_url,  // 缩略图用于历史记录预览
      qualityScore: 0.7, // 预览质量分数
      inputType: inputMode,
      inputContent: textInput,
      createdAt: new Date().toISOString(),
      stage: 'preview',
      task_id: previewResult.task_id  // 添加task_id用于细化
    }
    
    onModelGenerated(model)
    setPreviewResult(null)
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg h-full flex flex-col">{/* 统一背景色和高度 */}
      {/* 标题 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">创建3D模型</h2>
        <p className="text-gray-400 text-sm">选择输入方式，开始生成您的3D模型</p>
      </div>

      {/* 输入模式选择 */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all duration-200 ${
              inputMode === 'text'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Type size={18} />
            <span>文本描述</span>
          </button>
          <button
            onClick={() => setInputMode('image')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all duration-200 ${
              inputMode === 'image'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Image size={18} />
            <span>图片上传</span>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="mb-6">
        {/* 文本输入模式 */}
        {inputMode === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                描述你想要的3D模型
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="例如：一匹奔跑的马、现代风格的椅子、科幻机器人..."
                className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <div className="text-xs text-gray-500 mt-2">
                {textInput.length}/500 字符
              </div>
            </div>
          </div>
        )}

        {/* 图片上传模式 */}
        {inputMode === 'image' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                上传参考图片
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  dragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : selectedFile
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-800'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 text-green-400 mx-auto" />
                    <p className="text-green-400 font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      移除文件
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-gray-300">
                      拖拽图片到此处，或
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-400 hover:text-blue-300 ml-1 transition-colors"
                      >
                        点击选择
                      </button>
                    </p>
                    <p className="text-sm text-gray-500">
                      支持 JPG, PNG, GIF 格式，最大 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 高级选项 */}
        <div className="space-y-4 mt-6">
          <h3 className="text-sm font-medium text-gray-300">高级选项</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2">模型复杂度</label>
              <select 
                value={complexity}
                onChange={(e) => setComplexity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="low">低 (快速)</option>
                <option value="medium">中等</option>
                <option value="high">高 (精细)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">输出格式</label>
              <select 
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="gltf">GLTF (推荐)</option>
                <option value="obj">OBJ</option>
                <option value="stl">STL</option>
                <option value="fbx">FBX</option>
              </select>
            </div>
          </div>
        </div>

        {/* 生成按钮 */}
        <div className="mt-auto">{/* 使用mt-auto将按钮推到底部 */}
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {!previewResult ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (inputMode === 'text' && !textInput.trim()) || (inputMode === 'image' && !selectedFile)}
              className={`w-full py-3 px-6 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-200 ${
                isGenerating || (inputMode === 'text' && !textInput.trim()) || (inputMode === 'image' && !selectedFile)
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>生成预览中...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>生成预览</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-4">
              {/* 预览结果提示 */}
              <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 font-medium">预览生成完成</span>
                </div>
                <p className="text-sm text-gray-300">
                  预览模型已生成，您可以选择直接使用预览版本，或进行精细化处理获得更高质量的模型。
                </p>
              </div>

              {/* 预览操作按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleUsePreview}
                  className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  使用预览版
                </button>
                <button
                  onClick={handleRefine}
                  disabled={isRefining}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    isRefining
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isRefining ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>精细化中</span>
                    </div>
                  ) : (
                    '精细化处理'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}