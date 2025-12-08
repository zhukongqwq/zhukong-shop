import { Context, Schema, h, Session } from 'koishi'
import { resolve } from 'path'
import {} from '@koishijs/plugin-console'

// 扩展 Koishi 的类型定义
declare module 'koishi' {
  interface Tables {
    shop_items: ShopItem
    shop_purchases: ShopPurchase
    shop_usage: ShopUsage
  }

  // 扩展 Events 接口以支持货币系统事件
  interface Events {
    'currency/get'(userId: string): Promise<number> | number
    'currency/set'(userId: string, amount: number): Promise<void> | void
    'currency/add'(userId: string, amount: number): Promise<void> | void
  }
}

// 扩展控制台事件类型
declare module '@koishijs/plugin-console' {
  interface Events {
    'zhukong-shop/list'(): Promise<any>
    'zhukong-shop/add'(data: any): Promise<any>
    'zhukong-shop/update'(data: any): Promise<any>
    'zhukong-shop/delete'(data: any): Promise<any>
  }
}

// 商品类型定义
export interface ShopItem {
  id: number
  name: string
  description: string
  price: number
  type: 'command' | 'role' | 'item'
  command?: string
  max_usage?: number
  cooldown?: number
  enabled: boolean
  stock: number
  created_at: Date
  updated_at: Date
}

// 购买记录
export interface ShopPurchase {
  id: number
  item_id: number
  user_id: string
  platform: string
  price: number
  purchased_at: Date
}

// 使用记录
export interface ShopUsage {
  id: number
  purchase_id: number
  user_id: string
  platform: string
  item_id: number
  command?: string
  used_at: Date
  remaining_uses: number
}

// 消息提示词配置
export interface MessageConfig {
  shopTitle: string
  shopEmpty: string
  shopItem: string
  purchaseSuccess: string
  purchaseInsufficient: string
  purchaseOutOfStock: string
  usageSuccess: string
  usageNoPermission: string
  usageCooldown: string
  usageExhausted: string
  addItemSuccess: string
  updateItemSuccess: string
  deleteItemSuccess: string
  itemNotFound: string
  userNotFound: string
  usageInfo: string
  usageEmpty: string
  adminUsageSuccess: string
  adminUsageList: string
}

// 主配置接口
export interface Config {
  currencyName: string
  commandPrefix: string
  enableAutoRestore: boolean
  enableLogging: boolean
  defaultMaxUsage: number
  defaultCooldown: number
  defaultMoney: number
  adminUsers: string[]
  messages: MessageConfig
}

