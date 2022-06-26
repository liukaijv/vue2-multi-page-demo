const cdn = {
    css: [],
    js: [
        "//unpkg.com/dayjs/dayjs.min.js",
        "//unpkg.com/lodash/lodash.min.js",
        // "//unpkg.com/vue@2.6.14/dist/vue.min.js",
        // "//unpkg.com/vuex@3.6.2/dist/vuex.min.js",
        // "//unpkg.com/vue-router@3.6.2/dist/vue-router.min.js",
        // "//unpkg.com/axios@0.27.2/dist/axios.min.js",
    ]
}

module.exports = {
    cdn,
    externals: {
        dayjs: "dayjs",
        // axios: "axios",
        // vue: "vue",
        // vuex: "vuex",
        // 'vue-router': "vue-router",
        lodash: {
            commonjs: "lodash",
            amd: "lodash",
            root: "_"
        }
    }
}