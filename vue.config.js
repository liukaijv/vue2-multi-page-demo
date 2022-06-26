const {defineConfig} = require('@vue/cli-service')
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const resolve = dir => path.join(__dirname, dir);
const CompressionWebpackPlugin = require("compression-webpack-plugin");
const webpack = require('webpack')

const devServerProxy = require("./build/dev-server-proxy")

const BundleAnalyzer = require("webpack-bundle-analyzer")

const externalConfig = require("./build/externals.config")

// 生产环境变量
const IS_PRODUCTION = ["production"].includes(process.env.NODE_ENV);
const DEV_SERVER_PORT = 8080;

// 多页面
const PAGES_OUTPUT_DIR = 'pages' // 多页面输出目录
const PAGES_DIR = 'pages' // 多页面源文件目录
const pages = {}; // 所有页面
const ALLOW_MULTI_PAGES = fs.existsSync(`./src/${PAGES_DIR}`) // 是否支持多页面
// 多页面配置
const multiPageConfig = require("./build/pages.config")

// 全局chunks
const globalChunks = [
    "chunk-vendors",
    "chunk-commons",
    "chunk-components",
    "chunk-vant",
]
// 处理多页面
glob.sync('./src/pages/**/main.js').forEach(entry => {
    let pageName = entry.match(/\.\/src\/pages\/(.*)\/main\.js/)[1] || "";
    // 约定以_开头的是模板，不处理
    if (pageName.startsWith("_")) {
        return true;
    }
    let pageInfo = multiPageConfig[pageName];
    if (!pageInfo) {
        let template = "public/index.html"
        let testFile = `./src/${PAGES_DIR}/${pageName}/index.html`;
        if (fs.existsSync(testFile)) {
            template = testFile;
        }
        pageInfo = {
            template: template,
            filename: path.join(PAGES_OUTPUT_DIR, `${pageName}.html`),
            title: pageName,
            // publicPath: `${pageName}/`,
        }
    }
    pages[pageName] = {
        entry,
        ...pageInfo,
        chunk: [
            ...globalChunks,
            pageName,
        ]
    }
})

// 多页面时把原脚手架的main.js也打进去
pages["index"] = {
    entry: "./src/main.js",
    template: "./public/index.html",
    filename: `index.html`,
    title: "index",
    chunk: [
        ...globalChunks,
        'index',
    ]
}

// 所有页面名称
const pageNames = Object.keys(pages);

