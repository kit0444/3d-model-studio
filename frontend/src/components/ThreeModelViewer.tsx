import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three-stdlib'
import { ZoomIn, ZoomOut, RotateCcw, Play, Pause } from 'lucide-react'

interface ThreeModelViewerProps {
  modelUrl?: string
  className?: string
}

const ThreeModelViewer: React.FC<ThreeModelViewerProps> = ({ modelUrl, className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const modelRef = useRef<THREE.Group>()
  const animationIdRef = useRef<number>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  // 交互控制状态
  const [zoom, setZoom] = useState(5)
  const [autoRotate, setAutoRotate] = useState(true)
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [manualRotation, setManualRotation] = useState(false)

  // 手动旋转状态变化时更新模型旋转
  // 手动旋转控制
  // 动画循环 - 使用useRef来获取最新状态
  const autoRotateRef = useRef(autoRotate)
  const manualRotationRef = useRef(manualRotation)
  
  // 更新refs当状态改变时
  useEffect(() => {
    autoRotateRef.current = autoRotate
  }, [autoRotate])
  
  useEffect(() => {
    manualRotationRef.current = manualRotation
  }, [manualRotation])

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.rotation.x = (rotationX / 100) * Math.PI
      modelRef.current.rotation.y = (rotationY / 100) * Math.PI
    }
  }, [rotationX, rotationY])

  // 缩放控制状态变化时更新相机
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = zoom
    }
  }, [zoom])

  // 初始化Three.js场景
  useEffect(() => {
    if (!mountRef.current) return

    const width = mountRef.current.clientWidth
    const height = mountRef.current.clientHeight

    // 创建场景
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1f2937)
    sceneRef.current = scene

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(0, 0, 5)
    cameraRef.current = camera

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // 将渲染器添加到DOM
    mountRef.current.appendChild(renderer.domElement)

    // 动画循环
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      
      // 旋转模型 - 使用ref获取最新状态
      if (modelRef.current) {
        if (autoRotateRef.current && !manualRotationRef.current) {
          modelRef.current.rotation.y += 0.01
        }
      }
      
      renderer.render(scene, camera)
    }
    animate()

    // 处理窗口大小变化
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return
      
      const newWidth = mountRef.current.clientWidth
      const newHeight = mountRef.current.clientHeight
      
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    // 添加鼠标滚轮缩放事件
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = event.deltaY > 0 ? 0.5 : -0.5
      setZoom(prev => Math.max(1, Math.min(20, prev + delta)))
    }

    if (mountRef.current) {
      mountRef.current.addEventListener('wheel', handleWheel)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (mountRef.current) {
        mountRef.current.removeEventListener('wheel', handleWheel)
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  // 加载模型（支持OBJ和GLB格式）
  const loadModel = async (url: string) => {
    setLoading(true)
    setError('')

    try {
      const fileExtension = url.split('.').pop()?.toLowerCase()
      
      if (fileExtension === 'glb' || fileExtension === 'gltf') {
        await loadGLBModel(url)
      } else if (fileExtension === 'obj') {
        await loadOBJModel(url)
      } else {
        throw new Error('不支持的文件格式')
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载模型时发生错误')
    } finally {
      setLoading(false)
    }
  }

  // 加载GLB模型
  const loadGLBModel = async (url: string) => {
    const loader = new GLTFLoader()
    
    return new Promise<void>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          // 移除旧模型
          if (modelRef.current && sceneRef.current) {
            sceneRef.current.remove(modelRef.current)
          }
          
          const model = gltf.scene
          
          // 计算边界盒以居中模型
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          model.position.sub(center)
          
          // 缩放模型以适应视口
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 2 / maxDim
          model.scale.setScalar(scale)
          
          // 创建新的模型组
          const modelGroup = new THREE.Group()
          modelGroup.add(model)
          modelRef.current = modelGroup
          
          if (sceneRef.current) {
            sceneRef.current.add(modelGroup)
          }
          
          resolve()
        },
        (progress) => {
          // 可以在这里处理加载进度
          console.log('Loading progress:', progress)
        },
        (error) => {
          reject(new Error('GLB模型加载失败: ' + error.message))
        }
      )
    })
  }

  // 加载OBJ模型
  const loadOBJModel = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('模型文件加载失败')
    }
    
    const objText = await response.text()
    const geometry = parseOBJ(objText)
    
    // 创建材质
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x00ff88,
      wireframe: false
    })
    
    // 创建网格
    const mesh = new THREE.Mesh(geometry, material)
    
    // 计算边界盒以居中模型
    const box = new THREE.Box3().setFromObject(mesh)
    const center = box.getCenter(new THREE.Vector3())
    mesh.position.sub(center)
    
    // 缩放模型以适应视口
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 2 / maxDim
    mesh.scale.setScalar(scale)
    
    // 移除旧模型
    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current)
    }
    
    // 创建新的模型组
    const modelGroup = new THREE.Group()
    modelGroup.add(mesh)
    modelRef.current = modelGroup
    
    if (sceneRef.current) {
      sceneRef.current.add(modelGroup)
    }
  }
  // 简单的OBJ解析器
  const parseOBJ = (objText: string): THREE.BufferGeometry => {
    const vertices: number[] = []
    const faces: number[] = []
    
    const lines = objText.split('\n')
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      
      if (parts[0] === 'v') {
        // 顶点
        vertices.push(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        )
      } else if (parts[0] === 'f') {
        // 面（假设是三角形或四边形）
        const faceVertices = parts.slice(1).map(part => {
          const vertexIndex = parseInt(part.split('/')[0]) - 1
          return vertexIndex
        })
        
        if (faceVertices.length === 3) {
          // 三角形
          faces.push(faceVertices[0], faceVertices[1], faceVertices[2])
        } else if (faceVertices.length === 4) {
          // 四边形，分解为两个三角形
          faces.push(
            faceVertices[0], faceVertices[1], faceVertices[2],
            faceVertices[0], faceVertices[2], faceVertices[3]
          )
        }
      }
    }
    
    const geometry = new THREE.BufferGeometry()
    
    // 创建顶点数组
    const positionArray = new Float32Array(faces.length * 3)
    for (let i = 0; i < faces.length; i++) {
      const vertexIndex = faces[i]
      positionArray[i * 3] = vertices[vertexIndex * 3]
      positionArray[i * 3 + 1] = vertices[vertexIndex * 3 + 1]
      positionArray[i * 3 + 2] = vertices[vertexIndex * 3 + 2]
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
    geometry.computeVertexNormals()
    
    return geometry
  }

  // 缩放控制函数
  const handleZoomIn = () => {
    setZoom(prev => Math.max(1, prev - 1))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.min(20, prev + 1))
  }

  // 重置视角
  const handleResetView = () => {
    setZoom(5)
    setRotationX(0)
    setRotationY(0)
    setManualRotation(false)
  }

  // 切换自动旋转
  const toggleAutoRotate = () => {
    setAutoRotate(prev => {
      const newAutoRotate = !prev
      if (newAutoRotate) {
        setManualRotation(false)
      }
      return newAutoRotate
    })
  }

  // 手动旋转控制
  const handleRotationXChange = (value: number) => {
    setRotationX(value)
    setManualRotation(true)
    setAutoRotate(false)
  }

  const handleRotationYChange = (value: number) => {
    setRotationY(value)
    setManualRotation(true)
    setAutoRotate(false)
  }

  // 当modelUrl改变时加载新模型
  useEffect(() => {
    if (modelUrl) {
      loadModel(modelUrl)
    }
  }, [modelUrl])

  return (
    <div className={`flex w-full h-full ${className}`}>
      {/* 左侧模型展示区域 */}
      <div className="flex-1 relative">
        <div ref={mountRef} className="w-full h-full" />
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <div className="text-white">加载模型中...</div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <div className="text-red-400">{error}</div>
          </div>
        )}
        
        {!modelUrl && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <div className="text-gray-400">暂无模型</div>
          </div>
        )}
      </div>
      
      {/* 右侧控制面板 */}
      <div className="w-64 bg-gray-800 p-4 space-y-4 overflow-y-auto">
        {/* 缩放控制 */}
        <div className="space-y-3">
          <h3 className="text-white text-sm font-medium border-b border-gray-600 pb-2">缩放控制</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleZoomIn}
              className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
              title="放大"
            >
              <ZoomIn size={16} className="mx-auto" />
            </button>
            <button
              onClick={handleZoomOut}
              className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
              title="缩小"
            >
              <ZoomOut size={16} className="mx-auto" />
            </button>
            <button
              onClick={handleResetView}
              className="flex-1 p-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
              title="重置视角"
            >
              <RotateCcw size={16} className="mx-auto" />
            </button>
          </div>
          <div className="text-xs text-gray-300 text-center">缩放: {zoom.toFixed(1)}x</div>
        </div>

        {/* 自动旋转开关 */}
        <div className="space-y-3">
          <h3 className="text-white text-sm font-medium border-b border-gray-600 pb-2">自动旋转</h3>
          <button
            onClick={toggleAutoRotate}
            className={`w-full flex items-center justify-center p-3 rounded transition-colors ${
              autoRotate 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-700'
            } text-white`}
          >
            {autoRotate ? <Pause size={16} /> : <Play size={16} />}
            <span className="ml-2 text-sm">
              {autoRotate ? '暂停旋转' : '开始旋转'}
            </span>
          </button>
        </div>

        {/* 手动旋转滑条 */}
        <div className="space-y-3">
          <h3 className="text-white text-sm font-medium border-b border-gray-600 pb-2">手动旋转</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-300">X轴旋转</label>
                <span className="text-xs text-gray-300">{rotationX}°</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={rotationX}
                onChange={(e) => handleRotationXChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-300">Y轴旋转</label>
                <span className="text-xs text-gray-300">{rotationY}°</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={rotationY}
                onChange={(e) => handleRotationYChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThreeModelViewer