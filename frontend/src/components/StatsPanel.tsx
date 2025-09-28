import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { TrendingUp, Clock, Zap, Award } from 'lucide-react'

interface StatsPanelProps {
  models: any[]
}

export default function StatsPanel({ models }: StatsPanelProps) {
  // 计算统计数据
  const totalModels = models.length
  const averageQuality = models.length > 0 
    ? models.reduce((sum, model) => sum + ((model.qualityScore || model.quality_score) || 0), 0) / models.length
    : 0

  const textModels = models.filter(m => (m.inputType || m.input_type) === 'text').length
  const imageModels = models.filter(m => (m.inputType || m.input_type) === 'image').length

  // 质量分布数据
  const qualityDistribution = [
    { name: '优秀 (90-100%)', value: models.filter(m => ((m.qualityScore || m.quality_score) || 0) >= 0.9).length, color: '#10b981' },
    { name: '良好 (80-89%)', value: models.filter(m => ((m.qualityScore || m.quality_score) || 0) >= 0.8 && ((m.qualityScore || m.quality_score) || 0) < 0.9).length, color: '#3b82f6' },
    { name: '一般 (70-79%)', value: models.filter(m => ((m.qualityScore || m.quality_score) || 0) >= 0.7 && ((m.qualityScore || m.quality_score) || 0) < 0.8).length, color: '#f59e0b' },
    { name: '较差 (<70%)', value: models.filter(m => ((m.qualityScore || m.quality_score) || 0) < 0.7).length, color: '#ef4444' },
  ]

  // 输入类型分布
  const inputTypeData = [
    { name: '文本输入', value: textModels, color: '#8b5cf6' },
    { name: '图片输入', value: imageModels, color: '#06b6d4' },
  ]

  // 生成趋势数据（按日期）
  const trendData = models.reduce((acc: any[], model) => {
    const date = new Date(model.createdAt || model.created_at).toLocaleDateString()
    const existing = acc.find(item => item.date === date)
    if (existing) {
      existing.count += 1
    } else {
      acc.push({ date, count: 1 })
    }
    return acc
  }, []).slice(-7) // 最近7天

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">总生成数量</p>
              <p className="text-2xl font-bold text-white">{totalModels}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">平均质量</p>
              <p className="text-2xl font-bold text-white">{(averageQuality * 100).toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">文本生成</p>
              <p className="text-2xl font-bold text-white">{textModels}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">图片生成</p>
              <p className="text-2xl font-bold text-white">{imageModels}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 质量分布饼图 */}
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">质量分布</h3>
          {totalModels > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={qualityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {qualityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              暂无数据
            </div>
          )}
        </div>

        {/* 输入类型分布 */}
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">输入类型分布</h3>
          {totalModels > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inputTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'white', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis 
                  tick={{ fill: 'white', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* 生成趋势 */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">生成趋势 (最近7天)</h3>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'white', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis 
                tick={{ fill: 'white', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            暂无数据
          </div>
        )}
      </div>

      {/* 详细统计表格 */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">详细统计</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-300">指标</th>
                <th className="text-left py-3 px-4 text-gray-300">数值</th>
                <th className="text-left py-3 px-4 text-gray-300">说明</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 text-white">总生成数量</td>
                <td className="py-3 px-4 text-blue-400 font-medium">{totalModels}</td>
                <td className="py-3 px-4 text-gray-400">累计生成的3D模型数量</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 text-white">平均质量评分</td>
                <td className="py-3 px-4 text-green-400 font-medium">{(averageQuality * 100).toFixed(2)}%</td>
                <td className="py-3 px-4 text-gray-400">所有模型的平均质量评分</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 text-white">文本输入占比</td>
                <td className="py-3 px-4 text-purple-400 font-medium">
                  {totalModels > 0 ? ((textModels / totalModels) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-3 px-4 text-gray-400">使用文本描述生成的模型占比</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-white">图片输入占比</td>
                <td className="py-3 px-4 text-cyan-400 font-medium">
                  {totalModels > 0 ? ((imageModels / totalModels) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-3 px-4 text-gray-400">使用图片上传生成的模型占比</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}