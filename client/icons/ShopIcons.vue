<template>
  <svg class="k-icon shop-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <!-- 背景圆角矩形 -->
    <rect x="0.5" y="0.5" width="23" height="23" rx="5" fill="currentColor" :opacity="backgroundOpacity"/>
    
    <!-- 商城图标主体 - 购物袋形状 -->
    <path d="M7 10L8.7 19.5C8.8 20.3 9.5 21 10.3 21H13.7C14.5 21 15.2 20.3 15.3 19.5L17 10" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"/>
    
    <!-- 购物袋提手 -->
    <path d="M9 10V7C9 5.9 9.9 5 11 5H13C14.1 5 15 5.9 15 7V10" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"/>
    
    <!-- 添加购物袋内部的线条，表示商品 -->
    <line x1="9" y1="14" x2="15" y2="14" 
          stroke="currentColor" 
          stroke-width="1.5" 
          stroke-linecap="round"/>
    
    <line x1="10" y1="17" x2="14" y2="17" 
          stroke="currentColor" 
          stroke-width="1.5" 
          stroke-linecap="round"/>
    
    <!-- 可选：添加货币符号或积分符号 -->
    <g v-if="showCurrency">
      <circle cx="19" cy="8" r="2.5" fill="currentColor" opacity="0.9"/>
      <text x="19" y="9.5" 
            font-family="Arial, sans-serif" 
            font-size="6" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle">$</text>
    </g>
  </svg>
</template>

<script setup lang="ts">
interface Props {
  // 背景透明度，默认为0.12
  backgroundOpacity?: number
  // 是否显示货币符号
  showCurrency?: boolean
}

withDefaults(defineProps<Props>(), {
  backgroundOpacity: 0.12,
  showCurrency: true
})
</script>

<style scoped>
.shop-icon {
  display: inline-block;
  vertical-align: middle;
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
}
</style>