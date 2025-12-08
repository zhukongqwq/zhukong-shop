# Koishi 积分商城插件 (zhukong-shop) 🏪

一个功能完整的 Koishi 积分商城插件，支持用户购买命令使用次数、查看商品、管理积分消费记录等功能，包含可视化控制台管理界面。

## ✨ 特性亮点

- 🏪 **完整商城系统** - 用户友好的商店展示与购买流程
- 🔧 **命令次数控制** - 精细控制命令使用次数与冷却时间
- 💰 **无缝货币集成** - 与 `zhukong-currency-system` 完美协作
- 👑 **完善管理系统** - 支持商品的增删改查全功能操作
- 📊 **消费记录追踪** - 详细记录用户购买与使用行为
- 🖥️ **可视化控制台** - 提供网页端商品管理界面
- ⚙️ **高度可配置** - 支持自定义货币名称、冷却时间、库存等

> **自用说明**：此插件主要为个人需求开发，功能稳定但可能随性更新，不提供长期维护保证。

---

## 📦 安装方式

### 前置要求
- Koishi 版本 ≥ 4.15.0
- 已安装并配置 [zhukong-currency-system](https://github.com/zhukongqwq/zhukong-currency-system) 插件

### 快速安装
1. **在插件市场搜索zhukong-shop**

2.
```bash
# 通过 npm 安装
npm install koishi-plugin-zhukong-shop

# 或通过 yarn 安装
yarn add koishi-plugin-zhukong-shop
```

安装完成后，在 Koishi 控制台启用插件并配置相应参数。

###⚙️ 配置说明

在 koishi.yml 中添加以下配置：

```yaml
plugins:
  zhukong-shop:
    # 基础配置
    currencyName: '积分'              # 货币名称，需与货币系统保持一致
    commandPrefix: '$'                # 指令前缀
    
    # 功能开关
    enableAutoRestore: true          # 插件重载时自动恢复使用次数
    enableLogging: true              # 启用详细日志记录
    
    # 默认值配置
    defaultMaxUsage: 10              # 命令商品的默认最大使用次数
    defaultCooldown: 5               # 命令商品的默认冷却时间（分钟）
    defaultMoney: 1000               # 用户默认积分数量
    
    # 管理员配置
    adminUsers:                      # 管理员用户列表
      - 'onebot:123456789'           # 格式：平台:用户ID
      - 'discord:987654321'
    
    # 消息提示自定义（可选）
    messages:
      shopTitle: '🏪 {currencyName}商店 (第{page}页/共{totalPages}页)'
      purchaseSuccess: '购买成功！商品【{name}】已添加到你的账户。'
      # ... 更多消息可自定义
```

###🎮 使用指南

####用户命令

|命令|别名|说明|示例
|  ----  | ----  | ----  | ----  |
|$shop [页码]|商店|查看商店商品列表|$shop、$shop 2
|$buy <品名>|购买|购买指定商品|$buy 高级搜索
|$use <命令名>|使用|使用已购买的命令|$use search
|$myitems|我的商品|查看已购买商品和使用情况|$myitems

####管理员命令

|命令|说明|示例
|  ----  | ----  | ---------  |
|$shopadmin|显示管理帮助|$shopadmin
|$shopadmin.add <名称> <价格> <类型>|添加新商品|$shopadmin.add 高级搜索 500 command -c search -m 10
|$shopadmin.update <商品ID>|更新商品信息|$shopadmin.update 1 -p 600 -s 50
|$shopadmin.delete <商品ID>|删除商品|$shopadmin.delete 1
|$shopadmin.list [页码]|查看所有商品|$shopadmin.list
|$shopadmin.usage.add <用户> <命令> <次数>|为用户增加使用次数|$shopadmin.usage.add onebot:123456 search 5
|$shopadmin.usage.list [页码]|查看使用统计|$shopadmin.usage.list

####商品类型说明

1. Command (命令类型)

用户可以购买特定命令的使用次数。

```bash
# 示例：添加搜索命令，价格500积分，最多使用10次，冷却5分钟
$shopadmin.add 高级搜索 500 command -d "高级搜索功能" -c search -m 10 -cd 5
```

2. Item (物品类型)

虚拟物品，可用于装饰或标记。

```bash
# 示例：添加无限库存的虚拟徽章
$shopadmin.add 会员徽章 1000 item -d "尊贵会员标识" -s -1
```

3. Role (角色类型) - 预留功能

用于权限管理，可扩展为用户组或特殊权限。

###🖥️ 控制台界面

插件包含可视化控制台界面，可通过 Koishi 控制台访问：

· 商品列表查看 - 直观展示所有商品信息
· 商品管理 - 可视化添加、编辑、删除商品
· 状态监控 - 实时查看商品销售与使用情况

###🔧 开发与构建

```bash
# 克隆项目
git clone https://github.com/zhukongqwq/zhukong-shop.git
cd zhukong-shop

# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建项目
npm run build
```

###📁 项目结构

```
zhukong-shop/
├── src/
│   └── index.ts          # 插件主文件
├── lib/                  # 编译后的文件
├── client/               # 控制台前端代码
├── package.json          # 项目配置
├── README.md            # 项目文档
└── tsconfig.json        # TypeScript 配置
```

###🤝 依赖关系

· 必须依赖:
  · koishi-plugin-zhukong-currency-system - 提供基础货币系统支持
· 核心依赖:
  · koishi (≥4.15.0) - Koishi 机器人框架
· 可选依赖:
  · @koishijs/plugin-console - 控制台界面支持

###❓ 常见问题

#####Q1: 插件安装后无法启动？

· 确保已正确安装并配置 zhukong-currency-system 插件
· 检查 Koishi 版本是否 ≥ 4.15.0

#####Q2: 用户购买商品时提示"用户不存在"？

· 确保用户已在货币系统中初始化（通常通过发言自动完成）
· 检查货币系统插件是否正常运行

#####Q3: 如何设置管理员？

· 在配置文件的 adminUsers 中添加用户ID，格式：平台:用户ID

#####Q4: 如何查看详细的错误日志？

· 在配置中设置 enableLogging: true，然后在 Koishi 控制台查看日志

###📄 许可证

本项目采用 MIT License 开源协议。

###🙏 致谢

· Koishi - 优秀的机器人框架
· zhukong-currency-system - 提供货币系统基础

---

#💡 温馨提示：使用前请确保已仔细阅读本说明文档。如有问题或建议，欢迎提交 Issue。

⭐ 如果这个插件对你有帮助，欢迎在 GitHub 上给我们一个 Star！