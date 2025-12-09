<template>
  <k-layout>
    <template #header>
      <k-header>
        <div class="shop-header-content" style="display: flex; align-items: center; gap: 8px;">
          <i class="k-icon shop-admin-icon-container">
            <ShopIcons />
          </i>
          <span>积分商城管理</span>
        </div>
      </k-header>
    </template>
    
    <template #default>
      <div class="shop-container">
        <div class="shop-header">
          <div class="header-actions">
            <div class="search-input">
              <input 
                v-model="searchKeyword" 
                placeholder="搜索商品名称、描述或命令"
                class="search-field"
              />
              <button v-if="searchKeyword" @click="searchKeyword = ''" class="clear-btn">
                ×
              </button>
            </div>
            <button class="add-btn" @click="openAddDialog">
              <span class="btn-text">添加商品</span>
            </button>
          </div>
        </div>

        <k-card class="shop-list-card">
          <div v-if="loading" class="loading-container">
            加载中...
          </div>
          
          <div v-else class="table-container">
            <table class="shop-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>商品名称</th>
                  <th>描述</th>
                  <th>类型</th>
                  <th>价格</th>
                  <th>库存</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredItems" :key="item.id">
                  <td>{{ item.id }}</td>
                  <td>{{ item.name }}</td>
                  <td class="description-cell">{{ item.description || '-' }}</td>
                  <td>
                    <span :class="`type-tag type-${item.type}`">
                      {{ getTypeText(item.type) }}
                    </span>
                  </td>
                  <td>{{ item.price }} 积分</td>
                  <td>{{ item.stock === -1 ? '无限' : item.stock }}</td>
                  <td>
                    <label class="switch">
                      <input 
                        type="checkbox" 
                        :checked="item.enabled" 
                        @change="toggleStatus(item)"
                      />
                      <span class="slider"></span>
                      <span class="switch-text">{{ item.enabled ? '启用' : '禁用' }}</span>
                    </label>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="action-btn edit-btn" @click="openEditDialog(item)">
                        编辑
                      </button>
                      <button class="action-btn delete-btn" @click="deleteItem(item)">
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="filteredItems.length === 0" class="empty-state">
              <div class="empty-icon">📦</div>
              <p class="empty-text">暂无商品数据</p>
              <button class="add-empty-btn" @click="openAddDialog">添加第一个商品</button>
            </div>
          </div>
        </k-card>

        <div v-if="showDialog" class="modal-overlay" @click.self="showDialog = false">
          <div class="modal-dialog">
            <div class="modal-header">
              <h3>{{ dialogTitle }}</h3>
              <button class="close-btn" @click="showDialog = false">&times;</button>
            </div>
            
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label required">商品名称</label>
                <input 
                  v-model="formData.name" 
                  class="form-input" 
                  placeholder="请输入商品名称"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">描述</label>
                <textarea
                  v-model="formData.description"
                  class="form-textarea"
                  placeholder="请输入商品描述"
                  rows="3"
                ></textarea>
              </div>
              
              <div class="form-group">
                <label class="form-label required">类型</label>
                <select v-model="formData.type" class="form-select">
                  <option value="command">命令</option>
                  <option value="role">身份</option>
                  <option value="item">道具</option>
                </select>
              </div>
              
              <div v-if="formData.type === 'command'" class="form-group">
                <label class="form-label required">执行命令</label>
                <input 
                  v-model="formData.command" 
                  class="form-input" 
                  placeholder="例如: /search"
                />
              </div>
              
              <div v-if="formData.type === 'command'" class="form-group">
                <label class="form-label">最大使用次数</label>
                <input
                  v-model.number="formData.max_usage"
                  type="number"
                  min="1"
                  class="form-input"
                  placeholder="留空表示无限制"
                />
                <div class="form-hint">留空表示无限制</div>
              </div>
              
              <div v-if="formData.type === 'command'" class="form-group">
                <label class="form-label">冷却时间</label>
                <input
                  v-model.number="formData.cooldown"
                  type="number"
                  min="0"
                  class="form-input"
                />
                <span class="form-unit">分钟</span>
              </div>
              
              <div class="form-group">
                <label class="form-label required">价格</label>
                <input
                  v-model.number="formData.price"
                  type="number"
                  min="1"
                  class="form-input"
                />
                <span class="form-unit">积分</span>
              </div>
              
              <div class="form-group">
                <label class="form-label">库存类型</label>
                <div class="radio-group">
                  <label class="radio-item">
                    <input
                      type="radio"
                      v-model="stockType"
                      value="limited"
                      class="radio-input"
                    />
                    <span class="radio-dot"></span>
                    <span class="radio-label">有限库存</span>
                  </label>
                  <label class="radio-item">
                    <input
                      type="radio"
                      v-model="stockType"
                      value="unlimited"
                      class="radio-input"
                    />
                    <span class="radio-dot"></span>
                    <span class="radio-label">无限库存</span>
                  </label>
                </div>
              </div>
              
              <div v-if="stockType === 'limited'" class="form-group">
                <label class="form-label">库存数量</label>
                <input
                  v-model.number="formData.stock"
                  type="number"
                  min="0"
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">状态</label>
                <label class="status-toggle">
                  <input
                    type="checkbox"
                    v-model="formData.enabled"
                    class="toggle-input"
                  />
                  <span class="toggle-slider"></span>
                  <span class="toggle-text">{{ formData.enabled ? '启用' : '禁用' }}</span>
                </label>
              </div>
            </div>
            
            <div class="modal-footer">
              <button class="btn-cancel" @click="showDialog = false">
                取消
              </button>
              <button class="btn-confirm" @click="submitForm" :disabled="submitting">
                <span v-if="submitting">保存中...</span>
                <span v-else>确定</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </k-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { send, store } from '@koishijs/client'