// 配置架构
export const Config: Schema<Config> = Schema.object({
  currencyName: Schema.string()
    .default('积分')
    .description('货币名称（需与zhukong-currency-system保持一致）'),
  commandPrefix: Schema.string()
    .default('$')
    .description('指令前缀'),
  enableAutoRestore: Schema.boolean()
    .default(true)
    .description('插件重载时自动恢复使用次数'),
  enableLogging: Schema.boolean()
    .default(true)
    .description('启用详细日志记录'),
  defaultMaxUsage: Schema.number()
    .default(10)
    .description('命令商品的默认最大使用次数'),
  defaultCooldown: Schema.number()
    .default(5)
    .description('命令商品的默认冷却时间（分钟）'),
  defaultMoney: Schema.number()
    .default(1000)
    .description('用户默认积分数量'),
  adminUsers: Schema.array(Schema.string())
    .default([])
    .description('管理员用户列表，格式：平台:用户ID'),
  messages: Schema.object({
    shopTitle: Schema.string()
      .default('🏪 {currencyName}商店 (第{page}页/共{totalPages}页)')
      .description('商店列表标题'),
    shopEmpty: Schema.string()
      .default('商店暂无商品，请联系管理员添加。')
      .description('商店为空时的提示'),
    shopItem: Schema.string()
      .default('{index}. 【{name}】\n   描述: {description}\n   价格: {price}{currencyName}\n   库存: {stock}  类型: {type} {commandInfo}')
      .description('商品展示格式'),
    purchaseSuccess: Schema.string()
      .default('购买成功！商品【{name}】已添加到你的账户。剩余使用次数: {remaining}/{max}')
      .description('购买成功提示'),
    purchaseInsufficient: Schema.string()
      .default('{currencyName}不足，需要{price}{currencyName}，你当前有{balance}{currencyName}。')
      .description('积分不足提示'),
    purchaseOutOfStock: Schema.string()
      .default('商品【{name}】库存不足或已下架。')
      .description('库存不足提示'),
    usageSuccess: Schema.string()
      .default('使用成功！剩余使用次数: {remaining}/{max}。')
      .description('使用成功提示'),
    usageNoPermission: Schema.string()
      .default('你没有购买此商品或权限已过期。')
      .description('无权限提示'),
    usageCooldown: Schema.string()
      .default('冷却中，{remainingTime}分钟后可再次使用。')
      .description('冷却提示'),
    usageExhausted: Schema.string()
      .default('使用次数已用完。')
      .description('次数用完提示'),
    addItemSuccess: Schema.string()
      .default('商品【{name}】添加成功！ID: {id}')
      .description('添加商品成功'),
    updateItemSuccess: Schema.string()
      .default('商品【{name}】更新成功！')
      .description('更新商品成功'),
    deleteItemSuccess: Schema.string()
      .default('商品删除成功！')
      .description('删除商品成功'),
    itemNotFound: Schema.string()
      .default('商品不存在。')
      .description('商品不存在提示'),
    userNotFound: Schema.string()
      .default('用户不存在。')
      .description('用户不存在提示'),
    usageInfo: Schema.string()
      .default('📊 你的商品使用情况:\n{items}')
      .description('使用情况标题'),
    usageEmpty: Schema.string()
      .default('你还没有购买任何商品。')
      .description('无商品提示'),
    adminUsageSuccess: Schema.string()
      .default('已为用户 {target} 增加 {command} 使用次数 {amount} 次。')
      .description('管理员增加使用次数成功'),
    adminUsageList: Schema.string()
      .default('命令使用统计:\n{stats}')
      .description('命令使用统计列表'),
  }).description('消息提示词配置'),
})

export const name = 'zhukong-shop'
export const inject = ['database']

// 工具函数：应用消息模板
function formatMessage(template: string, params: Record<string, any>, config: Config): string {
  let message = template.replace(/{currencyName}/g, config.currencyName)
  for (const [key, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`{${key}}`, 'g'), String(value))
  }
  return message
}

// 辅助函数：获取用户积分
async function getUserBalance(ctx: Context, platform: string, userId: string, pluginConfig: Config): Promise<number> {
  try {
    const userKey = `${platform}:${userId}`
    const balance = await ctx.emit('currency/get', userKey)

    if (balance === undefined || balance === null) {
      return pluginConfig.defaultMoney
    }

    return typeof balance === 'number' ? balance :
           (typeof balance === 'string' ? parseFloat(balance) : pluginConfig.defaultMoney)
  } catch (error) {
    ctx.logger.error('获取用户积分失败:', error)
    return pluginConfig.defaultMoney
  }
}

// 辅助函数：扣除用户积分
async function deductUserBalance(ctx: Context, platform: string, userId: string, amount: number, pluginConfig: Config): Promise<boolean> {
  try {
    const balance = await getUserBalance(ctx, platform, userId, pluginConfig)
    if (balance < amount) return false

    await ctx.emit('currency/set', `${platform}:${userId}`, balance - amount)
    return true
  } catch (error) {
    ctx.logger.error('扣除积分失败:', error)
    return false
  }
}

// 辅助函数：检查用户是否为管理员
function isAdminUser(session: Session, config: Config): boolean {
  const userKey = `${session.platform}:${session.userId}`
  return config.adminUsers.includes(userKey)
}

