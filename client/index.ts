import { Context } from '@koishijs/client'
import ShopAdmin from './components/ShopAdmin.vue'

export default (ctx: Context) => {
  // 此 Context 是前端的插件上下文，用于注册页面
  ctx.page({
    name: '积分商城管理', // 页面显示名称
    path: '/zhukong-shop', // 页面访问路径，如 https://localhost:5140/zhukong-shop
    order: 600, // 侧边栏排序，数值越大越靠下
    component: ShopAdmin, // 页面组件
  })
}