import type {} from '@koishijs/plugin-console'

// 更改 3: 导入 ShopIcons (复数形式)
import ShopIcons from './icons/ShopIcons.vue'

interface ShopItem {
  id: number
  name: string
  description?: string
  price: number
  stock: number
  type: 'command' | 'role' | 'item'
  command?: string
  max_usage?: number
  cooldown?: number
  enabled: boolean
  created_at?: Date
  updated_at?: Date
}

// 响应式数据
const items = ref<ShopItem[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const showDialog = ref(false)
const submitting = ref(false)

// 表单数据
const formData = ref({
  id: 0,
  name: '',
  description: '',
  price: 100,
  stock: 100,
  type: 'command' as 'command' | 'role' | 'item',
  command: '',
  max_usage: undefined as number | undefined,
  cooldown: 0,
  enabled: true
})

// 计算属性
const filteredItems = computed(() => {
  if (!searchKeyword.value.trim()) return items.value
  const keyword = searchKeyword.value.toLowerCase()
  return items.value.filter(item => 
    item.name.toLowerCase().includes(keyword) ||
    (item.description && item.description.toLowerCase().includes(keyword)) ||
    (item.command && item.command.toLowerCase().includes(keyword))
  )
})

// 库存类型计算属性
const stockType = computed({
  get: () => formData.value.stock === -1 ? 'unlimited' : 'limited',
  set: (type: 'limited' | 'unlimited') => {
    formData.value.stock = type === 'unlimited' ? -1 : 100
  }
})

// 对话框标题计算属性
const dialogTitle = computed(() => 
  formData.value.id === 0 ? '添加商品' : '编辑商品'
)

// 辅助函数
const getTypeText = (type: string) => {
  const map: Record<string, string> = {
    command: '命令',
    role: '身份',
    item: '道具'
  }
  return map[type] || type
}

// 加载商品数据
const loadItems = async () => {
  loading.value = true
  try {
    // 通过 RPC 调用后端获取商品列表
    const data = await send('zhukong-shop/list')
    items.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('加载商品失败:', error)
    items.value = []
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  loadItems()
})

// 表单处理
const resetForm = () => {
  formData.value = {
    id: 0,
    name: '',
    description: '',
    price: 100,
    stock: 100,
    type: 'command',
    command: '',
    max_usage: undefined,
    cooldown: 0,
    enabled: true
  }
}

const openAddDialog = () => {
  resetForm()
  showDialog.value = true
}

const openEditDialog = (item: ShopItem) => {
  formData.value = { 
    ...item, 
    description: item.description || '', 
    command: item.command || '',
    max_usage: item.max_usage,
    stock: item.stock
  }
  showDialog.value = true
}

const validateForm = () => {
  if (!formData.value.name.trim()) {
    alert('请输入商品名称')
    return false
  }
  
  if (formData.value.type === 'command' && !formData.value.command.trim()) {
    alert('请输入执行命令')
    return false
  }
  
  if (formData.value.price <= 0) {
    alert('价格必须大于0')
    return false
  }
  
  if (stockType.value === 'limited' && formData.value.stock < 0) {
    alert('库存数量不能为负数')
    return false
  }
  
  return true
}

const submitForm = async () => {
  if (!validateForm()) return
  
  submitting.value = true
  
  try {
    const isAdding = formData.value.id === 0
    
    const itemData = {
      id: formData.value.id,
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      price: formData.value.price,
      stock: stockType.value === 'unlimited' ? -1 : formData.value.stock,
      type: formData.value.type,
      command: formData.value.command.trim(),
      max_usage: formData.value.max_usage,
      cooldown: formData.value.cooldown || 0,
      enabled: formData.value.enabled
    }
    
    if (isAdding) {
      // 调用后端添加商品
      await send('zhukong-shop/add', itemData)
    } else {
      // 调用后端更新商品
      await send('zhukong-shop/update', itemData)
    }
    
    showDialog.value = false
    submitting.value = false
    alert(isAdding ? '商品添加成功' : '商品修改成功')
    
    // 重新加载商品列表
    await loadItems()
    
  } catch (error) {
    console.error('保存失败:', error)
    submitting.value = false
    alert('操作失败，请重试: ' + error.message)
  }
}

// 商品操作
const toggleStatus = async (item: ShopItem) => {
  try {
    await send('zhukong-shop/update', {
      id: item.id,
      enabled: !item.enabled
    })
    
    // 更新本地状态
    item.enabled = !item.enabled
  } catch (error) {
    console.error('更新状态失败:', error)
  }
}

const deleteItem = async (item: ShopItem) => {
  if (!confirm(`确定要删除商品"${item.name}"吗？此操作不可撤销。`)) return
  
  try {
    await send('zhukong-shop/delete', { id: item.id })
    
    // 从本地列表移除
    const index = items.value.findIndex(i => i.id === item.id)
    if (index !== -1) {
      items.value.splice(index, 1)
    }
    
    alert('商品删除成功')
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败，请重试: ' + error.message)
  }
}
</script>

<style scoped>
/* 保持所有原有样式不变 */
.shop-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.shop-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  position: relative;
  display: flex;
  align-items: center;
}