// 辅助函数：检查并执行命令
async function executeCommandWithShopPermission(ctx: Context, session: Session, commandName: string, pluginConfig: Config): Promise<any> {
  const { platform, userId } = session

  const items = await ctx.database
    .select('shop_items')
    .where({
      type: 'command',
      command: commandName,
      enabled: true
    })
    .limit(1)
    .execute() as ShopItem[]

  if (items.length === 0) {
    return null
  }

  const item = items[0]

  const allUsages = await ctx.database
    .select('shop_usage')
    .where({
      user_id: userId,
      platform: platform,
      item_id: item.id
    })
    .execute()

  if (allUsages.length === 0) {
    return null
  }

  const validUsages = allUsages.filter(usage => usage.remaining_uses > 0)

  if (validUsages.length === 0) {
    return pluginConfig.messages.usageExhausted
  }

  const usage = validUsages[0]

  if (item.cooldown && item.cooldown > 0) {
    const lastUsed = new Date(usage.used_at)
    const cooldownMs = item.cooldown * 60 * 1000
    const now = new Date()

    if (now.getTime() - lastUsed.getTime() < cooldownMs) {
      const remainingTime = Math.ceil((cooldownMs - (now.getTime() - lastUsed.getTime())) / 1000 / 60)
      return formatMessage(pluginConfig.messages.usageCooldown, { remainingTime }, pluginConfig)
    }
  }

  const newRemaining = usage.remaining_uses - 1
  await ctx.database
    .set('shop_usage', { id: usage.id }, {
      used_at: new Date(),
      remaining_uses: newRemaining
    })

  return {
    success: true,
    usageMessage: formatMessage(pluginConfig.messages.usageSuccess, {
      remaining: newRemaining,
      max: item.max_usage || 1
    }, pluginConfig)
  }
}