// 走单页面还是多页面
let pagesDefine = ALLOW_MULTI_PAGES ? {pages} : {};
module.exports = defineConfig({
    publicPath: "/",
    outputDir: "dist",
    assetsDir: "static",
    transpileDependencies: true,
    lintOnSave: !IS_PRODUCTION, // 每次保存lint验证
    runtimeCompiler: true,
    productionSourceMap: !IS_PRODUCTION, // 开启sourceMap
    css: {
        loaderOptions: {
            postcss: {},
            scss: { // 注入sass的变量
                additionalData: `@import "@styles/variables.scss";`
            },
            less: {
                // 改vant主题
                modifyVars: {
                    hack: `true; @import "@styles/vant-theme.less";`,
                },
                // 注入less的变量
                globalVars: {},
            }
        }
    },
    devServer: {
        open: `http://127.0.0.1:${DEV_SERVER_PORT}`, // 自动打开浏览器
        host: '0.0.0.0',
        port: DEV_SERVER_PORT,
        hot: true, // 开启热更
        historyApiFallback: {
            // 多页面时处理下路由
            rewrites: ALLOW_MULTI_PAGES ? [
                ...pageNames.map(pageName => {
                    return {
                        from: new RegExp(`^/${PAGES_OUTPUT_DIR}/${pageName}.*$`),
                        to: () => {
                            console.log(path.join("/", PAGES_OUTPUT_DIR, `${pageName}.html`))
                            return path.join("/", PAGES_OUTPUT_DIR, `${pageName}.html`);
                        },
                    };
                }),
                {
                    from: /.*/,
                    to: (context) => {
                        console.error(`page: ${context.parsedUrl.pathname} not found`);
                        // todo 404页面
                        return "/pages/404.html";
                    }
                },
            ] : [],
        },
        proxy: devServerProxy,
    },
    chainWebpack: config => {

        // 外部库
        config.externals(externalConfig.externals)

        // 修复HMR
        config.resolve.symlinks(true);

        // svg图标
        config.module
            .rule('svg')
            .exclude.add(resolve('src/icons'))
            .end()
        config.module
            .rule('icons')
            .test(/\.svg$/)
            .include.add(resolve('src/icons'))
            .end()
            .use('svg-sprite-loader')
            .loader('svg-sprite-loader')
            .options({
                symbolId: 'icon-[name]'
            })
            .end()

        // 暴露一些自定义变量
        config.plugin('define')
            .tap(args => {
                let customDefines = {
                    IS_PRODUCTION: IS_PRODUCTION,
                    // todo others
                }
                args[0] = {
                    ...args[0],
                    ...customDefines
                }
                return args;
            })

        // 全局加载的库
        config.plugin('provide')
            .use(new webpack.ProvidePlugin({
                // todo
            }))

        // 直接复制不需求处理的文件
        config.plugin('copy')
            .tap(args => {
                const patterns = [
                    "./static/**"
                ]
                args[0].patterns = [...args[0].patterns, ...patterns]
                return args;
            });

        // 忽略掉指定库的某些不打包的文件
        config.plugin('ignore')
            .use(new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /zh-cn$/))

        // 别名定义
        config.resolve.alias
            .set("@", resolve("src"))
            .set("@assets", resolve("src/assets"))
            .set("@styles", resolve("src/styles"))
            .set("@components", resolve("src/components"))
            .set("@plugins", resolve("src/plugins"))
            .set("@api", resolve("src/api"))
            .set("@pages", resolve("src/pages"))
            .set("@store", resolve("src/store"))
            .set("@static", resolve("static"))

        // 生成环境特殊配置
        config.when(IS_PRODUCTION, config => {

            config.plugin('bundle-analyzer')
                .use(new BundleAnalyzer.BundleAnalyzerPlugin({
                    analyzerMode: "static",
                    openAnalyzer: false,
                }))

            // 开启gizp
            config.plugin('gizp')
                .use(new CompressionWebpackPlugin(
                    {
                        filename: "[path][base].gz[query]",
                        algorithm: "gzip",
                        test: /\.(js|css|json|txt|html|ico|svg)(\?.*)?$/i,
                        threshold: 10240,
                        minRatio: 0.8
                    }
                ))

            config.optimization.splitChunks({
                chunks: 'all',
                cacheGroups: {
                    commons: {
                        name: "chunk-commons",
                        chunks: "initial",
                        minChunks: 2,
                        maxInitialRequests: 5,
                        priority: 1,
                        reuseExistingChunk: true,
                        enforce: true
                    },
                    vendors: {
                        name: "chunk-vendors",
                        test: /[\\/]node_modules[\\/]/,
                        chunks: "initial",
                        priority: 2,
                        reuseExistingChunk: true,
                        enforce: true
                    },
                    components: {
                        name: "chunk-components",
                        test: resolve("src/components"), // can customize your rules
                        minChunks: 3, //  minimum common number
                        priority: 3,
                        reuseExistingChunk: true
                    },
                    vant: {
                        name: "chunk-vant",
                        test: /[\\/]node_modules[\\/]vant[\\/]/,
                        chunks: "all",
                        priority: 4,
                        reuseExistingChunk: true,
                        enforce: true
                    },
                }
            });
        });

        config.when(ALLOW_MULTI_PAGES, config => {
            config.plugins.delete("named-chunks");
        })

        // 页面注入信息
        pageNames.forEach(pageName => {
            config.plugin(`html-${pageName}`).tap(args => {
                // html中添加cdn
                args[0].cdn = externalConfig.cdn;

                // Lazy loading routes Error https://github.com/vuejs/vue-cli/issues/1669
                args[0].chunksSortMode = "none";
                return args;
            });
        })

    },
    ...pagesDefine
})