.search-field {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  width: 300px;
  transition: border-color 0.3s;
}

.search-field:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover {
  color: #666;
}

.add-btn {
  padding: 8px 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.3s;
}

.add-btn:hover {
  background-color: #40a9ff;
}

.btn-text {
  line-height: 1;
}

.shop-list-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.loading-container {
  padding: 40px 0;
  text-align: center;
  color: #999;
}

.table-container {
  min-width: 800px;
}

.shop-table {
  width: 100%;
  border-collapse: collapse;
}

.shop-table th {
  text-align: left;
  padding: 16px;
  border-bottom: 2px solid #f0f0f0;
  font-weight: 600;
  color: #333;
  background-color: #fafafa;
}

.shop-table td {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}

.description-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.type-command {
  background-color: #e6f7ff;
  color: #1890ff;
}

.type-role {
  background-color: #f6ffed;
  color: #52c41a;
}

.type-item {
  background-color: #fff7e6;
  color: #fa8c16;
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: relative;
  width: 44px;
  height: 22px;
  background-color: #ccc;
  border-radius: 22px;
  margin-right: 8px;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
}

.switch input:checked + .slider {
  background-color: #52c41a;
}

.switch input:checked + .slider:before {
  transform: translateX(22px);
}

.switch-text {
  font-size: 14px;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.edit-btn {
  background-color: #1890ff;
  color: white;
}

.edit-btn:hover {
  background-color: #40a9ff;
}

.delete-btn {
  background-color: #ff4d4f;
  color: white;
}

.delete-btn:hover {
  background-color: #ff7875;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  color: #999;
  margin-bottom: 16px;
}

.add-empty-btn {
  padding: 8px 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.add-empty-btn:hover {
  background-color: #40a9ff;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-dialog {
  background: white;
  border-radius: 8px;
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.close-btn:hover {
  color: #666;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  padding: 8px 16px;
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-cancel:hover {
  background-color: #e6e6e6;
  border-color: #b3b3b3;
}

.btn-confirm {
  padding: 8px 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.btn-confirm:hover:not(:disabled) {
  background-color: #40a9ff;
}

.btn-confirm:disabled {
  background-color: #bae7ff;
  cursor: not-allowed;
}

/* 表单样式 */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-label.required::after {
  content: '*';
  color: #ff4d4f;
  margin-left: 4px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.form-unit {
  margin-left: 8px;
  color: #666;
}

.radio-group {
  display: flex;
  gap: 24px;
}

.radio-item {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.radio-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.radio-dot {
  position: relative;
  width: 16px;
  height: 16px;
  border: 2px solid #d9d9d9;
  border-radius: 50%;
  margin-right: 8px;
  transition: border-color 0.3s;
}

.radio-input:checked + .radio-dot {
  border-color: #1890ff;
}

.radio-input:checked + .radio-dot::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background-color: #1890ff;
  border-radius: 50%;
}

.radio-label {
  font-size: 14px;
  color: #333;
}

.status-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  width: 44px;
  height: 22px;
  background-color: #ccc;
  border-radius: 22px;
  margin-right: 12px;
  transition: .4s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
}

.toggle-input:checked + .toggle-slider {
  background-color: #52c41a;
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

.toggle-text {
  font-size: 14px;
  color: #333;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .shop-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input {
    width: 100%;
  }
  
  .search-field {
    width: 100%;
  }
  
  .modal-dialog {
    width: 95%;
    margin: 16px;
  }
  
  .modal-body {
    padding: 16px;
  }
  
  .shop-table {
    font-size: 14px;
  }
  
  .shop-table th,
  .shop-table td {
    padding: 12px 8px;
  }
}

/* 更改 4: 新增样式以修复图标偏移和设置尺寸 */
.shop-admin-icon-container {
  /* 确保 i 元素作为容器能够正确设置尺寸和对齐 */
  display: inline-flex; 
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
  
  /* 设置宽高为 2em，覆盖可能的默认样式 */
  width: 2em;
  height: 2em;
  
  /* 解决向下偏移，强制垂直居中对齐 */
  vertical-align: middle; 
}
</style>