export function apply(ctx: Context, config: Config) {
  // 1. 数据库表定义
  ctx.model.extend('shop_items', {
    id: { type: 'integer', nullable: false, initial: 0 },
    name: { type: 'string', length: 100 },
    description: { type: 'string', length: 500 },
    price: { type: 'integer', initial: 100 },
    type: { type: 'string', length: 20 },
    command: { type: 'string', length: 100 },
    max_usage: { type: 'integer', initial: config.defaultMaxUsage },
    cooldown: { type: 'integer', initial: config.defaultCooldown },
    enabled: { type: 'boolean', initial: true },
    stock: { type: 'integer', initial: -1 },
    created_at: { type: 'timestamp', initial: new Date() },
    updated_at: { type: 'timestamp', initial: new Date() },
  }, {
    primary: 'id',
    autoInc: true,
    unique: ['name'],
  })

  ctx.model.extend('shop_purchases', {
    id: { type: 'integer', nullable: false, initial: 0 },
    item_id: { type: 'integer' },
    user_id: { type: 'string' },
    platform: { type: 'string' },
    price: { type: 'integer' },
    purchased_at: { type: 'timestamp', initial: new Date() },
  }, {
    primary: 'id',
    autoInc: true,
    foreign: {
      item_id: ['shop_items', 'id'],
    },
  })

  ctx.model.extend('shop_usage', {
    id: { type: 'integer', nullable: false, initial: 0 },
    purchase_id: { type: 'integer' },
    user_id: { type: 'string' },
    platform: { type: 'string' },
    item_id: { type: 'integer' },
    command: { type: 'string', length: 100 },
    used_at: { type: 'timestamp', initial: new Date() },
    remaining_uses: { type: 'integer' },
  }, {
    primary: 'id',
    autoInc: true,
    foreign: {
      purchase_id: ['shop_purchases', 'id'],
      item_id: ['shop_items', 'id'],
    },
  })

  // 2. 商店主指令
  ctx.command(`${config.commandPrefix}shop [page:number]`, `查看${config.currencyName}商店`)
    .alias('商店')
    .action(async ({ session }, page = 1) => {
      if (!session) return '会话错误。'

      const pageSize = 5
      const skip = (page - 1) * pageSize

      const items = await ctx.database
        .select('shop_items')
        .where({ enabled: true })
        .orderBy('price', 'asc')
        .limit(pageSize)
        .offset(skip)
        .execute() as ShopItem[]

      const allItems = await ctx.database
        .select('shop_items')
        .where({ enabled: true })
        .execute() as ShopItem[]

      const totalItems = allItems.length
      const totalPages = Math.ceil(totalItems / pageSize)

      if (items.length === 0) {
        return page === 1 ? config.messages.shopEmpty : '该页没有商品。'
      }

      let message = formatMessage(config.messages.shopTitle, { page, totalPages }, config) + '\n'
      message += '='.repeat(30) + '\n'

      items.forEach((item, index) => {
        const stockText = item.stock === -1 ? '无限' : item.stock.toString()
        const commandInfo = item.type === 'command' && item.command
          ? `\n   命令: ${item.command} (最多${item.max_usage}次)`
          : ''

        message += formatMessage(config.messages.shopItem, {
          index: skip + index + 1,
          name: item.name,
          description: item.description,
          price: item.price,
          stock: stockText,
          type: item.type === 'command' ? '命令次数' : item.type === 'role' ? '角色权限' : '虚拟物品',
          commandInfo
        }, config) + '\n\n'
      })

      if (totalPages > 1) {
        message += `使用 "${config.commandPrefix}shop ${page < totalPages ? page + 1 : 1}" 查看下一页`
      }

      return message
    })

  // 3. 购买指令
  ctx.command(`${config.commandPrefix}buy <itemName>`, `购买商店商品`)
    .alias('购买')
    .action(async ({ session }, itemName) => {
      if (!session) return '会话错误。'
      if (!itemName) return '请指定要购买的商品名称。'

      const { platform, userId } = session

      const items = await ctx.database
        .select('shop_items')
        .where({
          name: { $regex: new RegExp(itemName, 'i') },
          enabled: true
        })
        .limit(1)
        .execute() as ShopItem[]

      if (items.length === 0) {
        return config.messages.itemNotFound
      }

      const item = items[0]

      if (item.stock === 0) {
        return formatMessage(config.messages.purchaseOutOfStock, { name: item.name }, config)
      }

      const balance = await getUserBalance(ctx, platform!, userId!, config)
      if (balance < item.price) {
        return formatMessage(config.messages.purchaseInsufficient, {
          price: item.price,
          balance
        }, config)
      }

      const success = await deductUserBalance(ctx, platform!, userId!, item.price, config)
      if (!success) {
        return '购买失败，请稍后重试。'
      }

      const purchase = await ctx.database.create('shop_purchases', {
        item_id: item.id,
        user_id: userId,
        platform: platform,
        price: item.price,
      })

      await ctx.database.create('shop_usage', {
        purchase_id: purchase.id,
        user_id: userId,
        platform: platform,
        item_id: item.id,
        command: item.command,
        remaining_uses: item.max_usage || 1,
      })

      if (item.stock > 0) {
        await ctx.database
          .set('shop_items', { id: item.id }, {
            stock: item.stock - 1,
            updated_at: new Date()
          })
      }

      return formatMessage(config.messages.purchaseSuccess, {
        name: item.name,
        remaining: item.max_usage || 1,
        max: item.max_usage || 1
      }, config)
    })

// 4. 使用命令指令 - 修正：使用完整的命令字符串
  ctx.command(`${config.commandPrefix}use <commandName>`, `使用已购买的命令`)
    .alias('使用')
    .action(async ({ session }, commandName) => {
      if (!session) return '会话错误。'
      if (!commandName) return '请指定要使用的命令名称。'

      const result = await executeCommandWithShopPermission(ctx, session, commandName, config)

      if (result === null) {
        return '该命令未在商店中配置或你未购买此命令。'
      }

      if (typeof result === 'string') {
        return result
      }

      // 先发送使用成功消息
      await session.send(result.usageMessage)

      // 然后执行命令 - 使用完整的命令字符串
      const fullCommand = `${commandName}`
      try {
        await session.execute(fullCommand)
      } catch (error) {
        ctx.logger.error(`执行命令 ${fullCommand} 失败:`, error)
      }

      // 不返回任何内容，因为消息已经发送了
      return
    })

  // 5. 查看我的商品指令
  ctx.command(`${config.commandPrefix}myitems`, `查看已购买的商品`)
    .alias('我的商品')
    .action(async ({ session }) => {
      if (!session) return '会话错误。'

      const { platform, userId } = session

      const purchases = await ctx.database
        .select('shop_purchases')
        .where({
          user_id: userId,
          platform: platform
        })
        .execute() as ShopPurchase[]

      if (purchases.length === 0) {
        return config.messages.usageEmpty
      }

      let itemsText = ''

      for (const purchase of purchases) {
        const items = await ctx.database
          .get('shop_items', { id: purchase.item_id })

        if (items.length === 0) continue
        const item = items[0] as ShopItem

        const usages = await ctx.database
          .get('shop_usage', {
            purchase_id: purchase.id
          })

        if (usages.length === 0) continue
        const usage = usages[0] as ShopUsage

        const remaining = usage.remaining_uses || 0
        const total = item.max_usage || 1

        itemsText += `📦 ${item.name}\n`
        itemsText += `   类型: ${item.type}\n`
        if (item.type === 'command' && item.command) {
          itemsText += `   命令: ${item.command}\n`
        }
        itemsText += `   购买时间: ${purchase.purchased_at.toLocaleDateString()}\n`
        itemsText += `   使用情况: ${remaining}/${total}次\n`

        if (item.cooldown) {
          itemsText += `   冷却时间: ${item.cooldown}分钟\n`
        }
        itemsText += '\n'
      }

      if (itemsText === '') {
        return config.messages.usageEmpty
      }

      return formatMessage(config.messages.usageInfo, { items: itemsText }, config)
    })

  // 6. 管理指令组
  const admin = ctx.command(`${config.commandPrefix}shopadmin`, `商店管理`)
    .alias('商店管理')
    .action(({ session }) => {
      if (!session) return '会话错误。'
      if (!isAdminUser(session, config)) {
        return '权限不足，只有管理员可以使用此命令。'
      }
      return '商店管理命令：\n' +
             '添加商品: .add <名称> <价格> <类型>\n' +
             '更新商品: .update <商品ID> [选项]\n' +
             '删除商品: .delete <商品ID>\n' +
             '查看所有商品: .list [页码]\n' +
             '增加使用次数: .usage.add <用户> <命令> <次数>\n' +
             '查看使用统计: .usage.list'
    })

  // 添加商品
  admin.subcommand('.add <name> <price:number> <type>', '添加新商品')
    .option('description', '-d <description>', { fallback: '暂无描述' })
    .option('command', '-c <command>')
    .option('maxUsage', '-m <maxUsage:number>')
    .option('cooldown', '-cd <cooldown:number>')
    .option('stock', '-s <stock:number>', { fallback: -1 })
    .action(async ({ session, options = {} }, name, price, type) => {
      if (!session) return '会话错误。'
      if (!isAdminUser(session, config)) {
        return '权限不足，只有管理员可以使用此命令。'
      }

      if (!name || !price || !type) {
        return '参数错误，格式: .add <名称> <价格> <类型> [选项]'
      }

      if (!['command', 'role', 'item'].includes(type)) {
        return '商品类型必须为: command, role, item 之一'
      }

      if (type === 'command' && !options.command) {
        return '命令类型商品必须指定 -c 参数'
      }

      const item = await ctx.database.create('shop_items', {
        name,
        description: options.description || '暂无描述',
        price,
        type: type as any,
        command: options.command,
        max_usage: options.maxUsage || config.defaultMaxUsage,
        cooldown: options.cooldown || config.defaultCooldown,
        enabled: true,
        stock: options.stock,
        created_at: new Date(),
        updated_at: new Date(),
      })

      return formatMessage(config.messages.addItemSuccess, {
        name: item.name,
        id: item.id
      }, config)
    })

  // 更新商品
  admin.subcommand('.update <itemId:number>', '更新商品信息')
    .option('name', '-n <name>')
    .option('description', '-d <description>')
    .option('price', '-p <price:number>')
    .option('stock', '-s <stock:number>')
    .option('enabled', '-e <enabled:boolean>')
    .option('maxUsage', '-m <maxUsage:number>')
    .option('cooldown', '-cd <cooldown:number>')
    .action(async ({ session, options = {} }, itemId) => {
      if (!session) return '会话错误。'
      if (!isAdminUser(session, config)) {
        return '权限不足，只有管理员可以使用此命令。'
      }

      const items = await ctx.database.get('shop_items', { id: itemId })
      if (items.length === 0) {
        return config.messages.itemNotFound
      }

      const updateData: any = { updated_at: new Date() }
      if (options.name) updateData.name = options.name
      if (options.description) updateData.description = options.description
      if (options.price) updateData.price = options.price
      if (options.stock !== undefined) updateData.stock = options.stock
      if (options.enabled !== undefined) updateData.enabled = options.enabled
      if (options.maxUsage !== undefined) updateData.max_usage = options.maxUsage
      if (options.cooldown !== undefined) updateData.cooldown = options.cooldown

      await ctx.database.set('shop_items', { id: itemId }, updateData)

      const item = items[0]
      return formatMessage(config.messages.updateItemSuccess, { name: item.name }, config)
    })

  // 删除商品
  admin.subcommand('.delete <itemId:number>', '删除商品')
    .action(async ({ session }, itemId) => {
      if (!session) return '会话错误。'
      if (!isAdminUser(session, config)) {
        return '权限不足，只有管理员可以使用此命令。'
      }

      const items = await ctx.database.get('shop_items', { id: itemId })
      if (items.length === 0) {
        return config.messages.itemNotFound
      }

      const item = items[0]

      const purchases = await ctx.database.get('shop_purchases', { item_id: itemId })
      const purchaseIds = purchases.map(p => p.id)

      if (purchaseIds.length > 0) {
        await ctx.database.remove('shop_usage', { purchase_id: purchaseIds })
      }
      await ctx.database.remove('shop_purchases', { item_id: itemId })
      await ctx.database.remove('shop_items', { id: itemId })

      return config.messages.deleteItemSuccess
    })

  // 查看所有商品
  admin.subcommand('.list [page:number]', '查看所有商品')
    .action(async ({ session }, page = 1) => {
      if (!session) return '会话错误。'
      if (!isAdminUser(session, config)) {
        return '权限不足，只有管理员可以使用此命令。'
      }

      const pageSize = 10
      const skip = (page - 1) * pageSize

      const items = await ctx.database
        .select('shop_items')
        .orderBy('id', 'asc')
        .limit(pageSize)
        .offset(skip)
        .execute() as ShopItem[]

      if (items.length === 0) {
        return page === 1 ? '暂无商品' : '该页没有商品。'
      }

      let message = `📋 所有商品 (第${page}页)\n`
      message += '='.repeat(40) + '\n'

      items.forEach((item, index) => {
        const stockText = item.stock === -1 ? '无限' : item.stock.toString()
        const status = item.enabled ? '✅' : '❌'

        message += `${status} ID: ${item.id}\n`
        message += `名称: ${item.name}\n`
        message += `描述: ${item.description}\n`
        message += `价格: ${item.price}${config.currencyName}\n`
        message += `类型: ${item.type}\n`
        if (item.command) {
          message += `命令: ${item.command}\n`
          message += `最大次数: ${item.max_usage} 冷却: ${item.cooldown}分钟\n`
        }
        message += `库存: ${stockText} 状态: ${item.enabled ? '启用' : '禁用'}\n`
        message += `创建: ${item.created_at.toLocaleDateString()}\n`
        message += '-'.repeat(20) + '\n'
      })

      return message
    })

  // 管理员增加使用次数
  admin.subcommand('.usage.add <target> <command> <amount:number>', '为用户增加命令使用次数')
    .action(async ({ session }, target, command, amount) => {
      if (!session) return '会话错误。'
      if (!isAdminUser(session, config)) {
        return '权限不足，只有管理员可以使用此命令。'
      }

      if (!target || !command || !amount) {
        return '参数错误，格式: .usage.add <用户> <命令> <次数>'
      }

      const [platform, userId] = target.includes(':')
        ? target.split(':', 2)
        : [session.platform, target]

      const items = await ctx.database
        .select('shop_items')
        .where({
          type: 'command',
          command: command,
          enabled: true
        })
        .limit(1)
        .execute() as ShopItem[]

      if (items.length === 0) {
        return '找不到该命令对应的商品'
      }

      const item = items[0]

      const usages = await ctx.database
        .select('shop_usage')
        .where({
          user_id: userId,
          platform: platform,
          item_id: item.id
        })
        .limit(1)
        .execute()

      if (usages.length === 0) {
        const purchase = await ctx.database.create('shop_purchases', {
          item_id: item.id,
          user_id: userId,
          platform: platform,
          price: 0,
        })

        await ctx.database.create('shop_usage', {
          purchase_id: purchase.id,
          user_id: userId,
          platform: platform,
          item_id: item.id,
          command: item.command,
          remaining_uses: amount,
        })
      } else {
        const usage = usages[0]
        const newRemaining = usage.remaining_uses + amount
        await ctx.database
          .set('shop_usage', { id: usage.id }, {
            remaining_uses: newRemaining
          })
      }

      return formatMessage(config.messages.adminUsageSuccess, {
        target: `${platform}:${userId}`,
        command,
        amount
      }, config)
    })

  // 查看使用统计
  admin.subcommand('.usage.list [page:number]', '查看命令使用统计')
    .action(async ({ session }, page = 1) => {
      if (!session) return '会话错误。'
      if (!isAdminUser(session, config)) {
        return '权限不足，只有管理员可以使用此命令。'
      }

      const pageSize = 10
      const skip = (page - 1) * pageSize

      const usages = await ctx.database
        .select('shop_usage')
        .orderBy('used_at', 'desc')
        .limit(pageSize)
        .offset(skip)
        .execute() as ShopUsage[]

      if (usages.length === 0) {
        return '暂无使用记录。'
      }

      let message = formatMessage(config.messages.adminUsageList, {}, config) + '\n'
      message += '='.repeat(40) + '\n'

      for (const usage of usages) {
        const items = await ctx.database.get('shop_items', { id: usage.item_id })
        if (items.length === 0) continue

        const item = items[0]
        message += `用户: ${usage.platform}:${usage.user_id}\n`
        message += `命令: ${item.command}\n`
        message += `剩余次数: ${usage.remaining_uses}/${item.max_usage}\n`
        message += `最后使用: ${usage.used_at.toLocaleString()}\n`
        message += '-'.repeat(20) + '\n'
      }

      return message
    })

	// 7. 中间件：自动拦截已购买的命令 - 修复权限问题
	if (config.enableLogging) {
	  ctx.middleware(async (session, next) => {
		const { content } = session

		// 检查是否是命令
		if (content && content.startsWith(config.commandPrefix)) {
		  const commandName = content.split(' ')[0].slice(config.commandPrefix.length)

		  // 跳过 $use 命令本身
		  if (commandName === 'use' || commandName === '使用') {
			return next()
		  }

		  // 检查是否是商店商品
		  const shopResult = await executeCommandWithShopPermission(ctx, session, commandName, config)

		  if (shopResult === null) {
			// 不是商店商品或用户未购买，按正常流程执行
			return next()
		  }

		  if (typeof shopResult === 'string') {
			// 返回冷却时间或次数用完的消息
			return shopResult
		  }

		  // 先发送使用成功消息
		  await session.send(shopResult.usageMessage)

		  // 保存原始权限 - 使用类型断言
		  const user = session.user as any
		  const originalAuthority = user?.authority
		  
		  // 临时提升权限以执行命令
		  if (user) {
			user.authority = 5 // 设置为管理员权限
		  }

		  try {
			// 使用完整的命令字符串
			const fullCommand = `${commandName}`
			const commandResult = await session.execute(fullCommand)

			// 如果命令有返回值，也发送
			if (commandResult) {
			  await session.send(commandResult)
			}
		  } catch (error) {
			ctx.logger.error(`执行命令 ${commandName} 失败:`, error)
		  } finally {
			// 恢复原始权限
			if (user && originalAuthority !== undefined) {
			  user.authority = originalAuthority
			}
		  }

		  // 不返回任何内容，因为消息已经发送了
		  return
		}

		return next()
	  })
	}

  ctx.inject(['console'], (ctx) => {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })

    ctx.console.addListener('zhukong-shop/list', async () => {
      try {
        const items = await ctx.database.get('shop_items', {})
        return items
      } catch (error) {
        ctx.logger.error('获取商品列表失败:', error)
        throw error
      }
    })

    ctx.console.addListener('zhukong-shop/add', async (data: any) => {
      try {
        if (!data.name || !data.price || !data.type) {
          throw new Error('缺少必要参数：名称、价格、类型')
        }

        const existing = await ctx.database.get('shop_items', { name: data.name })
        if (existing.length > 0) {
          throw new Error('商品名称已存在')
        }

        const item = await ctx.database.create('shop_items', {
          name: data.name,
          description: data.description || '暂无描述',
          price: data.price,
          type: data.type,
          command: data.command || '',
          max_usage: data.max_usage || config.defaultMaxUsage,
          cooldown: data.cooldown || config.defaultCooldown,
          enabled: data.enabled !== undefined ? data.enabled : true,
          stock: data.stock !== undefined ? data.stock : -1,
          created_at: new Date(),
          updated_at: new Date(),
        })

        return item
      } catch (error) {
        ctx.logger.error('添加商品失败:', error)
        throw error
      }
    })

    ctx.console.addListener('zhukong-shop/update', async (data: any) => {
      try {
        if (!data.id) {
          throw new Error('缺少商品ID')
        }

        const items = await ctx.database.get('shop_items', { id: data.id })
        if (items.length === 0) {
          throw new Error('商品不存在')
        }

        const updateData: any = { updated_at: new Date() }
        if (data.name !== undefined) updateData.name = data.name
        if (data.description !== undefined) updateData.description = data.description
        if (data.price !== undefined) updateData.price = data.price
        if (data.stock !== undefined) updateData.stock = data.stock
        if (data.enabled !== undefined) updateData.enabled = data.enabled
        if (data.max_usage !== undefined) updateData.max_usage = data.max_usage
        if (data.cooldown !== undefined) updateData.cooldown = data.cooldown
        if (data.command !== undefined) updateData.command = data.command
        if (data.type !== undefined) updateData.type = data.type

        await ctx.database.set('shop_items', { id: data.id }, updateData)

        return { success: true }
      } catch (error) {
        ctx.logger.error('更新商品失败:', error)
        throw error
      }
    })

    ctx.console.addListener('zhukong-shop/delete', async (data: any) => {
      try {
        if (!data.id) {
          throw new Error('缺少商品ID')
        }

        const items = await ctx.database.get('shop_items', { id: data.id })
        if (items.length === 0) {
          throw new Error('商品不存在')
        }

        const item = items[0]

        const purchases = await ctx.database.get('shop_purchases', { item_id: data.id })
        const purchaseIds = purchases.map(p => p.id)

        if (purchaseIds.length > 0) {
          await ctx.database.remove('shop_usage', { purchase_id: purchaseIds })
        }
        await ctx.database.remove('shop_purchases', { item_id: data.id })
        await ctx.database.remove('shop_items', { id: data.id })

        return { success: true }
      } catch (error) {
        ctx.logger.error('删除商品失败:', error)
        throw error
      }
    })
  })

  // 9. 启动日志
  ctx.on('ready', () => {
    ctx.logger.info(`${config.currencyName}商店插件已启动`)
  })
}
