import Vue from 'vue'

// 全局js
require("@/common/index")

// 全局样式
require("@/styles/style.scss")

// icons
import '@/icons'

import App from './App.vue'

// 全局组件

Vue.config.productionTip = false

new Vue({
    render: h => h(App),
}).$mount('#app')