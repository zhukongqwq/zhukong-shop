import { Context, icons } from '@koishijs/client'
import Page from './page.vue'
import ShopIcons from './icons/ShopIcons.vue'

icons.register('ShopIcons', ShopIcons)

export default (ctx: Context) => {
  ctx.page({
    name: '积分商城管理', 
    path: '/zhukong-shop', 
    order: 600, 
    component: Page, 
    icon: "ShopIcons"
  })
}