module.exports = {
    "/api": {
        target: "https://localhost:8888",// 目标地址
        secure: false, // 接受https的
        changeOrigin: true, // 是否需要跨域
        ws: true, // 允许websocket
        pathRewrite: {
            "^/api": "/", // 自己定义
        }
    }
}